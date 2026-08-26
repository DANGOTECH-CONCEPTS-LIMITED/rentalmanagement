import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Plus, Pencil, Trash2, Filter, Loader2, X, AlertTriangle, Tag,
  TrendingUp, Calendar, Home, Download,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { DataTable, Column } from "@/components/ui/data-table";
import axios from "axios";

const DEFAULT_CATEGORIES = ["Parking", "Carpet Washing", "Laundry", "Security Fee", "Advertising", "Storage", "Other"];

const categoryStyle: Record<string, string> = {
  "Parking":      "bg-blue-50 text-blue-700 border-blue-200",
  "Carpet Washing": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Laundry":      "bg-purple-50 text-purple-700 border-purple-200",
  "Security Fee": "bg-red-50 text-red-700 border-red-200",
  "Advertising":  "bg-amber-50 text-amber-700 border-amber-200",
  "Storage":      "bg-orange-50 text-orange-700 border-orange-200",
  "Other":        "bg-slate-50 text-slate-600 border-slate-200",
};

interface OtherIncome {
  id: number;
  date: string;
  amount: number;
  category: string;
  description: string;
  receivedFrom?: string;
  referenceNumber?: string;
  propertyId?: number;
  property?: { id: number; name: string };
  ownerId: number;
  createdAt?: string;
}

interface Property { id: number; name: string; }

const empty = {
  date: new Date().toISOString().split("T")[0],
  amount: "",
  category: "Parking",
  description: "",
  receivedFrom: "",
  referenceNumber: "",
  propertyId: "",
};

const selCls =
  "w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 transition-colors";

const CategoryBadge = ({ category }: { category: string }) => {
  const cls = categoryStyle[category] ?? categoryStyle["Other"];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      <Tag className="h-2.5 w-2.5" /> {category}
    </span>
  );
};

