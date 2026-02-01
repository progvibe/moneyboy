import 'dotenv/config'
import { eq, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { documentChunks } from '@/db/schema'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set')
}

type EmbeddingResponse = {
  data: { embedding: number[] }[]
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: texts,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error('OpenAI error:', res.status, body)
    throw new Error('Failed to get embeddings')
  }

  const json = (await res.json()) as EmbeddingResponse
  return json.data.map((d) => d.embedding)
}

async function main() {
  console.log('Backfilling embeddings...')

  const placeholder = JSON.stringify(Array(16).fill(0))
  const batchSize = 128
  let totalUpdated = 0

  while (true) {
    const [{ total }] = await db.execute(
      sql<{ total: number }>`select count(*)::int as total from ${documentChunks}`,
    )

    const [{ remaining }] = await db.execute(
      sql<{ remaining: number }>`
        select count(*)::int as remaining
        from ${documentChunks}
        where embedding = ${placeholder} OR embedding IS NULL
      `,
    )

    console.log(
      `Chunks needing embeddings: ${remaining} of ${total} total chunks.`,
    )

    if (remaining === 0) {
      break
    }

    const chunks = await db
      .select()
      .from(documentChunks)
      .where(sql`embedding = ${placeholder} OR embedding IS NULL`)
      .limit(batchSize)

    if (chunks.length === 0) {
      break
    }

    console.log(`Processing ${chunks.length} chunks this batch.`)

    const texts = chunks.map((c) => c.text)
    const vectors = await embedBatch(texts)

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const vector = vectors[i]

      await db
        .update(documentChunks)
        .set({ embedding: JSON.stringify(vector) })
        .where(eq(documentChunks.id, chunk.id))
    }

    totalUpdated += chunks.length
    console.log('Updated embeddings for', chunks.length, 'chunks.')
  }

  console.log('Backfill complete. Updated', totalUpdated, 'chunks.')
}

main()
  .then(() => {
    console.log('Done.')
    process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
