import { and, eq, inArray, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import {
  documentChunks,
  documents,
  ingestionRunProgress,
  ingestionRuns,
  tickerIngestionState,
  tickerPrices,
  tickerSentiments,
  tickers,
} from '@/db/schema'
import type { Env, NewsArticle, PriceQuote } from './types'

type Db = ReturnType<typeof drizzle>

function getConnectionUrl(env: Env) {
  const url = env.HYPERDRIVE?.connectionString ?? env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL or HYPERDRIVE binding is required')
  }
  return url
}

export function createDb(env: Env) {
  const url = getConnectionUrl(env)

  const client = postgres(url, {
    max: 1,
    prepare: false,
    ssl: url.includes('sslmode=') ? undefined : 'require',
  })
  const db = drizzle(client)
  return { db, close: () => client.end() }
}

export async function createIngestionRun(
  db: Db,
  type: string,
  metadata?: Record<string, unknown>,
) {
  const [run] = await db
    .insert(ingestionRuns)
    .values({
      runType: type,
      status: 'running',
      startedAt: new Date(),
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    })
    .returning()

  await db.insert(ingestionRunProgress).values({
    runId: run.id,
    status: 'running',
    stage: 'queueing',
    progress: 10,
    message: 'Queueing Cloudflare ingestion jobs.',
    startedAt: run.startedAt,
    updatedAt: run.startedAt,
    metadata: metadata ? JSON.stringify(metadata) : undefined,
  })

  return run
}

export async function completeIngestionRun(
  db: Db,
  runId: string,
  status: 'success' | 'error',
  metadata?: Record<string, unknown>,
  error?: string,
) {
  const completedAt = new Date()

  await db
    .update(ingestionRuns)
    .set({
      status,
      completedAt,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
      error,
    })
    .where(eq(ingestionRuns.id, runId))

  await db
    .update(ingestionRunProgress)
    .set({
      status,
      stage: status === 'success' ? 'queued' : 'error',
      progress: 100,
      message:
        status === 'success'
          ? 'Cloudflare ingestion jobs queued.'
          : error ?? 'Cloudflare ingestion failed.',
      completedAt,
      updatedAt: completedAt,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    })
    .where(eq(ingestionRunProgress.runId, runId))
}

export async function listEnabledTickers(
  db: Db,
  limit = 3,
  symbols?: string[],
) {
  const filters = [eq(tickers.active, true), eq(tickers.enabled, true)]
  if (symbols?.length) {
    filters.push(inArray(tickers.symbol, symbols))
  }

  return db
    .select({ symbol: tickers.symbol })
    .from(tickers)
    .where(and(...filters))
    .orderBy(sql`${tickers.priority} asc, ${tickers.lastSyncedAt} asc nulls first, ${tickers.symbol} asc`)
    .limit(limit)
}

export async function updateStateSuccess(
  db: Db,
  symbol: string,
  source: string,
  cursor?: string | null,
) {
  await db
    .insert(tickerIngestionState)
    .values({
      symbol,
      source,
      cursor,
      lastSuccessAt: new Date(),
      lastError: null,
    })
    .onConflictDoUpdate({
      target: [tickerIngestionState.symbol, tickerIngestionState.source],
      set: {
        cursor,
        lastSuccessAt: new Date(),
        lastError: null,
      },
    })
}

export async function updateStateError(
  db: Db,
  symbol: string,
  source: string,
  error: unknown,
) {
  const message = error instanceof Error ? error.message : String(error)
  await db
    .insert(tickerIngestionState)
    .values({
      symbol,
      source,
      lastError: message,
    })
    .onConflictDoUpdate({
      target: [tickerIngestionState.symbol, tickerIngestionState.source],
      set: { lastError: message },
    })
}

