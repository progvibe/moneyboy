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

async function summarizeResults({
  query,
  contexts,
}: {
  query: string
  contexts: { title: string; snippet: string; sentiment: string; score: number }[]
}): Promise<string> {
  if (!OPENAI_API_KEY || contexts.length === 0) {
    return `Found ${contexts.length} relevant articles for "${query}".`
  }

  const contextText = contexts
    .map(
      (c, idx) =>
        `[${idx + 1}] (${c.sentiment}, score ${c.score.toFixed(2)}) ${c.title}\n${c.snippet}`,
    )
    .join('\n\n')

  const prompt = `
You are a financial research assistant. Based on the context, summarize key themes, sentiment, risks, and catalysts for the user's query.
- Be concise (3-5 bullets). Hedge when uncertain. Mention tickers if relevant.
- Do not invent facts beyond the provided snippets.

User query: ${query}

Context:
${contextText}
`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a concise financial research assistant.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 180,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error('OpenAI summary error:', res.status, body)
    return `Found ${contexts.length} relevant articles for "${query}".`
  }

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  const content = json.choices?.[0]?.message?.content?.trim()
  return content || `Found ${contexts.length} relevant articles for "${query}".`
}

export async function POST(req: Request) {
  console.time('search')
  try {
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
      .filter(Boolean) as {
      id: string
      title: string
      url: string
      source: string
      tickers: string[]
      publishedAt: Date
      sentiment: string
      snippet: string
      score: number
    }[]

    const summary = await summarizeResults({
      query,
      contexts: results.slice(0, 8),
    })

    return NextResponse.json({ summary, results })
  } catch (err) {
    console.error('Search error:', err)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  } finally {
    console.timeEnd('search')
  }
}
