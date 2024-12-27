import { Hono } from "hono";
import { createUser, getUsers } from "./db/queries/user";
import { getTransactionsForUser } from "./db/queries/transaction";
import * as userService from "./services/userService";

const app = new Hono();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

// post /users to create a new user in the database
app.post("/users", async (c) => {
  const body = await c.req.json();
  const { name, age, email } = body;
  const user = await userService.createUserWithTransactions({
    name,
    age,
    email,
  });
  return c.json(user);
});

// get /users to get all users from the database
app.get("/users", async (c) => {
  const users = await getUsers();
  return c.json(users);
});

// get /users/:id to get a specific user from the database
app.get("/users/:id", (c) => {
  const { id } = c.req.param();
  return c.json({ id });
});

app.get("/transactions/:userId", async (c) => {
  const { userId } = c.req.param();
  const transactions = await getTransactionsForUser(
    userId as unknown as number,
  );
  return c.json(transactions);
});

export default app;
