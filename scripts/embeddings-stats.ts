import 'dotenv/config'
import { sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { documentChunks } from '@/db/schema'

async function main() {
  const placeholder = JSON.stringify(Array(16).fill(0))

  const [{ count: total }] = await db.execute(
    sql<{ count: number }>`select count(*)::int as count from ${documentChunks}`,
  )

  const [{ count: missing }] = await db.execute(
    sql<{ count: number }>`
      select count(*)::int as count
      from ${documentChunks}
      where embedding is null or embedding = ${placeholder}
    `,
  )

  console.log(`Total chunks: ${total}`)
  console.log(`Chunks needing embeddings: ${missing}`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
