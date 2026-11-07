import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { CalendarClock, PlayCircle, RefreshCw, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useToast } from "@/components/ui/use-toast";

interface RentInvoice {
  id: number;
  invoiceNumber: string;
  period: string;
  tenantId: number;
  tenantName?: string | null;
  tenantPhone?: string | null;
  propertyName?: string | null;
  amount: number;
  amountPaid: number;
  balance: number;
  status: string;
  dueDate: string;
  dunningLevel: number;
  lastDunningAtUtc?: string | null;
}

interface RentInvoicePage {
  items: RentInvoice[];
  page: number;
  pageSize: number;
  total: number;
}

interface RentInvoiceSummary {
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
  overdue: number;
  openCount: number;
  partiallyPaidCount: number;
  paidCount: number;
  overdueCount: number;
}

const STATUSES = ["OPEN", "PARTIALLY_PAID", "OVERDUE", "PAID", "CANCELLED"];

const money = (value: number) =>
  value.toLocaleString("en-UG", { style: "currency", currency: "UGX", maximumFractionDigits: 0 });

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString() : "-");

const statusClass = (status: string) => {
  switch (status) {
    case "PAID":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-100";
    case "OVERDUE":
      return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100";
    case "PARTIALLY_PAID":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-100";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100";
  }
};

export default function RentInvoices() {
  const { toast } = useToast();
  const endpoint = useMemo(() => buildApiEndpoint(apiUrl, "/api/RentInvoices"), []);
  const [data, setData] = useState<RentInvoicePage | null>(null);
  const [summary, setSummary] = useState<RentInvoiceSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [paying, setPaying] = useState<RentInvoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  const readMessage = (err: unknown, fallback: string) =>
    axios.isAxiosError(err) && typeof err.response?.data?.message === "string"
      ? err.response.data.message
      : fallback;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [invoices, totals] = await Promise.all([
        axios.get<RentInvoicePage>(endpoint, {
          params: { status: status || undefined, page, pageSize },
        }),
        axios.get<RentInvoiceSummary>(`${endpoint}/summary`),
      ]);
      setData(invoices.data);
      setSummary(totals.data);
    } catch (err) {
      setError(readMessage(err, "Unable to load rent invoices."));
    } finally {
      setLoading(false);
    }
  }, [endpoint, page, pageSize, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (path: string, successTitle: string) => {
    setBusy(true);
    try {
      const response = await axios.post(`${endpoint}${path}`);
      toast({ title: successTitle, description: response.data?.message ?? "Done." });
      await load();
    } catch (err) {
      toast({
        title: "Action failed",
        description: readMessage(err, "The request could not be completed."),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const submitPayment = async () => {
    if (!paying) return;
    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({ title: "Invalid amount", description: "Enter an amount greater than zero.", variant: "destructive" });
      return;
    }

    setBusy(true);
    try {
      const response = await axios.post(`${endpoint}/${paying.id}/pay`, { amount });
      toast({
        title: "Payment recorded",
        description: `Applied ${money(response.data.applied)}. Balance ${money(response.data.balance)}.`,
      });
      setPaying(null);
      setPaymentAmount("");
      await load();
    } catch (err) {
      toast({
        title: "Payment rejected",
        description: readMessage(err, "The payment could not be recorded."),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const total = data?.total ?? 0;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <CalendarClock className="h-6 w-6 text-primary" /> Rent Invoices
          </h1>
          <p className="text-sm text-muted-foreground">
            Monthly rent billed from active contracts, with an automatic reminder ladder for unpaid invoices.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void load()} disabled={loading || busy}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button variant="outline" onClick={() => void runAction("/generate", "Invoices generated")} disabled={busy}>
            Generate invoices
          </Button>
          <Button onClick={() => void runAction("/dunning/run", "Dunning completed")} disabled={busy}>
            <PlayCircle className="mr-2 h-4 w-4" /> Run dunning
          </Button>
        </div>
      </div>

      {summary && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Billed</CardTitle></CardHeader>
            <CardContent className="text-xl font-semibold">{money(summary.totalBilled)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Collected</CardTitle></CardHeader>
            <CardContent className="text-xl font-semibold text-emerald-600">{money(summary.totalPaid)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Outstanding</CardTitle></CardHeader>
            <CardContent className="text-xl font-semibold text-amber-600">{money(summary.outstanding)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Overdue</CardTitle></CardHeader>
            <CardContent className="text-xl font-semibold text-red-600">
              {money(summary.overdue)}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {summary.overdueCount} invoice(s)
              </span>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Invoices</CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="invoice-status" className="text-xs text-muted-foreground">Status</Label>
            <Select
              value={status || "ALL"}
              onValueChange={(value) => {
                setStatus(value === "ALL" ? "" : value);
                setPage(1);
              }}
            >
              <SelectTrigger id="invoice-status" className="w-[170px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {STATUSES.map((value) => (
                  <SelectItem key={value} value={value}>{value.replace("_", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
                  <TableHead>Invoice</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dunning</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!loading && (data?.items.length ?? 0) === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="py-8 text-center text-sm text-muted-foreground">
                      No invoices yet. Use “Generate invoices” to bill active contracts.
                    </TableCell>
                  </TableRow>
                )}
                {data?.items.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono text-xs">{invoice.invoiceNumber}</TableCell>
                    <TableCell className="text-xs">{invoice.period}</TableCell>
                    <TableCell className="text-xs">
                      <div>{invoice.tenantName ?? "-"}</div>
                      <div className="text-muted-foreground">{invoice.tenantPhone ?? "-"}</div>
                    </TableCell>
                    <TableCell className="text-xs">{invoice.propertyName ?? "-"}</TableCell>
                    <TableCell className="text-right text-xs">{money(invoice.amount)}</TableCell>
                    <TableCell className="text-right text-xs">{money(invoice.amountPaid)}</TableCell>
                    <TableCell className="text-right text-xs font-medium">{money(invoice.balance)}</TableCell>
                    <TableCell className="text-xs">{formatDate(invoice.dueDate)}</TableCell>
                    <TableCell>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(invoice.status)}`}>
                        {invoice.status.replace("_", " ")}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {invoice.dunningLevel > 0 ? `step ${invoice.dunningLevel}` : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={invoice.balance <= 0 || invoice.status === "CANCELLED"}
                        onClick={() => {
                          setPaying(invoice);
                          setPaymentAmount(String(invoice.balance));
                        }}
                        aria-label={`Record payment for ${invoice.invoiceNumber}`}
                      >
                        <Wallet className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DataTablePagination
            page={page}
            pageSize={pageSize}
            totalCount={total}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
            itemLabel="invoices"
            disabled={loading || busy}
          />
        </CardContent>
      </Card>

      <Dialog open={paying !== null} onOpenChange={(open) => { if (!open) setPaying(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record rent payment</DialogTitle>
            <DialogDescription>
              {paying?.invoiceNumber} — balance {money(paying?.balance ?? 0)}. Partial payments are allowed;
              the amount cannot exceed the balance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rent-payment-amount">Amount</Label>
            <Input
              id="rent-payment-amount"
              inputMode="decimal"
              value={paymentAmount}
              onChange={(event) => setPaymentAmount(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaying(null)} disabled={busy}>Cancel</Button>
            <Button onClick={() => void submitPayment()} disabled={busy}>Record payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
