import {
  completeIngestionRun,
  createIngestionRun,
  createDb,
  listEnabledTickers,
} from './db'
import { processJob } from './jobs'
import { enqueueTickerJobs } from './queue'
import type { Env, ExecutionContextLike, Job, MessageBatch } from './types'

const DEFAULT_FALLBACK_SYMBOLS = [
  'AAPL',
  'MSFT',
  'NVDA',
  'AMZN',
  'GOOGL',
  'META',
  'TSLA',
  'AMD',
  'JPM',
  'XOM',
  'RKT',
]
const DEFAULT_INGEST_SYMBOLS = ['AAPL', 'TSLA', 'NVDA']
const DEFAULT_INGEST_TICKER_LIMIT = 3

function parseConfiguredSymbols(raw?: string) {
  if (!raw) return DEFAULT_INGEST_SYMBOLS

  const parsed = raw
    .split(',')
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean)

  return parsed.length ? Array.from(new Set(parsed)) : DEFAULT_INGEST_SYMBOLS
}

function parseTickerLimit(raw?: string) {
  if (!raw) return DEFAULT_INGEST_TICKER_LIMIT

  const parsed = Number.parseInt(raw, 10)
  if (Number.isNaN(parsed) || parsed <= 0) return DEFAULT_INGEST_TICKER_LIMIT
  return parsed
}

async function runScheduledIngest(env: Env) {
  const { db, close } = createDb(env)
  const run = await createIngestionRun(db, 'cloudflare-cron')

  try {
    const configuredSymbols = parseConfiguredSymbols(env.INGEST_SYMBOLS)
    const tickerLimit = parseTickerLimit(env.INGEST_TICKER_LIMIT)
    const rows = await listEnabledTickers(db, tickerLimit, configuredSymbols)
    const symbols = rows.length
      ? rows.map((row) => row.symbol)
      : configuredSymbols.length
        ? configuredSymbols
        : DEFAULT_FALLBACK_SYMBOLS
    const jobCount = await enqueueTickerJobs(env, symbols)

    await completeIngestionRun(db, run.id, 'success', {
      symbols: symbols.length,
      jobs: jobCount,
    })

    return { runId: run.id, symbols: symbols.length, jobs: jobCount }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await completeIngestionRun(db, run.id, 'error', undefined, message)
    throw error
  } finally {
    await close()
  }
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url)

    if (url.pathname === '/health') {
      return Response.json({
        ok: true,
        service: 'moneyboy-ingest',
        hasDatabase: Boolean(env.HYPERDRIVE?.connectionString ?? env.DATABASE_URL),
        hasFinnhub: Boolean(env.FINNHUB_API_KEY),
        hasTiingo: Boolean(env.TIINGO_API_TOKEN),
      })
    }

    if (url.pathname === '/enqueue' && request.method === 'POST') {
      const secret = request.headers.get('x-moneyboy-secret')
      if (!env.INGEST_SECRET || secret !== env.INGEST_SECRET) {
        return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
      }

      const body = (await request.json().catch(() => null)) as {
        symbols?: string[]
      } | null
      const symbols = (body?.symbols?.length ? body.symbols : DEFAULT_FALLBACK_SYMBOLS)
        .map((symbol) => symbol.trim().toUpperCase())
        .filter(Boolean)
      const jobs = await enqueueTickerJobs(env, Array.from(new Set(symbols)))
      return Response.json({ ok: true, symbols: symbols.length, jobs })
    }

    return Response.json({ ok: false, error: 'Not found' }, { status: 404 })
  },

  async scheduled(
    _controller: { cron: string },
    env: Env,
    ctx: ExecutionContextLike,
  ) {
    ctx.waitUntil(runScheduledIngest(env))
  },

  async queue(batch: MessageBatch<Job>, env: Env) {
    for (const message of batch.messages) {
      try {
        await processJob(env, message.body)
        message.ack()
      } catch (error) {
        console.error('ticker job failed', message.body, error)
        message.retry({ delaySeconds: 300 })
      }
    }
  },
}
