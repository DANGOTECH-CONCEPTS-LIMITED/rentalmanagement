import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { CheckCircle2, Plus, RefreshCw, Trash2, Wallet } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { DataTablePagination } from "@/components/common/DataTablePagination";
import { buildApiEndpoint } from "@/lib/api-endpoint";
import { apiUrl } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";

interface DepositRow {
  id: number;
  rentalContractId: number;
  tenantId: number;
  tenantName?: string | null;
  propertyName?: string | null;
  amountHeld: number;
  deductedAmount: number;
  refundAmount: number;
  status: string;
  contractEndDate?: string | null;
  settledAtUtc?: string | null;
}

interface DepositPage {
  items: DepositRow[];
  page: number;
  pageSize: number;
  total: number;
}

interface Deduction {
  id: number;
  category: string;
  amount: number;
  description?: string | null;
  createdAtUtc: string;
  createdBy?: string | null;
}

interface Statement {
  rentalContractId: number;
  depositId: number;
  status: string;
  amountHeld: number;
  outstandingArrears: number;
  unpaidInvoices: number;
  deductions: Deduction[];
  totalDeductions: number;
  refundable: number;
  shortfall: number;
  contractEndDate?: string | null;
  settledAtUtc?: string | null;
  notes?: string | null;
}

const CATEGORIES = ["DAMAGE", "CLEANING", "UTILITY", "OTHER"];

const money = (value: number) =>
  value.toLocaleString("en-UG", { style: "currency", currency: "UGX", maximumFractionDigits: 0 });

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString() : "-");

