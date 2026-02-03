import { relations, sql } from 'drizzle-orm'
import {
  index,
  integer,
  pgTable,
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
    lastSyncedAt: timestamp('lastSyncedAt', { withTimezone: true }),
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
