import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Receipt, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

type ExpenseCategory = "Maintenance" | "Utilities" | "Insurance" | "Taxes" | "Cleaning" | "Repairs" | "Other";

interface Expense {
  id: number;
  date: string;
  amount: number;
  category: ExpenseCategory;
  description: string;
  property: string;
  unit: string;
  paidBy: string;
  receipt?: string;
}

const dummyExpenses: Expense[] = [
  { id: 1, date: "2025-05-02", amount: 85000, category: "Maintenance", description: "Plumbing repair in unit A1", property: "Sunset Apartments", unit: "A1", paidBy: "John Landlord", receipt: "receipt-001.pdf" },
  { id: 2, date: "2025-05-05", amount: 45000, category: "Cleaning", description: "Common area cleaning service", property: "Greenview Estate", unit: "All", paidBy: "Jane Manager" },
  { id: 3, date: "2025-05-08", amount: 120000, category: "Utilities", description: "Electricity bill for common areas", property: "Sunset Apartments", unit: "Common", paidBy: "John Landlord", receipt: "receipt-003.jpg" },
  { id: 4, date: "2025-04-15", amount: 200000, category: "Insurance", description: "Property insurance premium Q2", property: "Palm Court", unit: "All", paidBy: "John Landlord" },
  { id: 5, date: "2025-04-20", amount: 35000, category: "Repairs", description: "Door lock replacement B2", property: "Greenview Estate", unit: "B2", paidBy: "Jane Manager" },
  { id: 6, date: "2025-03-10", amount: 75000, category: "Taxes", description: "Local council tax Q1", property: "Sunset Apartments", unit: "All", paidBy: "John Landlord" },
];

const categories: ExpenseCategory[] = ["Maintenance", "Utilities", "Insurance", "Taxes", "Cleaning", "Repairs", "Other"];
const dummyProperties = ["Sunset Apartments", "Greenview Estate", "Palm Court"];
const dummyUnits = ["A1", "A2", "B1", "B2", "C1", "C2", "Common", "All"];

const categoryColors: Record<ExpenseCategory, string> = {
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
  property: "",
  unit: "",
  paidBy: "",
  receipt: "",
};

const ExpenseManagement = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>(dummyExpenses);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [deleteExpense, setDeleteExpense] = useState<Expense | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filtered = expenses.filter((e) => {
    const matchSearch =
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.property.toLowerCase().includes(search.toLowerCase()) ||
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
    setForm({ date: exp.date, amount: String(exp.amount), category: exp.category, description: exp.description, property: exp.property, unit: exp.unit, paidBy: exp.paidBy, receipt: exp.receipt || "" });
    setEditExpense(exp);
  };

  const handleSave = async () => {
    if (!form.date || !form.amount || !form.description || !form.paidBy) {
      toast({ title: "Validation Error", description: "Date, amount, description and paid by are required.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 600));

    if (editExpense) {
      setExpenses((prev) => prev.map((e) => e.id === editExpense.id ? { ...e, ...form, amount: Number(form.amount) } : e));
      toast({ title: "Expense Updated", description: "Expense record updated successfully." });
      setEditExpense(null);
    } else {
      setExpenses((prev) => [...prev, { id: Date.now(), ...form, amount: Number(form.amount) }]);
      toast({ title: "Expense Added", description: "New expense recorded successfully." });
      setAddOpen(false);
    }
    setIsSubmitting(false);
  };

  const handleDelete = () => {
    if (!deleteExpense) return;
    setExpenses((prev) => prev.filter((e) => e.id !== deleteExpense.id));
    toast({ title: "Expense Deleted", description: "Expense removed." });
    setDeleteExpense(null);
  };

  const formatUGX = (n: number) => `UGX ${n.toLocaleString()}`;

  const expenseColumns: Column<Expense>[] = [
    {
      key: 'date',
      header: 'Date',
      cell: (e) => new Date(e.date).toLocaleDateString(),
    },
    {
      key: 'category',
      header: 'Category',
      cell: (e) => (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${categoryColors[e.category]}`}>{e.category}</span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      className: 'max-w-[180px] truncate',
      cell: (e) => e.description,
    },
    {
      key: 'property',
      header: 'Property',
      cell: (e) => e.property,
    },
    {
      key: 'unit',
      header: 'Unit',
      cell: (e) => e.unit,
    },
    {
      key: 'amount',
      header: 'Amount',
      cell: (e) => <span className="font-medium">{formatUGX(e.amount)}</span>,
    },
    {
      key: 'paidBy',
      header: 'Paid By',
      cell: (e) => e.paidBy,
    },
    {
      key: 'receipt',
      header: 'Receipt',
      cell: (e) =>
        e.receipt ? (
          <span className="flex items-center gap-1 text-xs text-blue-600">
            <Receipt className="h-3 w-3" />{e.receipt}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">None</span>
        ),
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (e) => (
        <div className="flex items-center justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => openEdit(e)}><Pencil className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" onClick={() => setDeleteExpense(e)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
        </div>
      ),
    },
  ];

  const byCategory = categories.map((cat) => ({
    cat,
    total: expenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0),
  })).filter((c) => c.total > 0);

  return (
    <div className="space-y-6">

      {/* Page header */}
      <section className="page-hero">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-3">
            <span className="inline-flex w-fit items-center rounded-full bg-danger/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-danger">
              Expenses
            </span>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Expense Management</h1>
              <p className="mt-2 text-sm text-muted-foreground md:text-base">
                Track and manage property expenses with receipts.
              </p>
            </div>
          </div>
          <Button onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" />Add Expense
          </Button>
        </div>
      </section>

      {/* Summary cards */}
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
            transition={{ delay: 0.1 + i * 0.05 }}
            className="data-surface p-5">
            <p className="text-xs text-muted-foreground">{cat}</p>
            <p className="text-lg font-bold mt-1">{formatUGX(total)}</p>
          </motion.div>
        ))}
      </div>

      {/* Category breakdown */}
      <div className="data-surface p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="h-4 w-1 rounded-full bg-warning" />
          <h2 className="text-base font-semibold text-slate-950">By Category</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {byCategory.map(({ cat, total }) => (
            <div key={cat} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${categoryColors[cat]}`}>
              {cat}: {formatUGX(total)}
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
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
                <Select value={filterCategory} onValueChange={setFilterCategory}>
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
            </div>
          }
        />
        {filtered.length > 0 && (
          <div className="text-right text-sm font-medium border-t pt-3 mt-3">
            Period Total: <span className="text-danger font-bold">{formatUGX(totalFiltered)}</span>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
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
                <Select value={form.property} onValueChange={(v) => setForm({ ...form, property: v })}>
                  <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                  <SelectContent>{dummyProperties.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Unit</Label>
                <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                  <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
                  <SelectContent>{dummyUnits.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Receipt (optional)</Label>
              <Input placeholder="e.g. receipt-001.pdf or upload filename" value={form.receipt} onChange={(e) => setForm({ ...form, receipt: e.target.value })} />
              <p className="text-xs text-muted-foreground">API integration will enable file upload</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddOpen(false); setEditExpense(null); }}>Cancel</Button>
            <Button isLoading={isSubmitting} onClick={handleSave}>{editExpense ? "Save Changes" : "Add Expense"}</Button>
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
