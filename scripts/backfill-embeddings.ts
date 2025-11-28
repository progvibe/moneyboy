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

  const chunks = await db
    .select()
    .from(documentChunks)
    .where(
      sql`embedding = ${JSON.stringify(Array(16).fill(0))} OR embedding IS NULL`,
    )
    .limit(128)

  if (chunks.length === 0) {
    console.log('No chunks needing embeddings.')
    return
  }

  console.log(`Found ${chunks.length} chunks to embed.`)

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

  console.log('Updated embeddings for', chunks.length, 'chunks.')
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
