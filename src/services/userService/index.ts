import { createTransaction } from "../../db/queries/transaction";
import { createUser } from "../../db/queries/user";
import { mockTransactions } from "../../db/mockData/transactions";

export async function createUserWithTransactions({
  name,
  age,
  email,
}: {
  name: string;
  age: number;
  email: string;
}) {
  const userId = await createUser({ name, age, email });
  await Promise.all(
    mockTransactions(userId).map((transaction) =>
      createTransaction(transaction),
    ),
  );
  return {
    userId,
    name,
    age,
    email,
  };
}