export async function upsertPrice(db: Db, symbol: string, quote: PriceQuote) {
  await db
    .insert(tickerPrices)
    .values({
      symbol,
      provider: quote.provider,
      price: quote.price,
      change: quote.change ?? null,
      percentChange: quote.percentChange ?? null,
      pricedAt: quote.pricedAt,
      ingestedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: tickerPrices.symbol,
      set: {
        provider: quote.provider,
        price: quote.price,
        change: quote.change ?? null,
        percentChange: quote.percentChange ?? null,
        pricedAt: quote.pricedAt,
        ingestedAt: new Date(),
      },
    })

  await db
    .update(tickers)
    .set({ lastPriceIngestedAt: new Date(), lastSyncedAt: new Date() })
    .where(eq(tickers.symbol, symbol))
}

function chunkText(body: string, maxLen = 800) {
  if (body.length <= maxLen) return [body]

  const chunks: string[] = []
  for (let i = 0; i < body.length; i += maxLen) {
    chunks.push(body.slice(i, i + maxLen))
  }
  return chunks
}

export function scoreHeadline(headline: string) {
  const h = headline.toLowerCase()
  const bullish = [
    'beat',
    'beats',
    'bullish',
    'gain',
    'gains',
    'growth',
    'raise',
    'raised',
    'rally',
    'rallies',
    'surge',
    'upside',
  ]
  const bearish = [
    'bearish',
    'cut',
    'decline',
    'downgrade',
    'fall',
    'falls',
    'loss',
    'miss',
    'misses',
    'risk',
    'slump',
    'warning',
  ]

  const pos = bullish.filter((word) => h.includes(word)).length
  const neg = bearish.filter((word) => h.includes(word)).length
  if (pos === neg) return 0
  return pos > neg ? 0.5 : -0.5
}

export async function insertArticles(
  db: Db,
  symbol: string,
  articles: NewsArticle[],
) {
  let inserted = 0
  let skipped = 0

  for (const article of articles) {
    const existing = await db
      .select({ id: documents.id })
      .from(documents)
      .where(eq(documents.url, article.url))
      .limit(1)

    if (existing.length > 0) {
      skipped += 1
      continue
    }

    const [doc] = await db
      .insert(documents)
      .values({
        source: article.source || article.provider,
        title: article.title,
        body: article.body || article.title,
        url: article.url,
        tickers: Array.from(new Set([symbol, ...article.tickers])),
        publishedAt: article.publishedAt,
      })
      .returning()

    const chunks = chunkText(article.body || article.title)
    const sentiment = scoreHeadline(article.title)

    for (let i = 0; i < chunks.length; i += 1) {
      await db.insert(documentChunks).values({
        documentId: doc.id,
        chunkIndex: i,
        text: chunks[i],
        embedding: JSON.stringify(Array(16).fill(0)),
        sentiment,
        topicClusterId: null,
        publishedAt: article.publishedAt,
      })
    }

    inserted += 1
  }

  await db
    .update(tickers)
    .set({ lastNewsIngestedAt: new Date(), lastSyncedAt: new Date() })
    .where(eq(tickers.symbol, symbol))

  return { inserted, skipped }
}

export async function getRecentHeadlines(db: Db, symbol: string, days = 21) {
  return db.execute<{ title: string }>(sql`
    select ${documents.title} as title
    from ${documents}
    where ${documents.publishedAt} > now() - (${days} || ' days')::interval
      and ${documents.tickers} @> ARRAY[${symbol}]::text[]
    order by ${documents.publishedAt} desc
    limit 100
  `)
}

export async function upsertSentiment(
  db: Db,
  symbol: string,
  label: string,
  score: number,
  articleCount: number,
  windowDays: number,
) {
  await db
    .insert(tickerSentiments)
    .values({
      symbol,
      label,
      score,
      articleCount,
      windowDays,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: tickerSentiments.symbol,
      set: {
        label,
        score,
        articleCount,
        windowDays,
        updatedAt: new Date(),
      },
    })

  await db
    .update(tickers)
    .set({ lastSentimentAt: new Date(), lastSyncedAt: new Date() })
    .where(eq(tickers.symbol, symbol))
}
