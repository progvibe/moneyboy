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
  await db
    .update(ingestionRunProgress)
    .set({
      status: updates.status,
      stage: updates.stage,
      progress: updates.progress,
      message: updates.message,
      completedAt: updates.completedAt ?? undefined,
      metadata: updates.metadata ? JSON.stringify(updates.metadata) : undefined,
      updatedAt: new Date(),
    })
    .where(eq(ingestionRunProgress.runId, runId))
}

export async function getLatestRunProgress(runId?: string | null) {
  if (runId) {
    const rows = await db
      .select()
      .from(ingestionRunProgress)
      .where(eq(ingestionRunProgress.runId, runId))
      .limit(1)
    return rows[0] ?? null
  }

  const rows = await db
    .select()
    .from(ingestionRunProgress)
    .orderBy(desc(ingestionRunProgress.startedAt))
    .limit(1)
  return rows[0] ?? null
}

export async function startIngestionRun(runType: 'cron' | 'manual' = 'cron') {
  const existing = await db
    .select()
    .from(ingestionRunProgress)
    .where(eq(ingestionRunProgress.status, 'running'))
    .orderBy(desc(ingestionRunProgress.startedAt))
    .limit(1)

  if (existing.length) {
    return { runId: existing[0].runId, reused: true }
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

    const tickerRows = await getTickerBatch(500)
    const tickers = tickerRows.map((row) => row.symbol)

    if (tickers.length === 0) {
      await updateProgress(runId, {
        status: 'success',
        stage: 'done',
        progress: 100,
        message: 'No tickers to ingest.',
        completedAt: new Date(),
        metadata: { newsResult, tickers: 0 },
      })

      await db
        .update(ingestionRuns)
        .set({
          status: 'success',
          completedAt: new Date(),
          metadata: JSON.stringify({ newsResult, tickers: 0 }),
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
      maxPerTicker: 30,
      minDelayMs: 1000,
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

    await db
      .update(ingestionRuns)
      .set({
        status: 'success',
        completedAt,
        metadata: JSON.stringify({
          newsResult,
          companyResult,
          tickers: tickers.length,
          embeddingsUpdated: embeddingResult.updated,
          themesGeneratedAt: themesResult.generatedAt,
        }),
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
