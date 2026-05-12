import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Eye, Search, FileText, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type InvoiceStatus = "Paid" | "Pending" | "Overdue";
type InvoiceType = "Invoice" | "Manual Invoice" | "Manual Payment";

interface Invoice {
  id: number;
  invoiceNo: string;
  tenant: string;
  property: string;
  unit: string;
  amount: number;
  type: InvoiceType;
  status: InvoiceStatus;
  dueDate: string;
  generatedDate: string;
  createdBy: string;
  notes?: string;
}

const dummyInvoices: Invoice[] = [
  { id: 1, invoiceNo: "INV-2025-001", tenant: "John Mwangi", property: "Sunset Apartments", unit: "A1", amount: 300000, type: "Invoice", status: "Paid", dueDate: "2025-05-05", generatedDate: "2025-05-01", createdBy: "Admin" },
  { id: 2, invoiceNo: "INV-2025-002", tenant: "Sarah Nakato", property: "Greenview Estate", unit: "B1", amount: 450000, type: "Invoice", status: "Pending", dueDate: "2025-05-05", generatedDate: "2025-05-01", createdBy: "Admin" },
  { id: 3, invoiceNo: "INV-2025-003", tenant: "Peter Otieno", property: "Greenview Estate", unit: "B2", amount: 450000, type: "Invoice", status: "Overdue", dueDate: "2025-04-05", generatedDate: "2025-04-01", createdBy: "Admin" },
  { id: 4, invoiceNo: "MAN-2025-001", tenant: "Mary Auma", property: "Palm Court", unit: "C2", amount: 200000, type: "Manual Invoice", status: "Paid", dueDate: "2025-05-10", generatedDate: "2025-05-02", createdBy: "Landlord", notes: "Partial payment agreed" },
  { id: 5, invoiceNo: "PAY-2025-001", tenant: "John Mwangi", property: "Sunset Apartments", unit: "A1", amount: 50000, type: "Manual Payment", status: "Paid", dueDate: "2025-05-01", generatedDate: "2025-05-01", createdBy: "Landlord", notes: "Cash payment received" },
];

const dummyTenants = ["John Mwangi", "Sarah Nakato", "Peter Otieno", "Mary Auma"];
const dummyProperties = ["Sunset Apartments", "Greenview Estate", "Palm Court"];
const dummyUnits = ["A1", "A2", "B1", "B2", "C1", "C2"];

const emptyForm = {
  tenant: "", property: "", unit: "", amount: "",
  type: "Invoice" as InvoiceType, status: "Pending" as InvoiceStatus,
  dueDate: "", generatedDate: new Date().toISOString().split("T")[0],
  createdBy: "Admin", notes: "",
};

const statusBadge = (s: InvoiceStatus) => {
  const map = { Paid: "default", Pending: "secondary", Overdue: "destructive" } as const;
  const icon = { Paid: <CheckCircle className="h-3 w-3" />, Pending: <Clock className="h-3 w-3" />, Overdue: <AlertCircle className="h-3 w-3" /> };
  return <Badge variant={map[s]} className="flex items-center gap-1 w-fit">{icon[s]}{s}</Badge>;
};

