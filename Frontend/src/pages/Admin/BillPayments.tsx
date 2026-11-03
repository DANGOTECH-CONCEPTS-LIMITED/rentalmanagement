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
}

interface BillPaymentPage {
  items: BillPayment[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}

const STATUSES = [
  "PENDING_SUBMISSION",
  "PENDING_CONFIRMATION",
  "SUCCESSFUL",
  "PAID_UNDEBITED",
  "FAILED",
];

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
          pageSize: 20,
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
  }, [endpoint, search, status, from, to, page, reload]);

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
                  {STATUSES.map((item) => (
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
                      </TableCell>
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
                  {STATUSES.map((item) => (
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
    </div>
  );
};

export default BillPayments;
