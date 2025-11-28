import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { documentChunks, documents } from '@/db/schema'

export async function GET() {
  const [docCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(documents)

  const [chunkCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(documentChunks)

  const [latest] = await db
    .select({ maxPublished: sql<Date | null>`max("publishedAt")` })
    .from(documents)

  return NextResponse.json({
    documents: docCount.count,
    chunks: chunkCount.count,
    lastIngestedAt: latest?.maxPublished ?? null,
  })
}
