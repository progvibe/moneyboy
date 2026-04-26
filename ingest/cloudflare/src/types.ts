export type Job =
  | { type: 'price'; symbol: string }
  | { type: 'news'; symbol: string }
  | { type: 'sentiment'; symbol: string }

export type Env = {
  DATABASE_URL?: string
  FINNHUB_API_KEY?: string
  TIINGO_API_TOKEN?: string
  OPENAI_API_KEY?: string
  INGEST_SECRET?: string
  HYPERDRIVE?: { connectionString: string }
  TICKER_JOBS: QueueProducer<Job>
}

export type QueueProducer<T> = {
  send(message: T): Promise<void>
  sendBatch(messages: { body: T }[]): Promise<void>
}

export type QueueMessage<T> = {
  body: T
  ack(): void
  retry(options?: { delaySeconds?: number }): void
}

export type MessageBatch<T> = {
  messages: QueueMessage<T>[]
}

export type ExecutionContextLike = {
  waitUntil(promise: Promise<unknown>): void
}

export type PriceQuote = {
  provider: string
  price: number
  change?: number | null
  percentChange?: number | null
  pricedAt: Date
}

export type NewsArticle = {
  provider: string
  source: string
  title: string
  body: string
  url: string
  tickers: string[]
  publishedAt: Date
}
