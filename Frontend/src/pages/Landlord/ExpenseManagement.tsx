import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Plus, Pencil, Trash2, Receipt, Filter, Loader2, X, AlertTriangle,
  Calendar, Home, DoorOpen, User, TrendingDown, Tag,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { DataTable, Column } from "@/components/ui/data-table";
import axios from "axios";

type ExpenseCategory = "Maintenance" | "Utilities" | "Insurance" | "Taxes" | "Cleaning" | "Repairs" | "Other";

interface Expense {
  id: number;
  date: string;
  amount: number;
  category: string;
  description: string;
  paidBy: string;
  ownerId: number;
  propertyId?: number;
  propertyUnitId?: number;
  receiptReference?: string;
  createdAt?: string;
}

interface Property {
  id: number;
  name: string;
}

interface PropertyUnit {
  id: number;
  unitNumber: string;
  propertyId: number;
}

const categories: ExpenseCategory[] = ["Maintenance", "Utilities", "Insurance", "Taxes", "Cleaning", "Repairs", "Other"];

const categoryStyle: Record<string, { pill: string; border: string; bg: string; color: string }> = {
  Maintenance: { pill: "bg-blue-50 text-blue-700 border-blue-200",   border: "border-l-blue-500",   bg: "bg-blue-50",   color: "text-blue-600"   },
  Utilities:   { pill: "bg-amber-50 text-amber-700 border-amber-200", border: "border-l-amber-500",  bg: "bg-amber-50",  color: "text-amber-600"  },
  Insurance:   { pill: "bg-purple-50 text-purple-700 border-purple-200", border: "border-l-purple-500", bg: "bg-purple-50", color: "text-purple-600" },
  Taxes:       { pill: "bg-red-50 text-red-700 border-red-200",       border: "border-l-red-500",    bg: "bg-red-50",    color: "text-red-600"    },
  Cleaning:    { pill: "bg-emerald-50 text-emerald-700 border-emerald-200", border: "border-l-emerald-500", bg: "bg-emerald-50", color: "text-emerald-600" },
  Repairs:     { pill: "bg-orange-50 text-orange-700 border-orange-200", border: "border-l-orange-500", bg: "bg-orange-50", color: "text-orange-600" },
  Other:       { pill: "bg-slate-50 text-slate-600 border-slate-200", border: "border-l-slate-400",  bg: "bg-slate-50",  color: "text-slate-500"  },
};

const emptyForm = {
  date: new Date().toISOString().split("T")[0],
  amount: "",
  category: "Maintenance" as ExpenseCategory,
  description: "",
  propertyId: "",
  propertyUnitId: "",
  paidBy: "",
  receiptReference: "",
};

const selCls =
  "w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 transition-colors";

