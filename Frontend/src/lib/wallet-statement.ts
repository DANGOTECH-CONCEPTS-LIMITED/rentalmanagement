export interface StatementEntryBase {
  amount: number;
  transactionDate: string;
}

export type StatementRow<TEntry extends StatementEntryBase> = TEntry & {
  runningBalance: number | null;
};

const getTransactionTimestamp = (transactionDate: string) => {
  const parsedTimestamp = new Date(transactionDate).getTime();
  return Number.isFinite(parsedTimestamp) ? parsedTimestamp : 0;
};

export const buildRunningBalanceStatement = <TEntry extends StatementEntryBase>(
  entries: TEntry[],
  currentBalance: number | null | undefined
): StatementRow<TEntry>[] => {
  const sortedEntries = [...entries].sort((left, right) => {
    const timestampDifference =
      getTransactionTimestamp(right.transactionDate) -
      getTransactionTimestamp(left.transactionDate);

    return timestampDifference;
  });

  let balanceAfterTransaction =
    typeof currentBalance === "number" && Number.isFinite(currentBalance)
      ? currentBalance
      : null;

  return sortedEntries.map((entry) => {
    const row = {
      ...entry,
      runningBalance: balanceAfterTransaction,
    };

    if (balanceAfterTransaction !== null) {
      balanceAfterTransaction -= entry.amount;
    }

    return row;
  });
};