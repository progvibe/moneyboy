import {
  createDb,
  getRecentHeadlines,
  insertArticles,
  updateStateError,
  updateStateSuccess,
  upsertPrice,
  upsertSentiment,
} from './db'
import * as finnhub from './sources/finnhub'
import { analyzeHeadlines } from './sources/sentiment'
import * as tiingo from './sources/tiingo'
import type { Env, Job, NewsArticle, PriceQuote } from './types'

async function fetchBestPrice(env: Env, symbol: string): Promise<PriceQuote> {
  if (env.TIINGO_API_TOKEN) {
    return tiingo.fetchPrice(symbol, env.TIINGO_API_TOKEN)
  }
  if (env.FINNHUB_API_KEY) {
    return finnhub.fetchPrice(symbol, env.FINNHUB_API_KEY)
  }
  throw new Error('TIINGO_API_TOKEN or FINNHUB_API_KEY is required for price jobs')
}

async function fetchAllNews(env: Env, symbol: string): Promise<NewsArticle[]> {
  const batches: NewsArticle[][] = []
  const errors: string[] = []

  if (env.FINNHUB_API_KEY) {
    try {
      batches.push(await finnhub.fetchNews(symbol, env.FINNHUB_API_KEY))
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))
    }
  }

  if (env.TIINGO_API_TOKEN) {
    try {
      batches.push(await tiingo.fetchNews(symbol, env.TIINGO_API_TOKEN))
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))
    }
  }

  if (batches.length === 0 && errors.length > 0) {
    throw new Error(errors.join('; '))
  }
  if (batches.length === 0) {
    throw new Error('FINNHUB_API_KEY or TIINGO_API_TOKEN is required for news jobs')
  }

  return batches.flat()
}

export async function processJob(env: Env, job: Job) {
  const { db, close } = createDb(env)
  const symbol = job.symbol.trim().toUpperCase()
  const stateSource = `${job.type}:cloudflare`

  try {
    if (job.type === 'price') {
      const quote = await fetchBestPrice(env, symbol)
      await upsertPrice(db, symbol, quote)
      await updateStateSuccess(db, symbol, stateSource, quote.pricedAt.toISOString())
      return { symbol, type: job.type, provider: quote.provider }
    }

    if (job.type === 'news') {
      const articles = await fetchAllNews(env, symbol)
      const counts = await insertArticles(db, symbol, articles)
      await updateStateSuccess(db, symbol, stateSource)
      return { symbol, type: job.type, ...counts }
    }

    const headlines = await getRecentHeadlines(db, symbol, 21)
    const result = analyzeHeadlines(headlines.map((row) => row.title))
    await upsertSentiment(
      db,
      symbol,
      result.label,
      result.score,
      result.articleCount,
      21,
    )
    await updateStateSuccess(db, symbol, stateSource)
    return { symbol, type: job.type, ...result }
  } catch (error) {
    await updateStateError(db, symbol, stateSource, error)
    throw error
  } finally {
    await close()
  }
}
