import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTablePagination } from "@/components/common/DataTablePagination";

interface BillPayment {
  id: number;
  requestReference: string;
  nwscAccount: string;
  meterNumber?: string | null;
  meterName?: string | null;
  amount: number;
  status: string;
  providerReference?: string | null;
  reason?: string | null;
  externalRefNoBillerId?: string | null;
  createdAtUtc: string;
  submittedAtUtc?: string | null;
  confirmedAtUtc?: string | null;
  walletDebitedAtUtc?: string | null;
  submissionAttempts?: number;
}

interface BillPaymentPage {
  items: BillPayment[];
  page: number;
  pageSize: number;
  hasMore: boolean;
  totalCount: number;
}

const STATUSES = [
  "PENDING_SUBMISSION",
  "PENDING_CONFIRMATION",
  "RECONCILIATION_REQUIRED",
  "SUCCESSFUL",
  "PAID_UNDEBITED",
  "FAILED",
];

// Pending states are produced by the worker/provider flow, never assigned by hand.
const MANUAL_STATUSES = ["RECONCILIATION_REQUIRED", "SUCCESSFUL", "PAID_UNDEBITED", "FAILED"];

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleString() : "-";

const money = (value: number) =>
  value.toLocaleString("en-UG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const BillPayments = () => {
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const endpoint = `${apiUrl.replace(/\/+$/, "").replace(/\/api(?:\/.*)?$/i, "")}/api/AdminBillPayments`;

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [result, setResult] = useState<BillPaymentPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const [applyingBulk, setApplyingBulk] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const [selected, setSelected] = useState<BillPayment | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [resubmitTarget, setResubmitTarget] = useState<BillPayment | null>(null);
  const [resubmitReason, setResubmitReason] = useState("");
  const [resubmitting, setResubmitting] = useState(false);

  const getToken = () => {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser).token : null;
  };

  const processBillPayments = async () => {
    setProcessing(true);
    setNotice("");
    setError("");
    try {
      const { data } = await axios.post<{ processed: number }>(
        `${endpoint}/process`,
        {},
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      setNotice(`Processed ${data.processed} bill payment(s).`);
      setReload((value) => value + 1);
    } catch (failure) {
      setError(
        axios.isAxiosError(failure) && failure.response?.data?.message
          ? failure.response.data.message
          : "Unable to process bill payments."
      );
    } finally {
      setProcessing(false);
    }
  };

  const backfillBillPayments = async () => {
    setBackfilling(true);
    setNotice("");
    setError("");
    try {
      const { data } = await axios.post<{ created: number }>(
        `${endpoint}/backfill`,
        {},
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      setNotice(`Created ${data.created} bill payment instruction(s) for old transactions.`);
      setReload((value) => value + 1);
    } catch (failure) {
      setError(
        axios.isAxiosError(failure) && failure.response?.data?.message
          ? failure.response.data.message
          : "Unable to backfill bill payments."
      );
    } finally {
      setBackfilling(false);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!result) return;
    const pageIds = result.items.map((item) => item.id);
    setSelectedIds((current) => {
      const allSelected = pageIds.every((id) => current.has(id));
      const next = new Set(current);
      pageIds.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  const applyBulkStatus = async () => {
    if (selectedIds.size === 0) return;
    if (!bulkStatus) {
      setError("Choose a status to apply to the selected bill payments.");
      return;
    }
    setApplyingBulk(true);
    setError("");
    setNotice("");
    try {
      const { data } = await axios.put<{ updated: number }>(
        `${endpoint}/status`,
        { ids: Array.from(selectedIds), status: bulkStatus },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      setNotice(`Updated ${data.updated} bill payment(s) to ${bulkStatus}.`);
      setSelectedIds(new Set());
      setBulkStatus("");
      setReload((value) => value + 1);
    } catch (failure) {
      setError(
        axios.isAxiosError(failure) && failure.response?.data?.message
          ? failure.response.data.message
          : "Unable to update bill payment statuses."
      );
    } finally {
      setApplyingBulk(false);
    }
  };

  const canResubmit = (item: BillPayment) =>
    !item.submittedAtUtc &&
    (item.submissionAttempts ?? 0) === 0 &&
    (item.status === "PENDING_SUBMISSION" ||
      item.status === "PENDING_CONFIRMATION" ||
      item.status === "FAILED");

  const resubmitBillPayment = async () => {
    if (!resubmitTarget) return;
    setResubmitting(true);
    setError("");
    setNotice("");
    try {
      const { data } = await axios.post<{ reference: string }>(
        `${endpoint}/${resubmitTarget.id}/resubmit`,
        { reason: resubmitReason.trim() },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      setNotice(`Bill payment ${data.reference} requeued; the next cycle submits it.`);
      setResubmitTarget(null);
      setResubmitReason("");
      setReload((value) => value + 1);
    } catch (failure) {
      setError(
        axios.isAxiosError(failure) && failure.response?.data?.message
          ? failure.response.data.message
          : "Unable to resubmit bill payment."
      );
    } finally {
      setResubmitting(false);
    }
  };

  const updateStatus = async () => {
    if (!selected || !newStatus) return;
    setSavingStatus(true);
    setError("");
    setNotice("");
    try {
      await axios.put(
        `${endpoint}/${selected.id}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      setNotice(`Updated bill payment ${selected.requestReference} to ${newStatus}.`);
      setSelected(null);
      setNewStatus("");
      setReload((value) => value + 1);
    } catch (failure) {
      setError(
        axios.isAxiosError(failure) && failure.response?.data?.message
          ? failure.response.data.message
          : "Unable to update bill payment status."
      );
    } finally {
      setSavingStatus(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");

    axios
      .get<BillPaymentPage>(endpoint, {
        headers: { Authorization: `Bearer ${getToken()}` },
        params: {
          ...(search.trim() ? { reference: search.trim() } : {}),
          ...(status !== "all" ? { status } : {}),
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
        if (!controller.signal.aborted) {
          setError("Unable to load bill payment transactions.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [endpoint, search, status, from, to, page, pageSize, reload]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bill Payments</h1>
        <p className="text-muted-foreground">
          View automatic NWSC bill payment transactions and their provider/debit outcomes.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="bill-payment-search">
            Search by reference, account, or meter
          </Label>
          <Input
            id="bill-payment-search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
              setSelectedIds(new Set());
            }}
            placeholder="e.g. DANGO_B_20261030_1"
            className="w-72"
          />
        </div>
        <div className="space-y-1">
          <Label>Status</Label>
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value);
              setPage(1);
              setSelectedIds(new Set());
            }}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="bill-payment-from">From</Label>
          <Input
            id="bill-payment-from"
            type="date"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value);
              setPage(1);
              setSelectedIds(new Set());
            }}
            className="w-40"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="bill-payment-to">To</Label>
          <Input
            id="bill-payment-to"
            type="date"
            value={to}
            onChange={(event) => {
              setTo(event.target.value);
              setPage(1);
              setSelectedIds(new Set());
            }}
            className="w-40"
          />
        </div>
        <Button
          variant="outline"
          disabled={processing}
          onClick={() => void processBillPayments()}
        >
          {processing ? "Processing..." : "Process Pending"}
        </Button>
        <Button
          variant="outline"
          disabled={backfilling}
          onClick={() => void backfillBillPayments()}
        >
          {backfilling ? "Backfilling..." : "Backfill Old Payments"}
        </Button>
      </div>

      {loading && <p className="text-muted-foreground">Loading bill payments...</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {notice && <p className="text-sm">{notice}</p>}

      {result && !loading && (
        <>
          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 p-3">
              <span className="text-sm font-medium">{selectedIds.size} selected</span>
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Set status..." />
                </SelectTrigger>
                <SelectContent>
                  {MANUAL_STATUSES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                disabled={applyingBulk}
                onClick={() => void applyBulkStatus()}
              >
                {applyingBulk ? "Applying..." : "Apply to selected"}
              </Button>
              <Button
                variant="ghost"
                disabled={applyingBulk}
                onClick={() => {
                  setSelectedIds(new Set());
                  setBulkStatus("");
                }}
              >
                Clear
              </Button>
            </div>
          )}
          {result.items.length === 0 ? (
            <p className="text-muted-foreground">No bill payment transactions found.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={
                          result.items.length > 0 &&
                          result.items.every((item) => selectedIds.has(item.id))
                        }
                        onCheckedChange={() => toggleSelectAll()}
                        aria-label="Select all on this page"
                      />
                    </TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>NWSC Account</TableHead>
                    <TableHead>Meter Number</TableHead>
                    <TableHead>Meter Name</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Provider Ref</TableHead>
                    <TableHead>Biller Ref</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Confirmed</TableHead>
                    <TableHead>Wallet Debited</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(item.id)}
                          onCheckedChange={() => toggleSelect(item.id)}
                          aria-label={`Select ${item.requestReference || item.id}`}
                        />
                      </TableCell>
                      <TableCell>{item.requestReference || "-"}</TableCell>
                      <TableCell>{item.nwscAccount || "-"}</TableCell>
                      <TableCell>{item.meterNumber || "-"}</TableCell>
                      <TableCell>{item.meterName || "-"}</TableCell>
                      <TableCell>{money(item.amount)}</TableCell>
                      <TableCell>{item.status || "-"}</TableCell>
                      <TableCell>{item.providerReference || "-"}</TableCell>
                      <TableCell>{item.externalRefNoBillerId || "-"}</TableCell>
                      <TableCell className="max-w-[260px] truncate">
                        {item.reason || "-"}
                      </TableCell>
                      <TableCell>{formatDate(item.createdAtUtc)}</TableCell>
                      <TableCell>{formatDate(item.submittedAtUtc)}</TableCell>
                      <TableCell>{formatDate(item.confirmedAtUtc)}</TableCell>
                      <TableCell>{formatDate(item.walletDebitedAtUtc)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelected(item);
                              setNewStatus(item.status || "");
                            }}
                          >
                            Update
                          </Button>
                          {canResubmit(item) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setResubmitTarget(item);
                                setResubmitReason("");
                              }}
                            >
                              Resubmit
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <DataTablePagination
            page={result.page}
            pageSize={result.pageSize}
            totalCount={
              typeof result.totalCount === "number"
                ? result.totalCount
                : result.page * result.pageSize + (result.hasMore ? 1 : 0)
            }
            itemLabel="bill payments"
            disabled={loading}
            onPageChange={setPage}
            onPageSizeChange={(nextSize) => {
              setPageSize(nextSize);
              setPage(1);
              setSelectedIds(new Set());
            }}
          />
        </>
      )}

      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open && !savingStatus) setSelected(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Bill Payment Status</DialogTitle>
            <DialogDescription>
              {selected?.requestReference || ""} — manually set the transaction status.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                  {MANUAL_STATUSES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  disabled={savingStatus}
                  onClick={() => setSelected(null)}
                >
                  Cancel
                </Button>
                <Button
                  disabled={savingStatus || !newStatus}
                  onClick={() => void updateStatus()}
                >
                  {savingStatus ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!resubmitTarget}
        onOpenChange={(open) => {
          if (!open && !resubmitting) setResubmitTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resubmit bill payment</DialogTitle>
            <DialogDescription>
              {resubmitTarget?.requestReference || ""} has no recorded provider submission
              (attempts: {resubmitTarget?.submissionAttempts ?? 0}). Resubmitting only queues it
              again with the same reference — it never debits twice. Confirm with Dango that no
              payment exists for this reference first.
            </DialogDescription>
          </DialogHeader>
          {resubmitTarget && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bill-payment-resubmit-reason">Reason for resubmitting</Label>
                <Input
                  id="bill-payment-resubmit-reason"
                  value={resubmitReason}
                  onChange={(event) => setResubmitReason(event.target.value)}
                  placeholder="e.g. Dango confirmed no request for this reference"
                  disabled={resubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum 5 characters. Stored on the instruction for audit.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  disabled={resubmitting}
                  onClick={() => setResubmitTarget(null)}
                >
                  Cancel
                </Button>
                <Button
                  disabled={resubmitting || resubmitReason.trim().length < 5}
                  onClick={() => void resubmitBillPayment()}
                >
                  {resubmitting ? "Resubmitting..." : "Resubmit"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BillPayments;
