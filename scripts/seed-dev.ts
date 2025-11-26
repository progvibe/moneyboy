import 'dotenv/config'
import { db } from '@/db/client'
import { documentChunks, documents } from '@/db/schema'

async function main() {
  const now = new Date()

  const seedItems = [
    {
      source: 'seed',
      title: 'Nvidia rallies as AI chip demand accelerates',
      body:
        'Nvidia shares climbed today after the company reported stronger-than-expected demand ' +
        'for its data center GPUs...',
      url: 'https://example.com/nvda',
      tickers: ['NVDA'],
      publishedAt: new Date(now.getTime() - 3600 * 1000 * 5),
    },
    {
      source: 'seed',
      title: 'Federal Reserve signals higher-for-longer rates',
      body:
        'The Federal Reserve indicated that interest rates may remain elevated for an extended period...',
      url: 'https://example.com/fed',
      tickers: ['^IRX'],
      publishedAt: new Date(now.getTime() - 3600 * 1000 * 12),
    },
  ]

  for (const doc of seedItems) {
    const [row] = await db.insert(documents).values(doc).returning()

    await db.insert(documentChunks).values({
      documentId: row.id,
      chunkIndex: 0,
      text: doc.body.slice(0, 300),
      embedding: JSON.stringify([0, 0, 0, 0]),
      sentiment: 0,
      publishedAt: doc.publishedAt,
    })

    console.log('Seeded:', doc.title)
  }

  console.log('Done.')
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
