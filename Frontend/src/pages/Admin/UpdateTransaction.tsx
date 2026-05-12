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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateTimeDmy } from "@/lib/date-time";
import { Pencil } from "lucide-react";

const STATUS_OPTIONS = [
  "PENDING",
  "PENDING AT TELCOM",
  "SUCCESSFUL",
  "SUCCESSFUL AT TELCOM",
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
        transactionId: selected.transactionID || selected.transactionId || selected.id,
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
        } catch { /* ignore */ }
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
      if (statusFilter && (t.status || "").toLowerCase() !== statusFilter.toLowerCase()) return false;

      // search across tran id, meter, phone
      if (searchFilter) {
        const s = searchFilter.trim().toLowerCase();
        const match = (t.transactionID || t.transactionId || "" + (t.id || "")).toString().toLowerCase().includes(s)
          || (t.meterNumber || "").toLowerCase().includes(s)
          || (t.phoneNumber || "").toLowerCase().includes(s);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Update Utility Transaction</h1>
          <p className="text-sm text-muted-foreground">Select a transaction and change its status.</p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            placeholder="Search TranID / Meter / Phone"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-64"
          />
          <select className="rounded border px-2 py-1" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <Button variant="outline" onClick={() => { setSearchFilter(""); setStatusFilter(""); setStartDate(""); setEndDate(""); }}>Clear</Button>
          <Button onClick={fetchTransactions} variant="outline">Refresh</Button>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="p-6">Loading...</div>
        ) : error ? (
          <div className="p-6 text-red-500">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-muted-foreground">No transactions found.</div>
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
                    <TableCell>{t.transactionID || t.transactionId || t.id}</TableCell>
                    <TableCell>{t.status || "-"}</TableCell>
                    <TableCell>{t.amount}</TableCell>
                    <TableCell>{t.meterNumber || "-"}</TableCell>
                    <TableCell>{t.phoneNumber || "-"}</TableCell>
                    <TableCell>{formatDateTimeDmy(t.createdAt)}</TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(t)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Update Transaction Status</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 p-4">
            <div>
              <label className="block text-sm font-medium mb-1">Transaction</label>
              <Input value={selected?.transactionID || selected?.transactionId || selected?.id || ""} disabled />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">New Status</label>
              <select className="w-full rounded border px-3 py-2" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" isLoading={saving}>Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UpdateTransaction;
