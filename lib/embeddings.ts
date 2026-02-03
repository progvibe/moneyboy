import { eq, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { documentChunks } from '@/db/schema'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const PLACEHOLDER_EMBEDDING = JSON.stringify(Array(16).fill(0))

type EmbeddingResponse = {
  data: { embedding: number[] }[]
}

type BackfillOptions = {
  batchSize?: number
  maxBatches?: number
  sinceHours?: number
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set')
  }

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

export async function backfillEmbeddings({
  batchSize = 96,
  maxBatches = 4,
  sinceHours = 48,
}: BackfillOptions = {}) {
  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000)
  const sinceIso = since.toISOString()
  let updated = 0

  for (let batch = 0; batch < maxBatches; batch++) {
    const chunks = await db
      .select()
      .from(documentChunks)
      .where(
        sql`${documentChunks.publishedAt} >= ${sinceIso} AND (${documentChunks.embedding} = ${PLACEHOLDER_EMBEDDING} OR ${documentChunks.embedding} IS NULL)`,
      )
      .limit(batchSize)

    if (chunks.length === 0) {
      break
    }

    const texts = chunks.map((chunk) => chunk.text)
    const vectors = await embedBatch(texts)

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const vector = vectors[i]

      await db
        .update(documentChunks)
        .set({ embedding: JSON.stringify(vector) })
        .where(eq(documentChunks.id, chunk.id))
    }

    updated += chunks.length
  }

  return { updated }
}
