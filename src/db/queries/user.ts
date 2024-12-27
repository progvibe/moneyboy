import { eq, getTableColumns, count, asc, gt, sql } from "drizzle-orm";
import { db } from "../index";
import { InsertUser, SelectUser, usersTable } from "../schema";

export async function createUser(data: InsertUser) {
  const users = await db.insert(usersTable).values(data).returning();
  return users[0].id;
}

export async function getUserById(id: SelectUser["id"]): Promise<
  Array<{
    id: number;
    name: string;
    age: number;
    email: string;
  }>
> {
  return db.select().from(usersTable).where(eq(usersTable.id, id));
}

export async function getUserByEmail(email: SelectUser["email"]): Promise<
  Array<{
    id: number;
    name: string;
    age: number;
    email: string;
  }>
> {
  return db.select().from(usersTable).where(eq(usersTable.email, email));
}

export async function getUsers(): Promise<
  Array<{
    id: number;
    name: string;
    age: number;
    email: string;
  }>
> {
  return db.select().from(usersTable);
}
