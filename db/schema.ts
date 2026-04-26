import { relations, sql } from 'drizzle-orm'
import {
  index,
  integer,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  boolean,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  source: text('source').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  url: text('url').notNull(),
  tickers: text('tickers')
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
  publishedAt: timestamp('publishedAt', { withTimezone: true }).notNull(),
  ingestedAt: timestamp('ingestedAt', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const tickers = pgTable(
  'tickers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    symbol: text('symbol').notNull(),
    exchange: text('exchange').notNull(),
    name: text('name'),
    active: boolean('active').notNull().default(true),
    enabled: boolean('enabled').notNull().default(true),
    priority: integer('priority').notNull().default(0),
    lastSyncedAt: timestamp('lastSyncedAt', { withTimezone: true }),
    lastPriceIngestedAt: timestamp('last_price_ingested_at', {
      withTimezone: true,
    }),
    lastNewsIngestedAt: timestamp('last_news_ingested_at', {
      withTimezone: true,
    }),
    lastSentimentAt: timestamp('last_sentiment_at', { withTimezone: true }),
    createdAt: timestamp('createdAt', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    symbolExchangeIdx: uniqueIndex('tickers_symbol_exchange_idx').on(
      table.symbol,
      table.exchange,
    ),
    lastSyncedIdx: index('tickers_last_synced_idx').on(
      table.lastSyncedAt,
    ),
    priorityIdx: index('tickers_priority_idx').on(table.priority),
  }),
)

export const importantTickers = pgTable(
  'important_tickers',
  {
    symbol: text('symbol').primaryKey(),
    rank: integer('rank').notNull().default(100),
    createdAt: timestamp('createdAt', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    rankIdx: index('important_tickers_rank_idx').on(table.rank),
  }),
)

export const ingestionRuns = pgTable(
  'ingestion_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runType: text('runType').notNull(),
    status: text('status').notNull(),
    startedAt: timestamp('startedAt', { withTimezone: true }).notNull(),
    completedAt: timestamp('completedAt', { withTimezone: true }),
    error: text('error'),
    metadata: text('metadata'),
  },
  (table) => ({
    startedAtIdx: index('ingestion_runs_started_at_idx').on(table.startedAt),
  }),
)

export const ingestionRunProgress = pgTable(
  'ingestion_run_progress',
  {
    runId: uuid('runId')
      .primaryKey()
      .references(() => ingestionRuns.id, { onDelete: 'cascade' }),
    status: text('status').notNull(),
    stage: text('stage').notNull(),
    progress: integer('progress').notNull().default(0),
    message: text('message'),
    startedAt: timestamp('startedAt', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updatedAt', { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp('completedAt', { withTimezone: true }),
    metadata: text('metadata'),
  },
  (table) => ({
    statusIdx: index('ingestion_run_progress_status_idx').on(table.status),
  }),
)

export const tickerIngestionState = pgTable(
  'ticker_ingestion_state',
  {
    symbol: text('symbol').notNull(),
    source: text('source').notNull(),
    cursor: text('cursor'),
    lastSuccessAt: timestamp('last_success_at', { withTimezone: true }),
    lastError: text('last_error'),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.symbol, table.source] }),
  }),
)

export const tickerPrices = pgTable(
  'ticker_prices',
  {
    symbol: text('symbol').primaryKey(),
    provider: text('provider').notNull(),
    price: real('price').notNull(),
    change: real('change'),
    percentChange: real('percent_change'),
    pricedAt: timestamp('priced_at', { withTimezone: true }).notNull(),
    ingestedAt: timestamp('ingested_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pricedAtIdx: index('ticker_prices_priced_at_idx').on(table.pricedAt),
  }),
)

export const tickerSentiments = pgTable(
  'ticker_sentiments',
  {
    symbol: text('symbol').primaryKey(),
    label: text('label').notNull(),
    score: real('score').notNull(),
    articleCount: integer('article_count').notNull().default(0),
    windowDays: integer('window_days').notNull().default(21),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    labelIdx: index('ticker_sentiments_label_idx').on(table.label),
  }),
)

export const documentChunks = pgTable(
  'document_chunks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('documentId')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    chunkIndex: integer('chunkIndex').notNull(),
    text: text('text').notNull(),
    embedding: text('embedding').notNull(),
    sentiment: real('sentiment'),
    topicClusterId: uuid('topicClusterId'),
    publishedAt: timestamp('publishedAt', { withTimezone: true }).notNull(),
  },
  (table) => ({
    documentIdx: index('document_chunks_document_idx').on(table.documentId),
    chunkOrderIdx: index('document_chunks_order_idx').on(
      table.documentId,
      table.chunkIndex,
    ),
  }),
)

export const dashboardThemeCache = pgTable(
  'dashboard_theme_cache',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cacheDate: timestamp('cacheDate', { withTimezone: true }).notNull(),
    windowHours: integer('windowHours').notNull(),
    themeCount: integer('themeCount').notNull(),
    payload: text('payload').notNull(),
    generatedAt: timestamp('generatedAt', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    cacheKeyIdx: uniqueIndex('dashboard_theme_cache_key_idx').on(
      table.cacheDate,
      table.windowHours,
      table.themeCount,
    ),
  }),
)

export const documentsRelations = relations(documents, ({ many }) => ({
  chunks: many(documentChunks),
}))

export const documentChunksRelations = relations(
  documentChunks,
  ({ one }) => ({
    document: one(documents, {
      fields: [documentChunks.documentId],
      references: [documents.id],
    }),
  }),
)
