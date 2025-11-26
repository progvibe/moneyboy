import { NextResponse } from 'next/server'
import { db } from '@/db/client'
import { documents } from '@/db/schema'

export async function GET() {
  const results = await db.select().from(documents).limit(5)
  return NextResponse.json({ ok: true, documents: results })
}