const OtherIncomePage = () => {
  const { toast } = useToast();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const userData = JSON.parse(localStorage.getItem("user") || "{}");
  const token = userData?.token;
  const headers = { Authorization: `Bearer ${token}` };

  const [records, setRecords] = useState<OtherIncome[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<OtherIncome | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OtherIncome | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ ...empty });
  const [customCategory, setCustomCategory] = useState("");

  const todayStr = new Date().toISOString().split("T")[0];
  const firstOfMonth = new Date().toISOString().slice(0, 7) + "-01";
  const [filterFrom, setFilterFrom] = useState(firstOfMonth);
  const [filterTo, setFilterTo] = useState(todayStr);
  const [filterProperty, setFilterProperty] = useState("");

  const fetchRecords = async () => {
    try {
      const { data } = await axios.get(`${apiUrl}/GetOtherIncomeByOwnerId/${userData.id}`, { headers });
      setRecords(data);
    } catch { /* silent */ }
  };

  useEffect(() => {
    const fetchAll = async () => {
      setLoadingData(true);
      await Promise.all([
        fetchRecords(),
        axios.get<Property[]>(`${apiUrl}/GetPropertiesByLandLordId/${userData.id}`, { headers })
          .then(({ data }) => setProperties(data))
          .catch(() => {}),
      ]);
      setLoadingData(false);
    };
    fetchAll();
  }, []);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const d = r.date.split("T")[0];
      const matchFrom = filterFrom ? d >= filterFrom : true;
      const matchTo = filterTo ? d <= filterTo : true;
      const matchProp = filterProperty ? String(r.propertyId) === filterProperty : true;
      return matchFrom && matchTo && matchProp;
    });
  }, [records, filterFrom, filterTo, filterProperty]);

  const monthTotal = useMemo(() => filtered.reduce((s, r) => s + r.amount, 0), [filtered]);

  const openAdd = () => {
    setEditTarget(null);
    setForm({ ...empty });
    setCustomCategory("");
    setModalOpen(true);
  };

  const openEdit = (r: OtherIncome) => {
    setEditTarget(r);
    const isCustom = !DEFAULT_CATEGORIES.includes(r.category);
    setForm({
      date: r.date.split("T")[0],
      amount: String(r.amount),
      category: isCustom ? "Other" : r.category,
      description: r.description,
      receivedFrom: r.receivedFrom ?? "",
      referenceNumber: r.referenceNumber ?? "",
      propertyId: r.propertyId ? String(r.propertyId) : "",
    });
    setCustomCategory(isCustom ? r.category : "");
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.date || !form.amount || !form.category) {
      toast({ title: "Missing fields", description: "Date, amount and category are required.", variant: "destructive" });
      return;
    }
    const resolvedCategory = form.category === "Other" ? (customCategory.trim() || "Other") : form.category;
    setSaving(true);
    try {
      if (editTarget) {
        await axios.put(`${apiUrl}/UpdateOtherIncome`, {
          id: editTarget.id,
          date: form.date,
          amount: parseFloat(form.amount),
          category: resolvedCategory,
          description: form.description,
          receivedFrom: form.receivedFrom || null,
          referenceNumber: form.referenceNumber || null,
          propertyId: form.propertyId ? parseInt(form.propertyId) : null,
        }, { headers });
        toast({ title: "Updated", description: "Income record updated." });
      } else {
        await axios.post(`${apiUrl}/CreateOtherIncome`, {
          date: form.date,
          amount: parseFloat(form.amount),
          category: resolvedCategory,
          description: form.description,
          receivedFrom: form.receivedFrom || null,
          referenceNumber: form.referenceNumber || null,
          ownerId: userData.id,
          propertyId: form.propertyId ? parseInt(form.propertyId) : null,
        }, { headers });
        toast({ title: "Recorded", description: "Income entry added." });
      }
      await fetchRecords();
      setModalOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err?.response?.data ?? "Something went wrong.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    const escape = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [
      ["Date", "Category", "Description", "Property", "Received From", "Reference No.", "Amount (UGX)"],
      ...filtered.map((r) => [
        r.date.split("T")[0],
        r.category,
        r.description,
        r.property?.name ?? "",
        r.receivedFrom ?? "",
        r.referenceNumber ?? "",
        r.amount,
      ]),
      ["", "", "", "", "", "TOTAL", monthTotal],
    ];
    const csv = rows.map((row) => row.map(escape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `other-income-${filterFrom ?? "all"}-to-${filterTo ?? "all"}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axios.delete(`${apiUrl}/DeleteOtherIncome/${deleteTarget.id}?ownerId=${userData.id}`, { headers });
      toast({ title: "Deleted", description: "Income record removed." });
      await fetchRecords();
      setDeleteTarget(null);
    } catch (err: any) {
      toast({ title: "Error", description: err?.response?.data ?? "Delete failed.", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<OtherIncome>[] = [
    {
      key: "date", header: "Date",
      cell: (r) => <span className="text-sm text-slate-600">{new Date(r.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>,
    },
    { key: "category", header: "Category", cell: (r) => <CategoryBadge category={r.category} /> },
    {
      key: "description", header: "Description",
      cell: (r) => <span className="text-sm text-slate-700 max-w-[200px] truncate block">{r.description || "—"}</span>,
    },
    {
      key: "propertyId", header: "Property",
      cell: (r) => <span className="text-sm text-slate-600">{r.property?.name ?? "—"}</span>,
    },
    {
      key: "receivedFrom", header: "Received From",
      cell: (r) => <span className="text-sm text-slate-500">{r.receivedFrom ?? "—"}</span>,
    },
    {
      key: "amount", header: "Amount",
      cell: (r) => <span className="text-sm font-semibold text-emerald-700">UGX {r.amount.toLocaleString()}</span>,
    },
    {
      key: "id", header: "Actions",
      cell: (r) => (
        <div className="flex items-center gap-2">
          <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setDeleteTarget(r)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl px-8 py-8 text-white shadow-xl"
        style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0f2044 45%, #1a3a6e 100%)" }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative flex items-center justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-200">
              Finance
            </span>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Other Income</h1>
            <p className="text-sm text-blue-200">Record property income beyond rent — parking, laundry, carpet washing, and more.</p>
          </div>
          <button onClick={openAdd}
            className="flex items-center gap-2 rounded-xl bg-white/10 border border-white/20 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition-colors">
            <Plus className="h-4 w-4" /> Add Income
          </button>
        </div>
      </section>

      {/* KPI + Export row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-5 flex items-center gap-4 flex-1 min-w-[220px]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
              {filterFrom && filterTo ? `${filterFrom} — ${filterTo}` : "All time"} · Other Income
            </p>
            <p className="text-2xl font-bold text-emerald-800">UGX {monthTotal.toLocaleString()}</p>
          </div>
        </div>
        <button onClick={handleExport} disabled={filtered.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-300 bg-white text-emerald-700 text-sm font-semibold hover:bg-emerald-50 transition-colors disabled:opacity-40">
          <Download className="h-4 w-4" /> Export Excel
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <Calendar className="h-4 w-4 text-slate-400" />
          <span className="text-xs text-slate-400">From</span>
          <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)}
            className="text-sm text-slate-700 focus:outline-none" />
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <Calendar className="h-4 w-4 text-slate-400" />
          <span className="text-xs text-slate-400">To</span>
          <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)}
            className="text-sm text-slate-700 focus:outline-none" />
        </div>
        <button onClick={() => { setFilterFrom(new Date().toISOString().split("T")[0]); setFilterTo(new Date().toISOString().split("T")[0]); }}
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50">
          Today
        </button>
        <button onClick={() => { setFilterFrom(new Date().toISOString().slice(0,7) + "-01"); setFilterTo(new Date().toISOString().split("T")[0]); }}
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50">
          This Month
        </button>
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <Filter className="h-4 w-4 text-slate-400" />
          <select value={filterProperty} onChange={(e) => setFilterProperty(e.target.value)}
            className="text-sm text-slate-700 focus:outline-none bg-transparent">
            <option value="">All Properties</option>
            {properties.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-100 bg-emerald-50 px-6 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Income Records</p>
            <p className="text-xs text-slate-500">{filtered.length} entr{filtered.length === 1 ? "y" : "ies"} in selected range</p>
          </div>
        </div>
        {loadingData ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-400">
            <TrendingUp className="h-8 w-8 opacity-30" />
            <p className="text-sm">No income recorded for the selected period</p>
            <button onClick={openAdd} className="text-xs text-emerald-600 font-semibold hover:underline">+ Add first entry</button>
          </div>
        ) : (
          <DataTable columns={columns} data={filtered} />
        )}
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-800">{editTarget ? "Edit Income" : "Add Income Entry"}</h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">Date *</label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">Amount (UGX) *</label>
                  <MoneyInput value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">Category *</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={selCls}>
                  {DEFAULT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
                {form.category === "Other" && (
                  <Input placeholder="e.g. Parking, Carpet Washing, Advertising…"
                    value={customCategory} onChange={(e) => setCustomCategory(e.target.value)}
                    className="mt-2 border-[#E2E8F0] focus:border-[#1D4ED8] focus-visible:ring-[#1D4ED8]/10" />
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">Description</label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description of this income…" rows={2} className="resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">Received From</label>
                  <Input placeholder="Name or company" value={form.receivedFrom}
                    onChange={(e) => setForm({ ...form, receivedFrom: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">Reference No.</label>
                  <Input placeholder="Receipt / ref number" value={form.referenceNumber}
                    onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600 flex items-center gap-1"><Home className="h-3 w-3" /> Property</label>
                <select value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })} className={selCls}>
                  <option value="">— Not linked to a property —</option>
                  {properties.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {editTarget ? "Save Changes" : "Add Entry"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Delete Income Record?</p>
                <p className="text-xs text-slate-500">UGX {deleteTarget.amount.toLocaleString()} — {deleteTarget.category}</p>
              </div>
            </div>
            <p className="text-sm text-slate-600">This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 rounded-lg border border-slate-200 hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-60">
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default OtherIncomePage;
