export const mockTransactions = (userId: number) => {
  return [
    {
      userId,
      description: "rent",
      amount: 100,
      updatedAt: "2023-01-01T00:00:00.000Z",
      createdAt: "2023-01-01T00:00:00.000Z",
    },
    {
      userId,
      description: "groceries",
      amount: 50,
      updatedAt: "2023-01-01T00:00:00.000Z",
      createdAt: "2023-01-01T00:00:00.000Z",
    },
    {
      userId,
      description: "utilities",
      amount: 200,
      updatedAt: "2023-01-01T00:00:00.000Z",
      createdAt: "2023-01-01T00:00:00.000Z",
    },
    {
      userId,
      description: "Doordash",
      amount: 100,
      updatedAt: "2023-01-01T00:00:00.000Z",
      createdAt: "2023-01-01T00:00:00.000Z",
    },
  ];
};
