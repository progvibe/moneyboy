import 'dotenv/config'
import { sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { documents, ingestionRuns, tickers } from '@/db/schema'

async function main() {
  const [lastTickerSync] = await db.execute(
    sql<{ lastSyncedAt: Date | null }>`
      select max(${tickers.lastSyncedAt}) as "lastSyncedAt" from ${tickers}
    `,
  )

  const [lastDocIngest] = await db.execute(
    sql<{ lastIngestedAt: Date | null }>`
      select max(${documents.ingestedAt}) as "lastIngestedAt" from ${documents}
    `,
  )

  const [lastRun] = await db.execute(
    sql<{ id: string | null; status: string | null; startedAt: Date | null }>`
      select ${ingestionRuns.id} as "id",
             ${ingestionRuns.status} as "status",
             ${ingestionRuns.startedAt} as "startedAt"
      from ${ingestionRuns}
      order by ${ingestionRuns.startedAt} desc
      limit 1
    `,
  )

  console.log('Last ticker sync:', lastTickerSync?.lastSyncedAt ?? null)
  console.log('Last document ingest:', lastDocIngest?.lastIngestedAt ?? null)
  console.log('Last ingestion run:', lastRun ?? null)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
