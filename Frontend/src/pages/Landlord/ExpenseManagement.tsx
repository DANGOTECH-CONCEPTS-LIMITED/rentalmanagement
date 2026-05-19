import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Receipt, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { DataTable, Column } from "@/components/ui/data-table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

const categoryColors: Record<string, string> = {
  Maintenance: "bg-blue-100 text-blue-700",
  Utilities: "bg-yellow-100 text-yellow-700",
  Insurance: "bg-purple-100 text-purple-700",
  Taxes: "bg-red-100 text-red-700",
  Cleaning: "bg-green-100 text-green-700",
  Repairs: "bg-orange-100 text-orange-700",
  Other: "bg-gray-100 text-gray-700",
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
      } catch {
        // silent
      }
    };

    const fetchUnits = async () => {
      try {
        const { data } = await axios.get<PropertyUnit[]>(`${apiUrl}/GetPropertyUnitsByLandLordId/${userData.id}`);
        setUnits(data);
      } catch {
        // silent
      }
    };

    fetchProperties();
    fetchUnits();
  }, []);

  const propertyName = (id?: number) => id ? (properties.find((p) => p.id === id)?.name ?? `Property #${id}`) : "—";
  const unitName = (id?: number) => id ? (units.find((u) => u.id === id)?.unitNumber ?? `Unit #${id}`) : "—";
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
      PropertyId: form.propertyId ? Number(form.propertyId) : null,
      PropertyUnitId: form.propertyUnitId ? Number(form.propertyUnitId) : null,
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

  const byCategory = categories.map((cat) => ({
    cat,
    total: expenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0),
  })).filter((c) => c.total > 0);

  const expenseColumns: Column<Expense>[] = [
    { key: "date", header: "Date", cell: (e) => new Date(e.date).toLocaleDateString() },
    {
      key: "category", header: "Category",
      cell: (e) => <span className={`px-2 py-0.5 rounded text-xs font-medium ${categoryColors[e.category] || categoryColors.Other}`}>{e.category}</span>,
    },
    { key: "description", header: "Description", className: "max-w-[180px] truncate", cell: (e) => e.description },
    { key: "property", header: "Property", cell: (e) => propertyName(e.propertyId) },
    { key: "unit", header: "Unit", cell: (e) => unitName(e.propertyUnitId) },
    { key: "amount", header: "Amount", cell: (e) => <span className="font-medium">{formatUGX(e.amount)}</span> },
    { key: "paidBy", header: "Paid By", cell: (e) => e.paidBy },
    {
      key: "receipt", header: "Receipt",
      cell: (e) => e.receiptReference
        ? <span className="flex items-center gap-1 text-xs text-blue-600"><Receipt className="h-3 w-3" />{e.receiptReference}</span>
        : <span className="text-muted-foreground text-xs">None</span>,
    },
    {
      key: "actions", header: "Actions", headerClassName: "text-right", className: "text-right",
      cell: (e) => (
        <div className="flex items-center justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => openEdit(e)}><Pencil className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" onClick={() => setDeleteExpense(e)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <section className="page-hero">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-3">
            <span className="inline-flex w-fit items-center rounded-full bg-danger/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-danger">
              Expenses
            </span>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Expense Management</h1>
              <p className="mt-2 text-sm text-muted-foreground md:text-base">Track and manage property expenses with receipts.</p>
            </div>
          </div>
          <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add Expense</Button>
        </div>
      </section>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="data-surface p-5 col-span-2 sm:col-span-1">
          <p className="text-xs text-muted-foreground">Total Expenses (All)</p>
          <p className="text-xl font-bold text-danger mt-1">{formatUGX(totalAll)}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="data-surface p-5 col-span-2 sm:col-span-1">
          <p className="text-xs text-muted-foreground">Filtered Period</p>
          <p className="text-xl font-bold text-warning mt-1">{formatUGX(totalFiltered)}</p>
        </motion.div>
        {byCategory.slice(0, 2).map(({ cat, total }, i) => (
          <motion.div key={cat} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }} className="data-surface p-5">
            <p className="text-xs text-muted-foreground">{cat}</p>
            <p className="text-lg font-bold mt-1">{formatUGX(total)}</p>
          </motion.div>
        ))}
      </div>

      {byCategory.length > 0 && (
        <div className="data-surface p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-4 w-1 rounded-full bg-warning" />
            <h2 className="text-base font-semibold text-slate-950">By Category</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {byCategory.map(({ cat, total }) => (
              <div key={cat} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${categoryColors[cat] || categoryColors.Other}`}>
                {cat}: {formatUGX(total)}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="data-surface p-6">
        <div className="mb-4 flex items-center gap-2">
          <span className="h-4 w-1 rounded-full bg-danger" />
          <h2 className="text-base font-semibold text-slate-950">Expense Records</h2>
        </div>
        <DataTable
          data={filtered}
          columns={expenseColumns}
          loading={isLoading}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search description, property..."
          label="expense"
          pageSize={10}
          emptyMessage="No expenses found"
          emptyIcon={<Receipt className="h-12 w-12" />}
          headerRight={
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v); }}>
                  <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Categories</SelectItem>
                    {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">From</Label>
                <Input type="date" className="w-36 h-9" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">To</Label>
                <Input type="date" className="w-36 h-9" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
              </div>
              <Button size="sm" onClick={fetchExpenses}>Apply</Button>
            </div>
          }
        />
        {filtered.length > 0 && (
          <div className="text-right text-sm font-medium border-t pt-3 mt-3">
            Period Total: <span className="text-danger font-bold">{formatUGX(totalFiltered)}</span>
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={addOpen || !!editExpense} onOpenChange={(o) => { if (!o) { setAddOpen(false); setEditExpense(null); } }}>
        <DialogContent className="sm:max-w-lg rounded-[20px]">
          <DialogHeader>
            <DialogTitle>{editExpense ? "Edit Expense" : "Add Expense"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Date *</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Amount (UGX) *</Label>
                <Input type="number" placeholder="e.g. 85000" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={(v: ExpenseCategory) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Paid By *</Label>
                <Input placeholder="e.g. John Landlord" value={form.paidBy} onChange={(e) => setForm({ ...form, paidBy: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Description *</Label>
              <Textarea placeholder="Describe the expense..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Property</Label>
                <Select value={form.propertyId} onValueChange={(v) => setForm({ ...form, propertyId: v, propertyUnitId: "" })}>
                  <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {properties.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {form.propertyId && form.propertyId !== "none" && unitsForProperty(form.propertyId).length > 0 && (
                <div className="space-y-1">
                  <Label>Unit</Label>
                  <Select value={form.propertyUnitId} onValueChange={(v) => setForm({ ...form, propertyUnitId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {unitsForProperty(form.propertyId).map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>{u.unitNumber}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label>Receipt Reference (optional)</Label>
              <Input placeholder="e.g. REC-001 or receipt number" value={form.receiptReference} onChange={(e) => setForm({ ...form, receiptReference: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddOpen(false); setEditExpense(null); }}>Cancel</Button>
            <Button disabled={isSubmitting} onClick={handleSave}>{editExpense ? "Save Changes" : "Add Expense"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteExpense} onOpenChange={(o) => !o && setDeleteExpense(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense record? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ExpenseManagement;