const InvoiceManagement = () => {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>(dummyInvoices);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filtered = invoices.filter((inv) => {
    const matchSearch =
      inv.tenant.toLowerCase().includes(search.toLowerCase()) ||
      inv.invoiceNo.toLowerCase().includes(search.toLowerCase()) ||
      inv.property.toLowerCase().includes(search.toLowerCase());
    const matchTab =
      tab === "all" || inv.status.toLowerCase() === tab ||
      (tab === "manual" && inv.type !== "Invoice");
    return matchSearch && matchTab;
  });

  const openAdd = (type: InvoiceType = "Invoice") => {
    setForm({ ...emptyForm, type });
    setAddOpen(true);
  };

  const openEdit = (inv: Invoice) => {
    setForm({ tenant: inv.tenant, property: inv.property, unit: inv.unit, amount: String(inv.amount), type: inv.type, status: inv.status, dueDate: inv.dueDate, generatedDate: inv.generatedDate, createdBy: inv.createdBy, notes: inv.notes || "" });
    setEditInvoice(inv);
  };

  const handleSave = async () => {
    if (!form.tenant || !form.amount || !form.dueDate) {
      toast({ title: "Validation Error", description: "Tenant, amount and due date are required.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 600));

    if (editInvoice) {
      setInvoices((prev) => prev.map((inv) => inv.id === editInvoice.id ? { ...inv, ...form, amount: Number(form.amount) } : inv));
      toast({ title: "Invoice Updated", description: `${editInvoice.invoiceNo} updated.` });
      setEditInvoice(null);
    } else {
      const prefix = form.type === "Manual Payment" ? "PAY" : form.type === "Manual Invoice" ? "MAN" : "INV";
      const newNo = `${prefix}-2025-${String(invoices.length + 1).padStart(3, "0")}`;
      setInvoices((prev) => [...prev, { id: Date.now(), invoiceNo: newNo, ...form, amount: Number(form.amount) }]);
      toast({ title: "Invoice Created", description: `${newNo} created successfully.` });
      setAddOpen(false);
    }
    setIsSubmitting(false);
  };

  const formatUGX = (n: number) => `UGX ${n.toLocaleString()}`;
  const totalPaid = invoices.filter((i) => i.status === "Paid").reduce((s, i) => s + i.amount, 0);
  const totalPending = invoices.filter((i) => i.status === "Pending").reduce((s, i) => s + i.amount, 0);
  const totalOverdue = invoices.filter((i) => i.status === "Overdue").reduce((s, i) => s + i.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground mt-1">Create, view and manage tenant invoices and payments</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => openAdd("Manual Payment")}>
            <Plus className="mr-2 h-4 w-4" />Manual Payment
          </Button>
          <Button variant="outline" onClick={() => openAdd("Manual Invoice")}>
            <FileText className="mr-2 h-4 w-4" />Manual Invoice
          </Button>
          <Button onClick={() => openAdd("Invoice")}>
            <Plus className="mr-2 h-4 w-4" />New Invoice
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Invoices", value: invoices.length, color: "text-blue-600" },
          { label: "Collected", value: formatUGX(totalPaid), color: "text-green-600" },
          { label: "Pending", value: formatUGX(totalPending), color: "text-amber-600" },
          { label: "Overdue", value: formatUGX(totalOverdue), color: "text-red-600" },
        ].map((s) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-xl p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-lg font-bold mt-1 ${s.color}`}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="glass-card rounded-xl p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="paid">Paid</TabsTrigger>
              <TabsTrigger value="overdue">Overdue</TabsTrigger>
              <TabsTrigger value="manual">Manual</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search invoice, tenant..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice No.</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No invoices found</TableCell></TableRow>
              ) : (
                filtered.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.invoiceNo}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{inv.type}</Badge></TableCell>
                    <TableCell>{inv.tenant}</TableCell>
                    <TableCell>{inv.unit} — {inv.property}</TableCell>
                    <TableCell className="font-medium">{formatUGX(inv.amount)}</TableCell>
                    <TableCell>{new Date(inv.dueDate).toLocaleDateString()}</TableCell>
                    <TableCell>{statusBadge(inv.status)}</TableCell>
                    <TableCell>{inv.createdBy}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setViewInvoice(inv)}><Eye className="h-4 w-4" /></Button>
                        <Button size="sm" variant="outline" onClick={() => openEdit(inv)}><Pencil className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={addOpen || !!editInvoice} onOpenChange={(o) => { if (!o) { setAddOpen(false); setEditInvoice(null); } }}>
        <DialogContent className="sm:max-w-lg rounded-[20px]">
          <DialogHeader>
            <DialogTitle>{editInvoice ? "Edit Invoice" : `New ${form.type}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v: InvoiceType) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Invoice">Invoice</SelectItem>
                    <SelectItem value="Manual Invoice">Manual Invoice</SelectItem>
                    <SelectItem value="Manual Payment">Manual Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v: InvoiceStatus) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Tenant *</Label>
                <Select value={form.tenant} onValueChange={(v) => setForm({ ...form, tenant: v })}>
                  <SelectTrigger><SelectValue placeholder="Select tenant" /></SelectTrigger>
                  <SelectContent>{dummyTenants.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Property</Label>
                <Select value={form.property} onValueChange={(v) => setForm({ ...form, property: v })}>
                  <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                  <SelectContent>{dummyProperties.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Unit</Label>
                <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                  <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
                  <SelectContent>{dummyUnits.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Amount (UGX) *</Label>
                <Input type="number" placeholder="e.g. 300000" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Invoice Date *</Label>
                <Input type="date" value={form.generatedDate} onChange={(e) => setForm({ ...form, generatedDate: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Due Date *</Label>
                <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Created By</Label>
              <Input value={form.createdBy} onChange={(e) => setForm({ ...form, createdBy: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Notes (optional)</Label>
              <Textarea placeholder="Additional notes..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddOpen(false); setEditInvoice(null); }}>Cancel</Button>
            <Button isLoading={isSubmitting} onClick={handleSave}>{editInvoice ? "Save Changes" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog open={!!viewInvoice} onOpenChange={(o) => !o && setViewInvoice(null)}>
        <DialogContent className="sm:max-w-sm rounded-[20px]">
          <DialogHeader><DialogTitle>Invoice Details</DialogTitle></DialogHeader>
          {viewInvoice && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Invoice No.</span><span className="font-semibold">{viewInvoice.invoiceNo}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Type</span><Badge variant="outline">{viewInvoice.type}</Badge></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tenant</span><span>{viewInvoice.tenant}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Property</span><span>{viewInvoice.property}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Unit</span><span>{viewInvoice.unit}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-semibold text-primary">UGX {viewInvoice.amount.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Invoice Date</span><span>{new Date(viewInvoice.generatedDate).toLocaleDateString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Due Date</span><span>{new Date(viewInvoice.dueDate).toLocaleDateString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span>{statusBadge(viewInvoice.status)}</div>
              <div className="flex justify-between"><span className="text-muted-foreground">Created By</span><span>{viewInvoice.createdBy}</span></div>
              {viewInvoice.notes && <div className="pt-2 border-t"><span className="text-muted-foreground">Notes: </span>{viewInvoice.notes}</div>}
            </div>
          )}
          <DialogFooter><Button onClick={() => setViewInvoice(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoiceManagement;
