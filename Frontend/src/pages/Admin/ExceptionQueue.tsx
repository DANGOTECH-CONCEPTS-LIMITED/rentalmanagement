import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/common/DataTablePagination";
import { buildApiEndpoint } from "@/lib/api-endpoint";
import { apiUrl } from "@/lib/api";

interface ExceptionItem {
  category: string;
  id: number;
  reference: string;
  meterNumber?: string | null;
  nwscAccount?: string | null;
  amount: number;
  status: string;
  reason?: string | null;
  occurredAtUtc: string;
  ageMinutes: number;
  actionHint: string;
}

interface ExceptionQueueResult {
  generatedAtUtc: string;
  counts: Record<string, number>;
  items: ExceptionItem[];
  total: number;
}

type Severity = "critical" | "warning" | "info";

const CATEGORIES: { key: string; label: string; short: string; severity: Severity; destination: string }[] = [
  { key: "bill_payment_undebited", label: "Paid but not debited", short: "Unpaid wallet", severity: "critical", destination: "/admin-dashboard/bill-payments" },
  { key: "collection_not_credited", label: "Collection not credited", short: "Not credited", severity: "critical", destination: "/admin-dashboard/wallet-transactions" },
  { key: "bill_payment_failed", label: "Bill payment failed", short: "Failed bills", severity: "warning", destination: "/admin-dashboard/bill-payments" },
  { key: "bill_payment_unconfirmed", label: "Unconfirmed bill payment", short: "Unconfirmed", severity: "warning", destination: "/admin-dashboard/bill-payments" },
  { key: "bill_payment_stuck_submission", label: "Stuck submission", short: "Stuck", severity: "warning", destination: "/admin-dashboard/bill-payments" },
  { key: "collection_unbilled", label: "Collection not billed", short: "Not billed", severity: "info", destination: "/admin-dashboard/wallet-transactions" },
];

const CATEGORY_LABEL = new Map(CATEGORIES.map((c) => [c.key, c.label]));
const CATEGORY_SEVERITY = new Map(CATEGORIES.map((c) => [c.key, c.severity]));
const CATEGORY_DESTINATION = new Map(CATEGORIES.map((c) => [c.key, c.destination]));

const money = (value: number) =>
  value.toLocaleString("en-UG", { style: "currency", currency: "UGX", maximumFractionDigits: 0 });

const formatAge = (minutes: number) => {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  return `${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h`;
};

const severityClass: Record<Severity, string> = {
  critical: "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40",
  warning: "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40",
  info: "border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/40",
};

const badgeClass: Record<Severity, string> = {
  critical: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-100",
  info: "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-100",
};

export default function ExceptionQueue() {
  const navigate = useNavigate();
  const endpoint = useMemo(() => buildApiEndpoint(apiUrl, "/api/AdminExceptions"), []);
  const [data, setData] = useState<ExceptionQueueResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<ExceptionQueueResult>(endpoint, {
        params: { category: category ?? undefined, page, pageSize },
      });
      setData(response.data);
    } catch (err) {
      const message =
        axios.isAxiosError(err) &&
        typeof err.response?.data === "object" &&
        err.response?.data !== null &&
        "message" in err.response.data
          ? String((err.response.data as { message?: unknown }).message)
          : "Unable to load the exception queue.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [category, endpoint, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = data?.counts ?? {};
  const total = data?.total ?? 0;

  const selectCategory = (key: string) => {
    setCategory((current) => (current === key ? null : key));
    setPage(1);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <AlertTriangle className="h-6 w-6 text-amber-500" /> Exception Queue
          </h1>
          <p className="text-sm text-muted-foreground">
            Everything the automated flows could not finish on their own. Oldest items appear first.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map((entry) => {
          const count = counts[entry.key] ?? 0;
          const active = category === entry.key;
          return (
            <button
              key={entry.key}
              type="button"
              onClick={() => selectCategory(entry.key)}
              className={`rounded-lg border p-4 text-left transition hover:shadow-sm ${
                active ? "ring-2 ring-primary" : ""
              } ${severityClass[entry.severity]}`}
              aria-pressed={active}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{entry.label}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass[entry.severity]}`}>
                  {count}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {count === 0 ? "Nothing to action" : "Click to filter"}
              </p>
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">
            {category ? CATEGORY_LABEL.get(category) : "All exceptions"}{" "}
            <span className="text-sm font-normal text-muted-foreground">({total})</span>
          </CardTitle>
          {category && (
            <Button variant="ghost" size="sm" onClick={() => { setCategory(null); setPage(1); }}>
              Clear filter
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Age</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Meter</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>What to do</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && !data && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                )}
                {!loading && (data?.items.length ?? 0) === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                      No exceptions. Every payment flow is settled.
                    </TableCell>
                  </TableRow>
                )}
                {data?.items.map((item) => {
                  const severity = CATEGORY_SEVERITY.get(item.category) ?? "info";
                  return (
                    <TableRow key={`${item.category}-${item.id}`}>
                      <TableCell className="whitespace-nowrap font-mono text-xs">
                        {formatAge(item.ageMinutes)}
                      </TableCell>
                      <TableCell>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass[severity]}`}>
                          {CATEGORY_LABEL.get(item.category) ?? item.category}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{item.reference}</TableCell>
                      <TableCell className="text-xs">
                        <div>{item.meterNumber ?? "-"}</div>
                        <div className="text-muted-foreground">{item.nwscAccount ?? "-"}</div>
                      </TableCell>
                      <TableCell className="text-right text-xs">{money(item.amount)}</TableCell>
                      <TableCell className="text-xs">
                        <div>{item.status}</div>
                        {item.reason && (
                          <div className="max-w-[16rem] truncate text-muted-foreground" title={item.reason}>
                            {item.reason}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[18rem] text-xs text-muted-foreground">{item.actionHint}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(CATEGORY_DESTINATION.get(item.category) ?? "/admin-dashboard")}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <DataTablePagination
            page={page}
            pageSize={pageSize}
            totalCount={total}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
            itemLabel="exceptions"
            disabled={loading}
          />
        </CardContent>
      </Card>
    </div>
  );
}
