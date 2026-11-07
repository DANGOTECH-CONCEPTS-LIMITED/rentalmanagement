import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { AlertTriangle, RefreshCw, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buildApiEndpoint } from "@/lib/api-endpoint";
import { apiUrl } from "@/lib/api";

interface ArrearsBucket {
  label: string;
  fromDaysLate?: number | null;
  toDaysLate?: number | null;
  count: number;
  amount: number;
}

interface ArrearsAgingReport {
  generatedAtUtc: string;
  totalOutstanding: number;
  overdueAmount: number;
  buckets: ArrearsBucket[];
}

interface CollectionsMonth {
  month: string;
  billed: number;
  collected: number;
  invoices: number;
  paidInvoices: number;
  collectionRate: number;
}

interface DebtorRow {
  tenantId: number;
  tenantName: string;
  phoneNumber?: string | null;
  invoices: number;
  outstanding: number;
  oldestDaysLate: number;
}

interface ArrearsDebtorList {
  items: DebtorRow[];
  total: number;
}

const money = (value: number) =>
  value.toLocaleString("en-UG", { style: "currency", currency: "UGX", maximumFractionDigits: 0 });

const compactMoney = (value: number) =>
  new Intl.NumberFormat("en-UG", { notation: "compact", maximumFractionDigits: 1 }).format(value);

const BUCKET_COLORS = ["#0ea5e9", "#f59e0b", "#f97316", "#ef4444", "#991b1b"];

export default function ArrearsAnalytics() {
  const [aging, setAging] = useState<ArrearsAgingReport | null>(null);
  const [collections, setCollections] = useState<CollectionsMonth[]>([]);
  const [debtors, setDebtors] = useState<ArrearsDebtorList | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base = useMemo(() => buildApiEndpoint(apiUrl, "/api/Analytics"), []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [agingResponse, collectionsResponse, debtorsResponse] = await Promise.all([
        axios.get<ArrearsAgingReport>(`${base}/arrears`),
        axios.get<CollectionsMonth[]>(`${base}/collections`, { params: { months: 6 } }),
        axios.get<ArrearsDebtorList>(`${base}/debtors`, { params: { limit: 10 } }),
      ]);
      setAging(agingResponse.data);
      setCollections(collectionsResponse.data);
      setDebtors(debtorsResponse.data);
    } catch {
      setError("Unable to load arrears analytics.");
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => {
    void load();
  }, [load]);

  const agingChart = (aging?.buckets ?? []).map((bucket) => ({
    bucket: bucket.label,
    amount: bucket.amount,
    count: bucket.count,
  }));

  const collectionsChart = collections.map((month) => ({
    month: month.month,
    billed: month.billed,
    collected: month.collected,
    rate: month.collectionRate,
  }));

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <TrendingUp className="h-6 w-6 text-primary" /> Arrears Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Aging of unpaid rent, monthly collection performance and the tenants carrying the largest balances.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total outstanding</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{money(aging?.totalOutstanding ?? 0)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-red-500" /> Overdue (past due date)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-red-600">{money(aging?.overdueAmount ?? 0)}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aging buckets</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agingChart}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-40" />
                <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={compactMoney} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => money(Number(value))} />
                <Bar dataKey="amount" name="Outstanding">
                  {agingChart.map((_, index) => (
                    <Cell key={index} fill={BUCKET_COLORS[index % BUCKET_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Billed vs collected (6 months)</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={collectionsChart}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-40" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={compactMoney} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => money(Number(value))} />
                <Legend />
                <Line type="monotone" dataKey="billed" name="Billed" stroke="#6366f1" strokeWidth={2} />
                <Line type="monotone" dataKey="collected" name="Collected" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Top debtors</CardTitle>
          <span className="text-xs text-muted-foreground">{debtors?.total ?? 0} tenant(s) with a balance</span>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Invoices</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead className="text-right">Oldest (days late)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!loading && (debtors?.items.length ?? 0) === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      No outstanding balances. Every invoice is settled.
                    </TableCell>
                  </TableRow>
                )}
                {debtors?.items.map((debtor) => (
                  <TableRow key={debtor.tenantId}>
                    <TableCell className="text-sm">{debtor.tenantName}</TableCell>
                    <TableCell className="text-xs">{debtor.phoneNumber ?? "-"}</TableCell>
                    <TableCell className="text-right text-xs">{debtor.invoices}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{money(debtor.outstanding)}</TableCell>
                    <TableCell className="text-right text-xs">
                      {debtor.oldestDaysLate > 0 ? debtor.oldestDaysLate : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
