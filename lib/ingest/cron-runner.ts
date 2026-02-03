import { desc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { ingestionRunProgress, ingestionRuns } from '@/db/schema'
import {
  getTickerBatch,
  ingestFinnhubCompanyNews,
  ingestFinnhubNews,
  markTickersSynced,
} from '@/ingest/finnhub'
import { backfillEmbeddings } from '@/lib/embeddings'
import { getDashboardThemes } from '@/lib/queries/dashboard-themes'

type RunResult = {
  runId: string
  status: 'running' | 'success' | 'error'
  stage: string
  progress: number
  message?: string | null
  startedAt: string
  completedAt?: string | null
}

const MAX_TICKERS_PER_RUN = 200
const COMPANY_NEWS_MAX_PER_TICKER = 20
const COMPANY_NEWS_DELAY_MS = 250
const STALE_RUN_MINUTES = 15
const STALE_RUN_MS = STALE_RUN_MINUTES * 60 * 1000
const STALE_RUN_MESSAGE = `Run timed out after ${STALE_RUN_MINUTES} minutes without updates.`

function isStaleRun(updatedAt?: Date | string | null) {
  if (!updatedAt) return false
  const updated =
    updatedAt instanceof Date ? updatedAt.getTime() : new Date(updatedAt).getTime()
  return Date.now() - updated > STALE_RUN_MS
}

async function updateProgress(
  runId: string,
  updates: Partial<{
    status: string
    stage: string
    progress: number
    message: string | null
    completedAt: Date | null
    metadata: Record<string, unknown>
  }>,
) {
  const metadata =
    updates.metadata !== undefined
      ? JSON.stringify(updates.metadata, (_key, value) =>
          value instanceof Date ? value.toISOString() : value,
        )
      : undefined

  await db
    .update(ingestionRunProgress)
    .set({
      status: updates.status,
      stage: updates.stage,
      progress: updates.progress,
      message: updates.message,
      completedAt: updates.completedAt ?? undefined,
      metadata,
      updatedAt: new Date(),
    })
    .where(eq(ingestionRunProgress.runId, runId))
}

async function markRunTimedOut(runId: string) {
  const completedAt = new Date()

  await db
    .update(ingestionRunProgress)
    .set({
      status: 'error',
      stage: 'timeout',
      progress: 100,
      message: STALE_RUN_MESSAGE,
      completedAt,
      updatedAt: completedAt,
    })
    .where(eq(ingestionRunProgress.runId, runId))

  await db
    .update(ingestionRuns)
    .set({
      status: 'error',
      completedAt,
      error: STALE_RUN_MESSAGE,
    })
    .where(eq(ingestionRuns.id, runId))
}

export async function getLatestRunProgress(runId?: string | null) {
  if (runId) {
    const rows = await db
      .select()
      .from(ingestionRunProgress)
      .where(eq(ingestionRunProgress.runId, runId))
      .limit(1)
    const row = rows[0]
    if (row && row.status === 'running' && isStaleRun(row.updatedAt)) {
      await markRunTimedOut(row.runId)
      return {
        ...row,
        status: 'error',
        stage: 'timeout',
        progress: row.progress ?? 100,
        message: STALE_RUN_MESSAGE,
        completedAt: new Date(),
      }
    }
    return row ?? null
  }

  const rows = await db
    .select()
    .from(ingestionRunProgress)
    .orderBy(desc(ingestionRunProgress.startedAt))
    .limit(1)
  const row = rows[0]
  if (row && row.status === 'running' && isStaleRun(row.updatedAt)) {
    await markRunTimedOut(row.runId)
    return {
      ...row,
      status: 'error',
      stage: 'timeout',
      progress: row.progress ?? 100,
      message: STALE_RUN_MESSAGE,
      completedAt: new Date(),
    }
  }
  return row ?? null
}

export async function startIngestionRun(runType: 'cron' | 'manual' = 'cron') {
  const existing = await db
    .select()
    .from(ingestionRunProgress)
    .where(eq(ingestionRunProgress.status, 'running'))
    .orderBy(desc(ingestionRunProgress.startedAt))
    .limit(1)

  if (existing.length) {
    const current = existing[0]
    if (isStaleRun(current.updatedAt)) {
      await markRunTimedOut(current.runId)
    } else {
      return { runId: current.runId, reused: true }
    }
  }

  const startedAt = new Date()
  const [run] = await db
    .insert(ingestionRuns)
    .values({ runType, status: 'running', startedAt })
    .returning()

  await db.insert(ingestionRunProgress).values({
    runId: run.id,
    status: 'running',
    stage: 'started',
    progress: 5,
    message: 'Starting ingestion pipeline.',
    startedAt,
    updatedAt: startedAt,
  })

  return { runId: run.id, reused: false }
}

export async function runIngestionPipeline(runId: string): Promise<RunResult> {
  const startedAt = new Date()

  try {
    await updateProgress(runId, {
      stage: 'news',
      progress: 15,
      message: 'Fetching global news.',
    })

    const newsResult = await ingestFinnhubNews({
      categories: ['general', 'forex', 'crypto', 'merger'],
      maxPages: 3,
      minId: 0,
    })

    await updateProgress(runId, {
      stage: 'tickers',
      progress: 30,
      message: 'Selecting tickers to sync.',
    })

    // Keep the batch size modest so we can reach embeddings faster.
    const tickerRows = await getTickerBatch(MAX_TICKERS_PER_RUN)
    const tickers = tickerRows.map((row: { symbol: string }) => row.symbol)

    if (tickers.length === 0) {
      await updateProgress(runId, {
        status: 'success',
        stage: 'done',
        progress: 100,
        message: 'No tickers to ingest.',
        completedAt: new Date(),
        metadata: { newsResult, tickers: 0 },
      })

    const metadata = JSON.stringify(
      { newsResult, tickers: 0 },
      (_key, value) => (value instanceof Date ? value.toISOString() : value),
    )

    await db
      .update(ingestionRuns)
      .set({
        status: 'success',
        completedAt: new Date(),
        metadata,
      })
      .where(eq(ingestionRuns.id, runId))

      return {
        runId,
        status: 'success',
        stage: 'done',
        progress: 100,
        message: 'No tickers to ingest.',
        startedAt: startedAt.toISOString(),
        completedAt: new Date().toISOString(),
      }
    }

    await updateProgress(runId, {
      stage: 'company',
      progress: 45,
      message: 'Fetching company news.',
    })

    const companyResult = await ingestFinnhubCompanyNews({
      tickers,
      lookbackDays: 7,
      maxPerTicker: COMPANY_NEWS_MAX_PER_TICKER,
      minDelayMs: COMPANY_NEWS_DELAY_MS,
    })

    await markTickersSynced(tickers, new Date())

    await updateProgress(runId, {
      stage: 'embeddings',
      progress: 75,
      message: 'Generating embeddings.',
    })

    const embeddingResult = await backfillEmbeddings({
      batchSize: 96,
      maxBatches: 4,
      sinceHours: 48,
    })

    await updateProgress(runId, {
      stage: 'themes',
      progress: 90,
      message: 'Building daily themes.',
    })

    const themesResult = await getDashboardThemes({
      windowHours: 24,
      themeCount: 6,
      force: true,
    })

    const completedAt = new Date()

    await updateProgress(runId, {
      status: 'success',
      stage: 'done',
      progress: 100,
      message: 'Sync completed.',
      completedAt,
      metadata: {
        newsResult,
        companyResult,
        tickers: tickers.length,
        embeddingsUpdated: embeddingResult.updated,
        themesGeneratedAt: themesResult.generatedAt,
      },
    })

    const metadata = JSON.stringify(
      {
        newsResult,
        companyResult,
        tickers: tickers.length,
        embeddingsUpdated: embeddingResult.updated,
        themesGeneratedAt: themesResult.generatedAt,
      },
      (_key, value) => (value instanceof Date ? value.toISOString() : value),
    )

    await db
      .update(ingestionRuns)
      .set({
        status: 'success',
        completedAt,
        metadata,
      })
      .where(eq(ingestionRuns.id, runId))

    return {
      runId,
      status: 'success',
      stage: 'done',
      progress: 100,
      message: 'Sync completed.',
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
    }
  } catch (err) {
    const completedAt = new Date()
    const message =
      err instanceof Error ? err.message : 'Cron ingest failed'

    await updateProgress(runId, {
      status: 'error',
      stage: 'error',
      progress: 100,
      message,
      completedAt,
    })

    await db
      .update(ingestionRuns)
      .set({
        status: 'error',
        completedAt,
        error: message,
      })
      .where(eq(ingestionRuns.id, runId))

    throw err
  }
}
