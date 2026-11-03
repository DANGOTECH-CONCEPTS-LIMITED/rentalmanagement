import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [page, setPage] = useState(1);
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
          page,
          pageSize: 20,
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
  }, [endpoint, search, page]);

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

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              disabled={loading || result.page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              Previous
            </Button>
            <span className="text-sm">Page {result.page}</span>
            <Button
              variant="outline"
              disabled={loading || !result.hasMore}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default WalletTransactions;
