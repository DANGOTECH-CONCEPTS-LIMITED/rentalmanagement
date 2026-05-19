import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Eye, FileText, CheckCircle, Clock, AlertCircle } from "lucide-react";
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, Column } from "@/components/ui/data-table";
import axios from "axios";

type InvoiceStatus = "Paid" | "Pending" | "Overdue";
type InvoiceType = "Invoice" | "Manual Invoice" | "Manual Payment";

interface Invoice {
  id: number;
  invoiceNumber: string;
  type: string;
  status: string;
  tenantId: number;
  propertyId: number;
  propertyUnitId?: number;
  amount: number;
  invoiceDate: string;
  dueDate: string;
  notes?: string;
  createdByUserId: number;
  createdAt: string;
}

interface Tenant {
  id: number;
  fullName: string;
  propertyId: number;
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

const getLoggedInUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};

const statusBadge = (s: string) => {
  if (s === "Paid") return <Badge variant="default" className="flex items-center gap-1 w-fit"><CheckCircle className="h-3 w-3" />Paid</Badge>;
  if (s === "Overdue") return <Badge variant="destructive" className="flex items-center gap-1 w-fit"><AlertCircle className="h-3 w-3" />Overdue</Badge>;
  return <Badge variant="secondary" className="flex items-center gap-1 w-fit"><Clock className="h-3 w-3" />Pending</Badge>;
};