const CategoryBadge = ({ category }: { category: string }) => {
  const s = categoryStyle[category] ?? categoryStyle.Other;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${s.pill}`}>
      <Tag className="h-2.5 w-2.5" />
      {category}
    </span>
  );
};

const ExpenseManagement = () => {
  const { toast } = useToast();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const userData = JSON.parse(localStorage.getItem("user") || "{}");

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<PropertyUnit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [deleteExpense, setDeleteExpense] = useState<Expense | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      const body: Record<string, unknown> = { OwnerId: userData.id };
      if (filterCategory !== "All") body.Category = filterCategory;
      if (filterFrom) body.From = new Date(filterFrom).toISOString();
      if (filterTo) body.To = new Date(filterTo).toISOString();
      if (search) body.Search = search;
      const { data } = await axios.post<Expense[]>(`${apiUrl}/GetExpenses`, body);
      setExpenses(data);
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data || "Failed to load expenses.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();

    const fetchProperties = async () => {
      try {
        const { data } = await axios.get<Property[]>(`${apiUrl}/GetPropertiesByLandLordId/${userData.id}`);
        setProperties(data);
      } catch { /* silent */ }
    };

    const fetchUnits = async () => {
      try {
        const { data } = await axios.get<PropertyUnit[]>(`${apiUrl}/GetPropertyUnitsByLandLordId/${userData.id}`);
        setUnits(data);
      } catch { /* silent */ }
    };

    fetchProperties();
    fetchUnits();
  }, []);

  const propertyName = (id?: number) =>
    id ? (properties.find((p) => p.id === id)?.name ?? `Property #${id}`) : "—";
  const unitName = (id?: number) =>
    id ? (units.find((u) => u.id === id)?.unitNumber ?? `Unit #${id}`) : "—";
  const unitsForProperty = (propertyId: string) =>
    units.filter((u) => u.propertyId === Number(propertyId));

  const filtered = expenses.filter((e) => {
    const matchSearch =
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      propertyName(e.propertyId).toLowerCase().includes(search.toLowerCase()) ||
      e.paidBy.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === "All" || e.category === filterCategory;
    const matchFrom = !filterFrom || e.date >= filterFrom;
    const matchTo = !filterTo || e.date <= filterTo;
    return matchSearch && matchCat && matchFrom && matchTo;
  });

  const totalFiltered = filtered.reduce((s, e) => s + e.amount, 0);
  const totalAll = expenses.reduce((s, e) => s + e.amount, 0);

  const openAdd = () => { setForm(emptyForm); setAddOpen(true); };
  const openEdit = (exp: Expense) => {
    setForm({
      date: exp.date.split("T")[0],
      amount: String(exp.amount),
      category: exp.category as ExpenseCategory,
      description: exp.description,
      propertyId: exp.propertyId ? String(exp.propertyId) : "",
      propertyUnitId: exp.propertyUnitId ? String(exp.propertyUnitId) : "",
      paidBy: exp.paidBy,
      receiptReference: exp.receiptReference || "",
    });
    setEditExpense(exp);
  };

  const handleSave = async () => {
    if (!form.date || !form.amount || !form.description || !form.paidBy) {
      toast({ title: "Validation Error", description: "Date, amount, description and paid by are required.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const body = {
      Date: new Date(form.date).toISOString(),
      Amount: Number(form.amount),
      Category: form.category,
      PaidBy: form.paidBy,
      Description: form.description,
      OwnerId: userData.id,
      PropertyId: form.propertyId && form.propertyId !== "none" ? Number(form.propertyId) : null,
      PropertyUnitId: form.propertyUnitId && form.propertyUnitId !== "none" ? Number(form.propertyUnitId) : null,
      ReceiptReference: form.receiptReference || null,
    };
    try {
      if (editExpense) {
        await axios.put(`${apiUrl}/UpdateExpense/${editExpense.id}`, body);
        toast({ title: "Expense Updated", description: "Expense updated successfully." });
        setEditExpense(null);
      } else {
        await axios.post(`${apiUrl}/AddExpense`, body);
        toast({ title: "Expense Added", description: "Expense recorded successfully." });
        setAddOpen(false);
      }
      fetchExpenses();
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data || "Operation failed.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteExpense) return;
    try {
      await axios.delete(`${apiUrl}/DeleteExpense/${deleteExpense.id}`);
      toast({ title: "Expense Deleted", description: "Expense removed." });
      setDeleteExpense(null);
      fetchExpenses();
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data || "Delete failed.", variant: "destructive" });
    }
  };

  const formatUGX = (n: number) => `UGX ${n.toLocaleString()}`;

  const byCategory = categories
    .map((cat) => ({ cat, total: expenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0) }))
    .filter((c) => c.total > 0);

  const expenseColumns: Column<Expense>[] = [
    {
      key: "date",
      header: "Date",
      cell: (e) => (
        <div className="flex items-center gap-1.5 text-sm text-slate-600">
          <Calendar className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
          {new Date(e.date).toLocaleDateString()}
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      cell: (e) => <CategoryBadge category={e.category} />,
    },
    {
      key: "description",
      header: "Description",
      className: "max-w-[180px]",
      cell: (e) => (
        <span className="text-sm text-[#0F172A] truncate block max-w-[180px]" title={e.description}>
          {e.description}
        </span>
      ),
    },
    {
      key: "property",
      header: "Property",
      cell: (e) => (
        <div className="flex items-center gap-1.5 text-sm text-[#0F172A]">
          <Home className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
          {propertyName(e.propertyId)}
        </div>
      ),
    },
    {
      key: "unit",
      header: "Unit",
      cell: (e) => (
        <div className="flex items-center gap-1.5 text-sm text-slate-600">
          <DoorOpen className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
          {unitName(e.propertyUnitId)}
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      headerClassName: "text-right",
      className: "text-right",
      cell: (e) => <span className="font-semibold text-red-600">{formatUGX(e.amount)}</span>,
    },
    {
      key: "paidBy",
      header: "Paid By",
      cell: (e) => (
        <div className="flex items-center gap-1.5 text-sm text-[#0F172A]">
          <User className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
          {e.paidBy}
        </div>
      ),
    },
    {
      key: "receipt",
      header: "Receipt",
      cell: (e) =>
        e.receiptReference ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <Receipt className="h-3 w-3" />
            {e.receiptReference}
          </span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "text-right",
      className: "text-right",
      cell: (e) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => openEdit(e)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-[#1D4ED8] transition-colors"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => setDeleteExpense(e)}
            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const FormBody = () => (
    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-wider text-slate-400 font-medium">Date *</label>
          <Input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="border-[#E2E8F0] focus:border-[#1D4ED8] focus-visible:ring-[#1D4ED8]/10"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-wider text-slate-400 font-medium">Amount (UGX) *</label>
          <Input
            type="number"
            placeholder="e.g. 85000"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="border-[#E2E8F0] focus:border-[#1D4ED8] focus-visible:ring-[#1D4ED8]/10"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-wider text-slate-400 font-medium">Category *</label>
          <select
            className={selCls}
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}
          >
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-wider text-slate-400 font-medium">Paid By *</label>
          <Input
            placeholder="e.g. John Landlord"
            value={form.paidBy}
            onChange={(e) => setForm({ ...form, paidBy: e.target.value })}
            className="border-[#E2E8F0] focus:border-[#1D4ED8] focus-visible:ring-[#1D4ED8]/10"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs uppercase tracking-wider text-slate-400 font-medium">Description *</label>
        <Textarea
          placeholder="Describe the expense..."
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={2}
          className="border-[#E2E8F0] focus:border-[#1D4ED8] focus-visible:ring-[#1D4ED8]/10 resize-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-wider text-slate-400 font-medium">Property</label>
          <select
            className={selCls}
            value={form.propertyId}
            onChange={(e) => setForm({ ...form, propertyId: e.target.value, propertyUnitId: "" })}
          >
            <option value="">None</option>
            {properties.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
          </select>
        </div>
        {form.propertyId && form.propertyId !== "none" && unitsForProperty(form.propertyId).length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-slate-400 font-medium">Unit</label>
            <select
              className={selCls}
              value={form.propertyUnitId}
              onChange={(e) => setForm({ ...form, propertyUnitId: e.target.value })}
            >
              <option value="">None</option>
              {unitsForProperty(form.propertyId).map((u) => (
                <option key={u.id} value={String(u.id)}>{u.unitNumber}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="space-y-1.5">
        <label className="text-xs uppercase tracking-wider text-slate-400 font-medium">Receipt Reference (optional)</label>
        <Input
          placeholder="e.g. REC-001 or receipt number"
          value={form.receiptReference}
          onChange={(e) => setForm({ ...form, receiptReference: e.target.value })}
          className="border-[#E2E8F0] focus:border-[#1D4ED8] focus-visible:ring-[#1D4ED8]/10"
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative rounded-2xl overflow-hidden p-6 md:p-8" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0f2044 45%, #1a3a6e 100%)" }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-4 right-32 h-24 w-24 rounded-full bg-blue-300/10 blur-xl" />
        </div>
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
                <TrendingDown className="h-4 w-4 text-white" />
              </div>
              <span className="text-blue-200 text-sm font-medium">Expenses</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Expense Management</h1>
            <p className="text-blue-200 text-sm mt-1">Track and manage property expenses with receipts.</p>
          </div>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-[#1D4ED8] text-sm font-semibold hover:bg-blue-50 transition-colors shadow-lg self-start md:self-auto"
          >
            <Plus className="h-4 w-4" />Add Expense
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-[#E2E8F0] border-l-4 border-l-red-500 p-4 flex items-center gap-3 col-span-2 sm:col-span-1"
        >
          <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
            <TrendingDown className="h-5 w-5 text-red-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500">Total Expenses</p>
            <p className="text-base font-bold text-red-600 mt-0.5 truncate">{formatUGX(totalAll)}</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-white rounded-xl border border-[#E2E8F0] border-l-4 border-l-amber-500 p-4 flex items-center gap-3 col-span-2 sm:col-span-1"
        >
          <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Filter className="h-5 w-5 text-amber-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500">Filtered Period</p>
            <p className="text-base font-bold text-amber-600 mt-0.5 truncate">{formatUGX(totalFiltered)}</p>
          </div>
        </motion.div>

        {byCategory.slice(0, 2).map(({ cat, total }, i) => {
          const s = categoryStyle[cat] ?? categoryStyle.Other;
          return (
            <motion.div
              key={cat}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
              className={`bg-white rounded-xl border border-[#E2E8F0] border-l-4 ${s.border} p-4 flex items-center gap-3`}
            >
              <div className={`h-10 w-10 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
                <Tag className={`h-5 w-5 ${s.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500">{cat}</p>
                <p className={`text-base font-bold mt-0.5 truncate ${s.color}`}>{formatUGX(total)}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Category Breakdown */}
      {byCategory.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <Tag className="h-4 w-4 text-slate-500" />
            </div>
            <h2 className="text-sm font-semibold text-[#0F172A]">By Category</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {byCategory.map(({ cat, total }) => {
              const s = categoryStyle[cat] ?? categoryStyle.Other;
              return (
                <div
                  key={cat}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border ${s.pill}`}
                >
                  <span className="font-semibold">{cat}:</span>
                  <span>{formatUGX(total)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expense Table */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-4">
        <DataTable
          data={filtered}
          columns={expenseColumns}
          loading={isLoading}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search description, property, paid by..."
          label="expense"
          pageSize={10}
          emptyMessage="No expenses found"
          emptyIcon={<Receipt className="h-12 w-12" />}
          headerRight={
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                <select
                  className="rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#1D4ED8] transition-colors"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value="All">All Categories</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 whitespace-nowrap">From</span>
                <Input
                  type="date"
                  className="w-32 h-8 text-xs border-[#E2E8F0] focus:border-[#1D4ED8] focus-visible:ring-[#1D4ED8]/10"
                  value={filterFrom}
                  onChange={(e) => setFilterFrom(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 whitespace-nowrap">To</span>
                <Input
                  type="date"
                  className="w-32 h-8 text-xs border-[#E2E8F0] focus:border-[#1D4ED8] focus-visible:ring-[#1D4ED8]/10"
                  value={filterTo}
                  onChange={(e) => setFilterTo(e.target.value)}
                />
              </div>
              <button
                onClick={fetchExpenses}
                className="btn-grid px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1D4ED8] text-white hover:bg-blue-700 transition-colors"
              >
                Apply
              </button>
            </div>
          }
        />
        {filtered.length > 0 && (
          <div className="text-right text-sm font-medium border-t border-[#E2E8F0] pt-3 mt-3">
            Period Total:{" "}
            <span className="text-red-600 font-bold">{formatUGX(totalFiltered)}</span>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {(addOpen || !!editExpense) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => { setAddOpen(false); setEditExpense(null); }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
          >
            <div className="bg-gradient-to-r from-[#0F172A] to-[#1D4ED8] px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {editExpense ? "Edit Expense" : "Add Expense"}
                </h2>
                <p className="text-blue-200 text-xs mt-0.5">
                  {editExpense ? "Update the expense details" : "Record a new expense"}
                </p>
              </div>
              <button
                onClick={() => { setAddOpen(false); setEditExpense(null); }}
                className="text-white/60 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <FormBody />
            <div className="px-6 py-4 border-t border-[#E2E8F0] flex justify-end gap-3">
              <button
                onClick={() => { setAddOpen(false); setEditExpense(null); }}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-[#E2E8F0] text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSubmitting}
                className="btn-grid inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#1D4ED8] text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editExpense ? "Save Changes" : "Add Expense"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation */}
      {!!deleteExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteExpense(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
          >
            <div className="bg-gradient-to-r from-red-600 to-red-500 px-6 py-4 flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-white flex-shrink-0" />
              <div>
                <h2 className="text-lg font-bold text-white">Delete Expense</h2>
                <p className="text-red-100 text-xs mt-0.5">This action is permanent</p>
              </div>
            </div>
            <div className="p-6">
              <p className="text-slate-600 text-sm">
                Are you sure you want to delete this expense record? This cannot be undone.
              </p>
              {deleteExpense && (
                <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-[#E2E8F0] text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Amount</span>
                    <span className="font-semibold text-red-600">{formatUGX(deleteExpense.amount)}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-slate-500">Category</span>
                    <CategoryBadge category={deleteExpense.category} />
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-[#E2E8F0] flex justify-end gap-3">
              <button
                onClick={() => setDeleteExpense(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-[#E2E8F0] text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="btn-grid px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Delete Expense
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ExpenseManagement;
