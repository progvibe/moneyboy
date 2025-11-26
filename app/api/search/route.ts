import { NextResponse } from 'next/server'
import { and, gte, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { documents } from '@/db/schema'

const DAY_MS = 86_400_000

export async function POST(req: Request) {
  const body = await req.json()
  const { query = '', tickers = [], dateRange = '30d' } = body ?? {}

  const from =
    dateRange === '7d'
      ? new Date(Date.now() - 7 * DAY_MS)
      : dateRange === '90d'
        ? new Date(Date.now() - 90 * DAY_MS)
        : new Date(Date.now() - 30 * DAY_MS)

  const tickerArray =
    tickers?.length
      ? sql`ARRAY[${sql.join(
          tickers.map((t: string) => sql`${t}`),
          sql`, `,
        )}]::text[]`
      : null

  const rows = await db
    .select()
    .from(documents)
    .where(
      and(
        gte(documents.publishedAt, from),
        tickers?.length
          ? sql`${documents.tickers} && ${tickerArray}`
          : sql`true`,
      ),
    )
    .limit(20)

  return NextResponse.json({
    summary: `Mock summary for query: "${query}".`,
    results: rows.map((doc) => ({
      id: doc.id,
      title: doc.title,
      url: doc.url,
      source: doc.source,
      tickers: doc.tickers,
      publishedAt: doc.publishedAt,
      sentiment: 'neutral',
      snippet: `${doc.body.substring(0, 200)}...`,
    })),
  })
}
