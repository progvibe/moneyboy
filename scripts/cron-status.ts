import 'dotenv/config'
import { sql } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  documents,
  ingestionRunProgress,
  ingestionRuns,
  tickers,
} from '@/db/schema'

async function main() {
  const [latestCronRun] = await db.execute(
    sql<{
      id: string | null
      status: string | null
      startedAt: Date | null
      completedAt: Date | null
      error: string | null
    }>`
      select ${ingestionRuns.id} as "id",
             ${ingestionRuns.status} as "status",
             ${ingestionRuns.startedAt} as "startedAt",
             ${ingestionRuns.completedAt} as "completedAt",
             ${ingestionRuns.error} as "error"
      from ${ingestionRuns}
      where ${ingestionRuns.runType} = 'cron'
      order by ${ingestionRuns.startedAt} desc
      limit 1
    `,
  )

  const [lastCronSuccess] = await db.execute(
    sql<{ completedAt: Date | null }>`
      select max(${ingestionRuns.completedAt}) as "completedAt"
      from ${ingestionRuns}
      where ${ingestionRuns.runType} = 'cron'
        and ${ingestionRuns.status} = 'success'
    `,
  )

  const [latestCronProgress] = await db.execute(
    sql<{
      runId: string | null
      status: string | null
      stage: string | null
      progress: number | null
      message: string | null
      startedAt: Date | null
      updatedAt: Date | null
      completedAt: Date | null
    }>`
      select ${ingestionRunProgress.runId} as "runId",
             ${ingestionRunProgress.status} as "status",
             ${ingestionRunProgress.stage} as "stage",
             ${ingestionRunProgress.progress} as "progress",
             ${ingestionRunProgress.message} as "message",
             ${ingestionRunProgress.startedAt} as "startedAt",
             ${ingestionRunProgress.updatedAt} as "updatedAt",
             ${ingestionRunProgress.completedAt} as "completedAt"
      from ${ingestionRunProgress}
      join ${ingestionRuns}
        on ${ingestionRuns.id} = ${ingestionRunProgress.runId}
      where ${ingestionRuns.runType} = 'cron'
      order by ${ingestionRunProgress.startedAt} desc
      limit 1
    `,
  )

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

  console.log('Latest cron run:', latestCronRun ?? null)
  console.log('Last cron success:', lastCronSuccess?.completedAt ?? null)
  console.log('Latest cron progress:', latestCronProgress ?? null)
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
