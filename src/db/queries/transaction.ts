import { eq } from "drizzle-orm";
import { db } from "..";
import {
  InsertTransaction,
  SelectTransaction,
  SelectUser,
  transactionsTable,
} from "../schema";

export async function getTransactionsForUser(id: SelectUser["id"]): Promise<
  Array<{
    id: number;
    userId: number;
    description: string;
    amount: number;
    updatedAt: string;
    createdAt: string;
  }>
> {
  return db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.userId, id));
}

export async function getRecentTransactionsForUser(
  id: SelectUser["id"],
): Promise<
  Array<{
    id: number;
    userId: number;
    description: string;
    amount: number;
    updatedAt: string;
    createdAt: string;
  }>
> {
  return db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.userId, id))
    .orderBy(transactionsTable.createdAt)
    .limit(5);
}

export async function getTransactionById(id: SelectTransaction["id"]): Promise<
  Array<{
    id: number;
    userId: number;
    description: string;
    amount: number;
    updatedAt: string;
    createdAt: string;
  }>
> {
  return db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.id, id));
}

export async function createTransaction(data: InsertTransaction) {
  await db.insert(transactionsTable).values(data);
}

export async function updateTransaction(data: SelectTransaction) {
  await db
    .update(transactionsTable)
    .set(data)
    .where(eq(transactionsTable.id, data.id));
}
export async function deleteTransaction(id: SelectTransaction["id"]) {
  await db.delete(transactionsTable).where(eq(transactionsTable.id, id));
}
