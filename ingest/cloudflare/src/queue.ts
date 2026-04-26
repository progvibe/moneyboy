import type { Env, Job } from './types'

const JOB_TYPES: Job['type'][] = ['price', 'news', 'sentiment']

export async function enqueueTickerJobs(env: Env, symbols: string[]) {
  const jobs = symbols.flatMap((symbol) =>
    JOB_TYPES.map((type) => ({ body: { type, symbol } satisfies Job })),
  )

  for (let i = 0; i < jobs.length; i += 100) {
    await env.TICKER_JOBS.sendBatch(jobs.slice(i, i + 100))
  }

  return jobs.length
}
