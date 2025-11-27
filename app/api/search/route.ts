import { NextResponse } from 'next/server'
import { and, desc, gte, ilike, or, sql } from 'drizzle-orm'
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

  const term = query?.toString().trim()
  const hasQuery = !!term && term.length > 1

  const rows = await db
    .select({
      id: documents.id,
      title: documents.title,
      url: documents.url,
      source: documents.source,
      tickers: documents.tickers,
      publishedAt: documents.publishedAt,
      snippet: sql<string>`left(${documents.body}, 240)`,
    })
    .from(documents)
    .where(
      and(
        gte(documents.publishedAt, from),
        tickers?.length
          ? sql`${documents.tickers} && ${tickerArray}`
          : sql`true`,
        hasQuery
          ? or(
              ilike(documents.title, `%${term}%`),
              ilike(documents.body, `%${term}%`),
              ilike(sql`array_to_string(${documents.tickers}, ',')`, `%${term}%`),
            )
          : sql`true`,
      ),
    )
    .orderBy(desc(documents.publishedAt))
    .limit(20)

  return NextResponse.json({
    summary: term
      ? `Top matches for "${term}" (recency first).`
      : `Latest ${rows.length} documents (recency first).`,
    results: rows.map((doc) => ({
      ...doc,
      sentiment: 'neutral',
    })),
  })
}
