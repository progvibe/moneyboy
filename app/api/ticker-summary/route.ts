import { NextResponse } from 'next/server'
import { and, gte, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { documentChunks, documents } from '@/db/schema'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const DAY_MS = 86_400_000

async function generateSummary(ticker: string, snippets: string[]) {
  if (!OPENAI_API_KEY) {
    return 'Summary unavailable: missing OPENAI_API_KEY.'
  }

  const prompt = `
You are a financial research assistant. Summarize the recent news flow for ticker ${ticker} over roughly the last 7 days.

Use the context below. Focus on:
- overall sentiment (bullish/bearish/mixed),
- key themes and catalysts,
- any major risks or controversies.

Be concise (3-6 bullet points), and don't invent facts not supported by the context.

Context:
${snippets.join('\n\n---\n\n')}
`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    }),
  })

  if (!res.ok) {
    console.error('LLM error:', await res.text())
    return 'Summary unavailable due to an AI error.'
  }

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  return json.choices?.[0]?.message?.content ?? 'Summary unavailable due to an AI error.'
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const tickerParam = searchParams.get('ticker')
  const ticker = tickerParam?.trim().toUpperCase()

  if (!ticker) {
    return NextResponse.json({ error: 'ticker is required' }, { status: 400 })
  }

  const from = new Date(Date.now() - 7 * DAY_MS)

  const chunks = await db
    .select({
      id: documentChunks.id,
      text: documentChunks.text,
      publishedAt: documentChunks.publishedAt,
      documentId: documentChunks.documentId,
    })
    .from(documentChunks)
    .where(
      and(
        gte(documentChunks.publishedAt, from),
        sql`${documentChunks.documentId} IN (
          SELECT ${documents.id} FROM ${documents}
          WHERE ${documents.tickers} && ARRAY[${ticker}]
        )`,
      ),
    )
    .limit(30)

  if (!chunks.length) {
    return NextResponse.json({
      ticker,
      summary: `No recent articles found for ${ticker} in the last 7 days.`,
      snippets: [],
    })
  }

  const snippets = chunks
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() -
        new Date(a.publishedAt).getTime(),
    )
    .slice(0, 10)
    .map((chunk) =>
      chunk.text.length > 300 ? `${chunk.text.slice(0, 300)}...` : chunk.text,
    )

  const summary = await generateSummary(ticker, snippets)

  return NextResponse.json({
    ticker,
    summary,
    snippets,
  })
}
