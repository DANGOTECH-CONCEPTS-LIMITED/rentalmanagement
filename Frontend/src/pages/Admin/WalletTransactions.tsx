import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTablePagination } from "@/components/common/DataTablePagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface WalletTransactionItem {
  id: number;
  walletId: number;
  owner: string;
  amount: number;
  description: string;
  transactionId: string;
  status: string;
  vendorTranId?: string | null;
  transactionDate: string;
}

interface WalletTransactionsPage {
  items: WalletTransactionItem[];
  page: number;
  pageSize: number;
  hasMore: boolean;
  totalCount: number;
}

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleString() : "-";

const money = (value: number) =>
  value.toLocaleString("en-UG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const WalletTransactions = () => {
  const endpoint = "/api/AdminWalletTransactions";

  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [result, setResult] = useState<WalletTransactionsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");

    api
      .get<WalletTransactionsPage>(endpoint, {
        params: {
          ...(search.trim() ? { search: search.trim() } : {}),
          ...(from ? { from } : {}),
          ...(to ? { to } : {}),
          page,
          pageSize,
        },
        signal: controller.signal,
      })
      .then(({ data }) => {
        if (!controller.signal.aborted) setResult(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("Unable to load wallet transactions.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [endpoint, search, from, to, page, pageSize]);

  // Older API builds don't return totalCount; fall back to a hasMore-based estimate.
  const totalCount =
    result && typeof result.totalCount === "number"
      ? result.totalCount
      : result
        ? result.page * result.pageSize + (result.hasMore ? 1 : 0)
        : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Wallet Transactions</h1>
        <p className="text-muted-foreground">
          View every wallet credit and debit across all landlords and utility owners.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="wallet-transaction-search">
            Search by owner, description, transaction ID, or status
          </Label>
          <Input
            id="wallet-transaction-search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="e.g. Water Payment or landlord name"
            className="w-80"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="wallet-transaction-from">From</Label>
          <Input
            id="wallet-transaction-from"
            type="date"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value);
              setPage(1);
            }}
            className="w-40"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="wallet-transaction-to">To</Label>
          <Input
            id="wallet-transaction-to"
            type="date"
            value={to}
            onChange={(event) => {
              setTo(event.target.value);
              setPage(1);
            }}
            className="w-40"
          />
        </div>
      </div>

      {loading && <p className="text-muted-foreground">Loading wallet transactions...</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {result && !loading && (
        <>
          {result.items.length === 0 ? (
            <p className="text-muted-foreground">No wallet transactions found.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Vendor Ref</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{formatDate(item.transactionDate)}</TableCell>
                      <TableCell>{item.owner || "-"}</TableCell>
                      <TableCell className="max-w-[320px] truncate">
                        {item.description || "-"}
                      </TableCell>
                      <TableCell>{item.transactionId || "-"}</TableCell>
                      <TableCell
                        className={item.amount > 0 ? "text-green-600" : item.amount < 0 ? "text-red-600" : ""}
                      >
                        {item.amount > 0 ? "+" : ""}
                        {money(item.amount)}
                      </TableCell>
                      <TableCell>{item.status || "-"}</TableCell>
                      <TableCell>{item.vendorTranId || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <DataTablePagination
            page={result.page}
            pageSize={result.pageSize}
            totalCount={totalCount}
            itemLabel="transactions"
            disabled={loading}
            onPageChange={setPage}
            onPageSizeChange={(nextSize) => {
              setPageSize(nextSize);
              setPage(1);
            }}
          />
        </>
      )}
    </div>
  );
};

export default WalletTransactions;
