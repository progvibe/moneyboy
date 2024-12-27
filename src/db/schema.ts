import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const usersTable = sqliteTable(
  "users",
  {
    id: integer("id").primaryKey(),
    name: text("name").notNull(),
    age: integer("age").notNull(),
    email: text("email").unique().notNull(),
  },
  () => [],
);

export const transactionsTable = sqliteTable(
  "transactions",
  {
    id: integer("id").primaryKey(),
    userId: integer("userId").notNull(),
    description: text("description").notNull(),
    amount: integer("amount").notNull(),
    updatedAt: text("updatedAt").notNull(),
    createdAt: text("createdAt").notNull(),
  },
  () => [],
);

export type InsertUser = typeof usersTable.$inferInsert;
export type SelectUser = typeof usersTable.$inferSelect;
export type InsertTransaction = typeof transactionsTable.$inferInsert;
export type SelectTransaction = typeof transactionsTable.$inferSelect;
