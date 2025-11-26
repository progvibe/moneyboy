import { relations, sql } from 'drizzle-orm'
import {
  index,
  integer,
  pgTable,
  real,
  text,
  timestamp,
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
