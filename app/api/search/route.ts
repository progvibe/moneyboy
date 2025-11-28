import { NextResponse } from 'next/server'
import { and, desc, gte, ilike, inArray, or, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { documentChunks, documents } from '@/db/schema'

const DAY_MS = 86_400_000
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

type EmbeddingResponse = {
  data: { embedding: number[] }[]
}

async function embedQuery(query: string): Promise<number[]> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not set')
  }

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: query,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error('OpenAI error:', res.status, body)
    throw new Error('Failed to get query embedding')
  }

  const json = (await res.json()) as EmbeddingResponse
  return json.data[0].embedding
}

function cosineSim(a: number[], b: number[]): number {
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    const av = a[i]
    const bv = b[i]
    dot += av * bv
    na += av * av
    nb += bv * bv
  }
  if (!na || !nb) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

function buildTickerArray(tickers: string[]) {
  return sql`ARRAY[${sql.join(
    tickers.map((t) => sql`${t}`),
    sql`, `,
  )}]::text[]`
}

export async function POST(req: Request) {
  const body = await req.json()
  const { query, tickers = [], dateRange = '30d' } = body ?? {}

  if (!query || typeof query !== 'string') {
    return NextResponse.json({ error: 'query is required' }, { status: 400 })
  }

  const from =
    dateRange === '7d'
      ? new Date(Date.now() - 7 * DAY_MS)
      : dateRange === '90d'
        ? new Date(Date.now() - 90 * DAY_MS)
        : new Date(Date.now() - 30 * DAY_MS)

  const tickerArray = tickers?.length
    ? buildTickerArray(
        tickers.map((t: string) => t.trim()).filter(Boolean).map((t) => t.toUpperCase()),
      )
    : null

  const queryEmbedding = await embedQuery(query)

  const chunks = await db
    .select({
      id: documentChunks.id,
      text: documentChunks.text,
      embedding: documentChunks.embedding,
      sentiment: documentChunks.sentiment,
      publishedAt: documentChunks.publishedAt,
      documentId: documentChunks.documentId,
    })
    .from(documentChunks)
    .where(
      and(
        gte(documentChunks.publishedAt, from),
        tickers?.length
          ? sql`${documentChunks.documentId} IN (
              SELECT ${documents.id} FROM ${documents}
              WHERE ${documents.tickers} && ${tickerArray}
            )`
          : sql`true`,
      ),
    )
    .orderBy(desc(documentChunks.publishedAt))
    .limit(200)

  const scored = chunks
    .map((c) => {
      let emb: number[] | null = null
      try {
        emb = JSON.parse(c.embedding) as number[]
      } catch {
        emb = null
      }
      return {
        ...c,
        score: emb ? cosineSim(queryEmbedding, emb) : -1,
      }
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 30)

  const docIds = Array.from(new Set(scored.map((c) => c.documentId)))

  if (docIds.length === 0) {
    return NextResponse.json({
      summary: `No results for "${query}" over the last ${dateRange}.`,
      results: [],
    })
  }

  const docs = await db
    .select()
    .from(documents)
    .where(inArray(documents.id, docIds))

  const docMap = new Map(docs.map((d) => [d.id, d]))

  const results = scored
    .map((c) => {
      const doc = docMap.get(c.documentId)
      if (!doc) return null

      const sentiment =
        c.sentiment != null
          ? c.sentiment > 0.1
            ? 'positive'
            : c.sentiment < -0.1
              ? 'negative'
              : 'neutral'
          : 'neutral'

      return {
        id: doc.id,
        title: doc.title,
        url: doc.url,
        source: doc.source,
        tickers: doc.tickers,
        publishedAt: doc.publishedAt,
        sentiment,
        snippet: c.text.slice(0, 200) + (c.text.length > 200 ? '…' : ''),
        score: c.score,
      }
    })
    .filter(Boolean)

  const summary = `Found ${results.length} relevant articles for "${query}" over the last ${dateRange}.`

  return NextResponse.json({ summary, results })
}
