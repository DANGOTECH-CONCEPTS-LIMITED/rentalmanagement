import { useEffect, useState, useMemo } from "react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTimeDmy } from "@/lib/date-time";
import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  SUCCESSFUL: "bg-green-500/20 text-green-300 border-green-500/30",
  "SUCCESSFUL AT TELECOM": "bg-green-500/20 text-green-300 border-green-500/30",
  PENDING: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  "PENDING AT TELCOM": "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  FAILED: "bg-red-500/20 text-red-300 border-red-500/30",
  REVERSED: "bg-red-500/20 text-red-300 border-red-500/30",
};

const STATUS_OPTIONS = [
  "PENDING",
  "PENDING AT TELCOM",
  "SUCCESSFUL",
  "SUCCESSFUL AT TELECOM",
  "FAILED",
  "REVERSED",
];

const UpdateTransaction = () => {
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [selected, setSelected] = useState<any | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState(STATUS_OPTIONS[0]);
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = localStorage.getItem("user");
      const token = user ? JSON.parse(user).token : null;
      const res = await fetch(`${apiUrl}/GetAllUtilityPayments`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch transactions");
      const data = await res.json();
      setTransactions(data || []);
    } catch (err: any) {
      setError(err.message || "Error fetching transactions");
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (tx: any) => {
    setSelected(tx);
    setNewStatus(tx.status || STATUS_OPTIONS[0]);
    setDialogError(null);
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setDialogError(null);
    try {
      const user = localStorage.getItem("user");
      const token = user ? JSON.parse(user).token : null;
      const payload = {
        transactionId:
          selected.transactionID || selected.transactionId || selected.id,
        status: newStatus,
        reasonAtTelecom: selected.reasonAtTelecom || "",
        vendorTranRef: selected.vendorTranId || "",
        tranType: "UTILITY",
      };
      const res = await fetch(`${apiUrl}/Admin/UpdatePaymentStatus`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        // try JSON body, then plain text
        let details: string | null = null;
        try {
          const json = await res.json().catch(() => null);
          if (json) details = JSON.stringify(json);
        } catch {
          /* ignore */
        }
        if (!details) {
          details = await res.text().catch(() => null);
        }
        const message = `HTTP ${res.status} ${res.statusText}: ${details || "no details"}`;
        setDialogError(message);
        setError(message);
        setSaving(false);
        return;
      }
      setDialogOpen(false);
      setSelected(null);
      await fetchTransactions();
    } catch (err: any) {
      const msg = err?.message || "Error updating status";
      setDialogError(msg);
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      // status filter
      if (
        statusFilter &&
        (t.status || "").toLowerCase() !== statusFilter.toLowerCase()
      )
        return false;

      // search across tran id, meter, phone
      if (searchFilter) {
        const s = searchFilter.trim().toLowerCase();
        const match =
          (t.transactionID || t.transactionId || "" + (t.id || ""))
            .toString()
            .toLowerCase()
            .includes(s) ||
          (t.meterNumber || "").toLowerCase().includes(s) ||
          (t.phoneNumber || "").toLowerCase().includes(s);
        if (!match) return false;
      }

      // date range filter (createdAt expected)
      if (startDate) {
        const created = new Date(t.createdAt);
        const sd = new Date(startDate + "T00:00:00");
        if (created < sd) return false;
      }
      if (endDate) {
        const created = new Date(t.createdAt);
        const ed = new Date(endDate + "T23:59:59");
        if (created > ed) return false;
      }

      return true;
    });
  }, [transactions, statusFilter, searchFilter, startDate, endDate]);

  return (
    <div className="dark text-white min-h-full space-y-8">
      <section className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-[28px] p-8">
        <div className="space-y-3">
          <span className="inline-flex w-fit items-center rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
            Utility Payments
          </span>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Update Utility Transaction
            </h1>
            <p className="mt-2 text-sm text-blue-200 md:text-base">
              Select a transaction and change its status.
            </p>
          </div>
        </div>
      </section>

      <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4 flex-1">
              <Input
                variant="dark"
                placeholder="Search TranID / Meter / Phone"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="md:max-w-xs"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="md:w-[220px]">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  variant="dark"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <Input
                  type="date"
                  variant="dark"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchFilter("");
                  setStatusFilter("");
                  setStartDate("");
                  setEndDate("");
                }}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                Clear
              </Button>
              <Button
                variant="outline"
                onClick={fetchTransactions}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
        <CardContent className="p-6">
          {loading ? (
            <div className="text-center text-blue-100">Loading...</div>
          ) : error ? (
            <div className="text-center text-red-400">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-blue-200">
              No transactions found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>TranID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Meter</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((t) => (
                    <TableRow key={t.id || t.transactionID}>
                      <TableCell>
                        {t.transactionID || t.transactionId || t.id}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "bg-white/10 text-white border-white/20",
                            statusStyles[t.status],
                          )}
                        >
                          {t.status || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell>{t.amount}</TableCell>
                      <TableCell>{t.meterNumber || "-"}</TableCell>
                      <TableCell>{t.phoneNumber || "-"}</TableCell>
                      <TableCell>{formatDateTimeDmy(t.createdAt)}</TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEdit(t)}
                          className="text-blue-300 hover:bg-blue-500/10 hover:text-blue-100"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-900/95 border border-white/20 text-white rounded-[28px] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">
              Update Transaction Status
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 p-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-blue-100">
                Transaction
              </label>
              <Input
                variant="dark"
                value={
                  selected?.transactionID ||
                  selected?.transactionId ||
                  selected?.id ||
                  ""
                }
                disabled
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-blue-100">
                New Status
              </label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {dialogError && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-300">
                {dialogError}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 shadow-lg"
              >
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UpdateTransaction;