const InvoiceManagement = () => {
  const { toast } = useToast();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const userData = getLoggedInUser();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<PropertyUnit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [updateStatusInvoice, setUpdateStatusInvoice] = useState<Invoice | null>(null);
  const [newStatus, setNewStatus] = useState<InvoiceStatus>("Pending");
  const [form, setForm] = useState({
    type: "Invoice" as InvoiceType,
    status: "Pending" as InvoiceStatus,
    tenantId: "",
    propertyId: "",
    propertyUnitId: "",
    amount: "",
    invoiceDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get<Invoice[]>(`${apiUrl}/GetInvoicesByLandLordId/${userData.id}`);
      setInvoices(data);
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data || "Failed to load invoices.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();

    const fetchTenants = async () => {
      try {
        const { data } = await axios.get<Tenant[]>(`${apiUrl}/GetAllTenants`);
        setTenants(data.filter((t: any) => t?.property?.ownerId === userData.id));
      } catch {
        // silent
      }
    };

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

    fetchTenants();
    fetchProperties();
    fetchUnits();
  }, []);

  const tenantName = (id: number) => tenants.find((t) => t.id === id)?.fullName ?? `Tenant #${id}`;
  const propertyName = (id: number) => properties.find((p) => p.id === id)?.name ?? `Property #${id}`;
  const unitName = (id?: number) => id ? (units.find((u) => u.id === id)?.unitNumber ?? `Unit #${id}`) : "—";

  const unitsForProperty = (propertyId: string) =>
    units.filter((u) => u.propertyId === Number(propertyId));

  const filtered = invoices.filter((inv) => {
    const matchSearch =
      tenantName(inv.tenantId).toLowerCase().includes(search.toLowerCase()) ||
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      propertyName(inv.propertyId).toLowerCase().includes(search.toLowerCase());
    const matchTab =
      tab === "all" ||
      inv.status.toLowerCase() === tab ||
      (tab === "manual" && inv.type !== "Invoice");
    return matchSearch && matchTab;
  });

  const openAdd = (type: InvoiceType = "Invoice") => {
    setForm({
      type,
      status: "Pending",
      tenantId: "",
      propertyId: "",
      propertyUnitId: "",
      amount: "",
      invoiceDate: new Date().toISOString().split("T")[0],
      dueDate: "",
      notes: "",
    });
    setAddOpen(true);
  };

  const handleCreate = async () => {
    if (!form.tenantId || !form.propertyId || !form.amount || !form.dueDate) {
      toast({ title: "Validation Error", description: "Tenant, property, amount and due date are required.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const body = {
        Type: form.type,
        Status: form.status,
        TenantId: Number(form.tenantId),
        PropertyId: Number(form.propertyId),
        PropertyUnitId: form.propertyUnitId ? Number(form.propertyUnitId) : null,
        Amount: Number(form.amount),
        InvoiceDate: new Date(form.invoiceDate).toISOString(),
        DueDate: new Date(form.dueDate).toISOString(),
        Notes: form.notes || null,
        CreatedByUserId: userData.id,
        CreatedByName: userData.fullName || "",
      };
      await axios.post(`${apiUrl}/CreateTenantInvoice`, body);
      toast({ title: "Invoice Created", description: "Invoice created successfully." });
      setAddOpen(false);
      fetchInvoices();
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data || "Failed to create invoice.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!updateStatusInvoice) return;
    setIsSubmitting(true);
    try {
      await axios.put(`${apiUrl}/UpdateInvoiceStatus/${updateStatusInvoice.id}`, { Status: newStatus });
      toast({ title: "Status Updated", description: `Invoice marked as ${newStatus}.` });
      setUpdateStatusInvoice(null);
      fetchInvoices();
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data || "Failed to update status.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatUGX = (n: number) => `UGX ${n.toLocaleString()}`;
  const totalPaid = invoices.filter((i) => i.status === "Paid").reduce((s, i) => s + i.amount, 0);
  const totalPending = invoices.filter((i) => i.status === "Pending").reduce((s, i) => s + i.amount, 0);
  const totalOverdue = invoices.filter((i) => i.status === "Overdue").reduce((s, i) => s + i.amount, 0);

  const invoiceCols: Column<Invoice>[] = [
    { key: "no", header: "Invoice No.", cell: (i) => <span className="font-medium">{i.invoiceNumber}</span> },
    { key: "type", header: "Type", cell: (i) => <Badge variant="outline" className="text-xs">{i.type}</Badge> },
    { key: "tenant", header: "Tenant", cell: (i) => tenantName(i.tenantId) },
    { key: "property", header: "Property / Unit", cell: (i) => `${propertyName(i.propertyId)} ${i.propertyUnitId ? `— ${unitName(i.propertyUnitId)}` : ""}` },
    { key: "amount", header: "Amount", cell: (i) => <span className="font-medium">{formatUGX(i.amount)}</span> },
    { key: "due", header: "Due Date", cell: (i) => new Date(i.dueDate).toLocaleDateString() },
    { key: "status", header: "Status", cell: (i) => statusBadge(i.status) },
    {
      key: "actions", header: "Actions", headerClassName: "text-right", className: "text-right",
      cell: (i) => (
        <div className="flex items-center justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => setViewInvoice(i)}><Eye className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" onClick={() => { setUpdateStatusInvoice(i); setNewStatus(i.status as InvoiceStatus); }}>
            Update Status
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground mt-1">Create, view and manage tenant invoices</p>
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
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="paid">Paid</TabsTrigger>
            <TabsTrigger value="overdue">Overdue</TabsTrigger>
            <TabsTrigger value="manual">Manual</TabsTrigger>
          </TabsList>
        </Tabs>
        <DataTable
          data={filtered}
          columns={invoiceCols}
          loading={isLoading}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search invoice, tenant..."
          label="invoice"
          pageSize={10}
          emptyIcon={<FileText className="h-10 w-10" />}
          emptyMessage="No invoices found"
        />
      </div>

      {/* Create Invoice Dialog */}
      <Dialog open={addOpen} onOpenChange={(o) => { if (!o) setAddOpen(false); }}>
        <DialogContent className="sm:max-w-lg rounded-[20px]">
          <DialogHeader>
            <DialogTitle>New {form.type}</DialogTitle>
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
                <Select value={form.tenantId} onValueChange={(v) => {
                  const t = tenants.find((t) => t.id === Number(v));
                  setForm({ ...form, tenantId: v, propertyId: t ? String(t.propertyId) : form.propertyId });
                }}>
                  <SelectTrigger><SelectValue placeholder="Select tenant" /></SelectTrigger>
                  <SelectContent>
                    {tenants.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.fullName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Property *</Label>
                <Select value={form.propertyId} onValueChange={(v) => setForm({ ...form, propertyId: v, propertyUnitId: "" })}>
                  <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                  <SelectContent>
                    {properties.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.propertyId && unitsForProperty(form.propertyId).length > 0 && (
              <div className="space-y-1">
                <Label>Unit (optional)</Label>
                <Select value={form.propertyUnitId} onValueChange={(v) => setForm({ ...form, propertyUnitId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
                  <SelectContent>
                    {unitsForProperty(form.propertyId).map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>{u.unitNumber}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Amount (UGX) *</Label>
                <Input type="number" placeholder="e.g. 300000" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Invoice Date *</Label>
                <Input type="date" value={form.invoiceDate} onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Due Date *</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Notes (optional)</Label>
              <Textarea placeholder="Additional notes..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button disabled={isSubmitting} onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={!!updateStatusInvoice} onOpenChange={(o) => !o && setUpdateStatusInvoice(null)}>
        <DialogContent className="sm:max-w-sm rounded-[20px]">
          <DialogHeader><DialogTitle>Update Invoice Status</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">Invoice: <span className="font-medium text-foreground">{updateStatusInvoice?.invoiceNumber}</span></p>
            <p className="text-muted-foreground">Amount: <span className="font-medium text-foreground">{updateStatusInvoice && formatUGX(updateStatusInvoice.amount)}</span></p>
            <div className="space-y-1 pt-2">
              <Label>New Status</Label>
              <Select value={newStatus} onValueChange={(v: InvoiceStatus) => setNewStatus(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateStatusInvoice(null)}>Cancel</Button>
            <Button disabled={isSubmitting} onClick={handleUpdateStatus}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog open={!!viewInvoice} onOpenChange={(o) => !o && setViewInvoice(null)}>
        <DialogContent className="sm:max-w-sm rounded-[20px]">
          <DialogHeader><DialogTitle>Invoice Details</DialogTitle></DialogHeader>
          {viewInvoice && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Invoice No.</span><span className="font-semibold">{viewInvoice.invoiceNumber}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Type</span><Badge variant="outline">{viewInvoice.type}</Badge></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tenant</span><span>{tenantName(viewInvoice.tenantId)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Property</span><span>{propertyName(viewInvoice.propertyId)}</span></div>
              {viewInvoice.propertyUnitId && <div className="flex justify-between"><span className="text-muted-foreground">Unit</span><span>{unitName(viewInvoice.propertyUnitId)}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-semibold text-primary">{formatUGX(viewInvoice.amount)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Invoice Date</span><span>{new Date(viewInvoice.invoiceDate).toLocaleDateString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Due Date</span><span>{new Date(viewInvoice.dueDate).toLocaleDateString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span>{statusBadge(viewInvoice.status)}</div>
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
