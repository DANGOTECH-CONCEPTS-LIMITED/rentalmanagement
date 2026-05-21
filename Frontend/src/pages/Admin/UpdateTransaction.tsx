import { useEffect, useState, useMemo } from "react";
import { DataTable, Column } from "@/components/ui/data-table";
import { formatDateTimeDmy } from "@/lib/date-time";
import { Pencil, Search, X, RefreshCw, ArrowLeftRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const inputCls =
  "h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] shadow-sm outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10";
const selCls =
  "h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-sm text-[#0F172A] shadow-sm outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 cursor-pointer";

const STATUS_OPTIONS = [
  "PENDING",
  "PENDING AT TELCOM",
  "SUCCESSFUL",
  "SUCCESSFUL AT TELCOM",
  "FAILED",
  "REVERSED",
];

const statusBadge = (status: string) => {
  const s = (status || "").toUpperCase();
  if (s === "SUCCESSFUL" || s === "SUCCESSFUL AT TELCOM")
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
        {status || "-"}
      </span>
    );
  if (s === "PENDING" || s === "PENDING AT TELCOM")
    return (
      <span className="inline-flex items-center rounded-full border border-amber-100 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
        {status || "-"}
      </span>
    );
  if (s === "FAILED" || s === "REVERSED")
    return (
      <span className="inline-flex items-center rounded-full border border-red-100 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
        {status || "-"}
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
      {status || "-"}
    </span>
  );
};

const UpdateTransaction = () => {
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const [isLoading, setIsLoading] = useState(false);
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
    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  const openEdit = (tx: any) => {
    setSelected(tx);
    setNewStatus(tx.status || STATUS_OPTIONS[0]);
    setDialogOpen(true);
    setDialogError(null);
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
      if (statusFilter && (t.status || "").toLowerCase() !== statusFilter.toLowerCase())
        return false;

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

  const hasFilters = !!searchFilter || !!statusFilter || !!startDate || !!endDate;

  const columns: Column<any>[] = [
    {
      key: "tranId",
      header: "TranID",
      cell: (t) => (
        <span className="font-mono text-xs">
          {t.transactionID || t.transactionId || t.id}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (t) => statusBadge(t.status),
    },
    {
      key: "amount",
      header: "Amount",
      cell: (t) => t.amount,
    },
    {
      key: "meter",
      header: "Meter",
      cell: (t) => t.meterNumber || "-",
    },
    {
      key: "phone",
      header: "Phone",
      cell: (t) => t.phoneNumber || "-",
    },
    {
      key: "created",
      header: "Created",
      cell: (t) => formatDateTimeDmy(t.createdAt),
    },
    {
      key: "action",
      header: "Action",
      cell: (t) => (
        <button
          onClick={() => openEdit(t)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#0F172A] hover:bg-slate-50 hover:border-[#1D4ED8] hover:text-[#1D4ED8] transition-colors shadow-sm"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#1E3A5F] to-[#1D4ED8] px-8 py-8 text-white shadow-xl">
        <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-8 left-1/3 h-40 w-40 rounded-full bg-white/5" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-200">
              Admin Panel
            </span>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Update Utility Transaction
            </h1>
            <p className="text-sm text-blue-200/80">
              Select a transaction and change its status
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-white/20 bg-white/10 p-3">
              <ArrowLeftRight className="h-6 w-6 text-blue-200" />
            </div>
            <button
              onClick={fetchTransactions}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition-colors disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </section>

      {/* Error banner */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              className={inputCls + " pl-9"}
              placeholder="Search TranID / Meter / Phone"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
          </div>
          <select
            className={selCls}
            style={{ width: "auto", minWidth: 180 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              From
            </label>
            <input
              type="date"
              className={inputCls}
              style={{ width: 150 }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              To
            </label>
            <input
              type="date"
              className={inputCls}
              style={{ width: 150 }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          {hasFilters && (
            <button
              onClick={() => {
                setSearchFilter("");
                setStatusFilter("");
                setStartDate("");
                setEndDate("");
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors h-11"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
        <DataTable
          data={filtered}
          columns={columns}
          loading={isLoading}
          searchValue={searchFilter}
          onSearchChange={setSearchFilter}
          searchPlaceholder="Search TranID / Meter / Phone"
          label="transaction"
          emptyMessage="No transactions found."
        />
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {dialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[90vh]"
            >
              <div className="shrink-0 bg-gradient-to-r from-[#0F172A] to-[#1D4ED8] px-6 py-5 text-white flex items-center justify-between">
                <h2 className="text-lg font-bold">Update Transaction Status</h2>
                <button
                  onClick={() => setDialogOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSave} className="flex flex-col flex-1">
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                  {dialogError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {dialogError}
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
                      Transaction ID
                    </label>
                    <input
                      className={inputCls + " bg-slate-50 cursor-not-allowed"}
                      value={
                        selected?.transactionID ||
                        selected?.transactionId ||
                        selected?.id ||
                        ""
                      }
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
                      New Status
                    </label>
                    <select
                      className={selCls}
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="shrink-0 border-t border-slate-100 px-6 py-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDialogOpen(false)}
                    disabled={saving}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-[#1D4ED8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e40af] transition-colors disabled:opacity-60 inline-flex items-center gap-2"
                  >
                    {saving && (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    )}
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UpdateTransaction;