export default function Deposits() {
  const { toast } = useToast();
  const endpoint = useMemo(() => buildApiEndpoint(apiUrl, "/api/Deposits"), []);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [status, setStatus] = useState("");
  const [data, setData] = useState<DepositPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [statement, setStatement] = useState<Statement | null>(null);
  const [statementContractId, setStatementContractId] = useState<number | null>(null);
  const [statementLoading, setStatementLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [category, setCategory] = useState(CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");

  const readMessage = (err: unknown, fallback: string) =>
    axios.isAxiosError(err) && typeof err.response?.data?.message === "string"
      ? err.response.data.message
      : fallback;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<DepositPage>(endpoint, {
        params: { status: status || undefined, page, pageSize },
      });
      setData(response.data);
    } catch (err) {
      setError(readMessage(err, "Unable to load deposits."));
    } finally {
      setLoading(false);
    }
  }, [endpoint, page, pageSize, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadStatement = useCallback(
    async (rentalContractId: number) => {
      setStatementLoading(true);
      setStatementContractId(rentalContractId);
      try {
        const response = await axios.get<Statement>(`${endpoint}/${rentalContractId}`);
        setStatement(response.data);
      } catch (err) {
        toast({
          title: "Statement unavailable",
          description: readMessage(err, "The move-out statement could not be loaded."),
          variant: "destructive",
        });
        setStatementContractId(null);
      } finally {
        setStatementLoading(false);
      }
    },
    [endpoint, toast],
  );

  const addDeduction = async () => {
    if (statementContractId == null) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast({ title: "Invalid amount", description: "Enter an amount greater than zero.", variant: "destructive" });
      return;
    }

    setBusy(true);
    try {
      await axios.post(`${endpoint}/${statementContractId}/deductions`, {
        category,
        amount: value,
        description: description || null,
      });
      setAmount("");
      setDescription("");
      await loadStatement(statementContractId);
    } catch (err) {
      toast({ title: "Deduction rejected", description: readMessage(err, "Could not add the deduction."), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const removeDeduction = async (deductionId: number) => {
    if (statementContractId == null) return;
    setBusy(true);
    try {
      await axios.delete(`${endpoint}/deductions/${deductionId}`);
      await loadStatement(statementContractId);
    } catch (err) {
      toast({ title: "Could not remove", description: readMessage(err, "The deduction is locked."), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const settle = async () => {
    if (statementContractId == null) return;
    setBusy(true);
    try {
      const response = await axios.post(`${endpoint}/${statementContractId}/settle`, { notes: notes || null });
      const result = response.data as {
        status: string;
        appliedToArrears: number;
        appliedToDeductions: number;
        refund: number;
        shortfall: number;
      };
      toast({
        title: `Deposit ${result.status.toLowerCase()}`,
        description:
          `Arrears ${money(result.appliedToArrears)}, deductions ${money(result.appliedToDeductions)}, ` +
          `refund ${money(result.refund)}` +
          (result.shortfall > 0 ? `, still owed ${money(result.shortfall)}` : ""),
      });
      setNotes("");
      await loadStatement(statementContractId);
      await load();
    } catch (err) {
      toast({ title: "Settlement failed", description: readMessage(err, "The deposit could not be settled."), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const openStatement = (row: DepositRow) => {
    setStatement(null);
    void loadStatement(row.rentalContractId);
  };

  const closeStatement = () => {
    setStatement(null);
    setStatementContractId(null);
    setNotes("");
  };

  const held = data?.items.filter((x) => x.status === "HELD").length ?? 0;
  const total = data?.total ?? 0;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Wallet className="h-6 w-6 text-primary" /> Security Deposits
          </h1>
          <p className="text-sm text-muted-foreground">
            Deposits held per contract. Open one to record damage or cleaning claims and settle the move-out.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="deposit-status" className="text-xs text-muted-foreground">Status</Label>
          <Select value={status || "ALL"} onValueChange={(value) => { setStatus(value === "ALL" ? "" : value); setPage(1); }}>
            <SelectTrigger id="deposit-status" className="w-[160px]">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="HELD">Held</SelectItem>
              <SelectItem value="SETTLED">Settled</SelectItem>
              <SelectItem value="FORFEITED">Forfeited</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Deposits</CardTitle>
          <span className="text-xs text-muted-foreground">{held} currently held</span>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead className="text-right">Held</TableHead>
                  <TableHead className="text-right">Deducted</TableHead>
                  <TableHead className="text-right">Refunded</TableHead>
                  <TableHead>Contract end</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!loading && (data?.items.length ?? 0) === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                      No deposits recorded yet.
                    </TableCell>
                  </TableRow>
                )}
                {data?.items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-sm">{row.tenantName ?? "-"}</TableCell>
                    <TableCell className="text-xs">{row.propertyName ?? "-"}</TableCell>
                    <TableCell className="text-right text-xs">{money(row.amountHeld)}</TableCell>
                    <TableCell className="text-right text-xs">{money(row.deductedAmount)}</TableCell>
                    <TableCell className="text-right text-xs">{money(row.refundAmount)}</TableCell>
                    <TableCell className="text-xs">{formatDate(row.contractEndDate)}</TableCell>
                    <TableCell className="text-xs">{row.status}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openStatement(row)}
                        aria-label={`Open move-out statement for contract ${row.rentalContractId}`}>
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
            itemLabel="deposits"
            disabled={loading || busy}
          />
        </CardContent>
      </Card>

      <Dialog open={statementContractId !== null} onOpenChange={(open) => { if (!open) closeStatement(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Move-out statement</DialogTitle>
            <DialogDescription>
              Arrears are cleared first, then deductions; whatever remains is refunded to the tenant.
            </DialogDescription>
          </DialogHeader>

          {statementLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

          {statement && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Deposit held</div>
                  <div className="font-semibold">{money(statement.amountHeld)}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">
                    Unpaid arrears ({statement.unpaidInvoices} invoice(s))
                  </div>
                  <div className="font-semibold text-amber-600">{money(statement.outstandingArrears)}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Deductions</div>
                  <div className="font-semibold">{money(statement.totalDeductions)}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">
                    {statement.status === "HELD" ? "Refundable" : "Refunded"}
                  </div>
                  <div className="font-semibold text-emerald-600">
                    {money(statement.refundable)}
                  </div>
                </div>
              </div>

              {statement.shortfall > 0 && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
                  Deposit shortfall: {money(statement.shortfall)} — the tenant still owes this amount.
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Deductions</h3>
                  {statement.status !== "HELD" && (
                    <span className="text-xs text-muted-foreground">Locked after settlement</span>
                  )}
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statement.deductions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="py-4 text-center text-xs text-muted-foreground">
                          No deductions recorded.
                        </TableCell>
                      </TableRow>
                    )}
                    {statement.deductions.map((deduction) => (
                      <TableRow key={deduction.id}>
                        <TableCell className="text-xs">{deduction.category}</TableCell>
                        <TableCell className="text-xs">{deduction.description ?? "-"}</TableCell>
                        <TableCell className="text-right text-xs">{money(deduction.amount)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" disabled={busy || statement.status !== "HELD"}
                            onClick={() => void removeDeduction(deduction.id)}
                            aria-label={`Remove deduction ${deduction.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {statement.status === "HELD" && (
                <>
                  <div className="grid gap-2 sm:grid-cols-4">
                    <div className="sm:col-span-1">
                      <Label htmlFor="deduction-category">Category</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger id="deduction-category"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((value) => (
                            <SelectItem key={value} value={value}>{value}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-1">
                      <Label htmlFor="deduction-amount">Amount</Label>
                      <Input id="deduction-amount" inputMode="decimal" value={amount}
                        onChange={(event) => setAmount(event.target.value)} />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="deduction-description">Description</Label>
                      <Input id="deduction-description" value={description}
                        onChange={(event) => setDescription(event.target.value)} />
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => void addDeduction()} disabled={busy}>
                    <Plus className="mr-2 h-4 w-4" /> Add deduction
                  </Button>

                  <div className="space-y-2">
                    <Label htmlFor="settlement-notes">Settlement notes</Label>
                    <Textarea id="settlement-notes" value={notes} onChange={(event) => setNotes(event.target.value)}
                      placeholder="Condition of the property, keys returned, meter readings…" />
                  </div>
                </>
              )}

              {statement.status !== "HELD" && statement.notes && (
                <p className="text-xs text-muted-foreground">Notes: {statement.notes}</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeStatement} disabled={busy}>Close</Button>
            {statement?.status === "HELD" && (
              <Button onClick={() => void settle()} disabled={busy}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Settle & move out
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
