import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, DoorOpen, DoorClosed, FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Unit {
  id: number;
  roomNumber: string;
  property: string;
  securityDeposit: number;
  monthlyAmount: number;
  status: "Available" | "Occupied";
  tenant?: string;
}

const dummyUnits: Unit[] = [
  { id: 1, roomNumber: "A1", property: "Sunset Apartments", securityDeposit: 150000, monthlyAmount: 300000, status: "Occupied", tenant: "John Mwangi" },
  { id: 2, roomNumber: "A2", property: "Sunset Apartments", securityDeposit: 150000, monthlyAmount: 300000, status: "Available" },
  { id: 3, roomNumber: "B1", property: "Greenview Estate", securityDeposit: 200000, monthlyAmount: 450000, status: "Occupied", tenant: "Sarah Nakato" },
  { id: 4, roomNumber: "B2", property: "Greenview Estate", securityDeposit: 200000, monthlyAmount: 450000, status: "Occupied", tenant: "Peter Otieno" },
  { id: 5, roomNumber: "C1", property: "Palm Court", securityDeposit: 100000, monthlyAmount: 200000, status: "Available" },
  { id: 6, roomNumber: "C2", property: "Palm Court", securityDeposit: 100000, monthlyAmount: 200000, status: "Occupied", tenant: "Mary Auma" },
];

const dummyProperties = ["Sunset Apartments", "Greenview Estate", "Palm Court"];

const emptyForm = {
  roomNumber: "",
  property: "",
  securityDeposit: "",
  monthlyAmount: "",
  status: "Available" as "Available" | "Occupied",
  tenant: "",
};

const UnitsManagement = () => {
  const { toast } = useToast();
  const [units, setUnits] = useState<Unit[]>(dummyUnits);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editUnit, setEditUnit] = useState<Unit | null>(null);
  const [deleteUnit, setDeleteUnit] = useState<Unit | null>(null);
  const [invoiceUnit, setInvoiceUnit] = useState<Unit | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filtered = units.filter(
    (u) =>
      u.roomNumber.toLowerCase().includes(search.toLowerCase()) ||
      u.property.toLowerCase().includes(search.toLowerCase()) ||
      (u.tenant || "").toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setForm(emptyForm);
    setAddOpen(true);
  };

  const openEdit = (unit: Unit) => {
    setForm({
      roomNumber: unit.roomNumber,
      property: unit.property,
      securityDeposit: String(unit.securityDeposit),
      monthlyAmount: String(unit.monthlyAmount),
      status: unit.status,
      tenant: unit.tenant || "",
    });
    setEditUnit(unit);
  };

  const handleSave = async () => {
    if (!form.roomNumber || !form.property || !form.securityDeposit || !form.monthlyAmount) {
      toast({ title: "Validation Error", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 600));

    if (editUnit) {
      setUnits((prev) =>
        prev.map((u) =>
          u.id === editUnit.id
            ? { ...u, ...form, securityDeposit: Number(form.securityDeposit), monthlyAmount: Number(form.monthlyAmount) }
            : u
        )
      );
      toast({ title: "Unit Updated", description: `Room ${form.roomNumber} updated successfully.` });
      setEditUnit(null);
    } else {
      setUnits((prev) => [
        ...prev,
        { id: Date.now(), ...form, securityDeposit: Number(form.securityDeposit), monthlyAmount: Number(form.monthlyAmount) },
      ]);
      toast({ title: "Unit Added", description: `Room ${form.roomNumber} added successfully.` });
      setAddOpen(false);
    }
    setIsSubmitting(false);
  };

  const handleDelete = () => {
    if (!deleteUnit) return;
    setUnits((prev) => prev.filter((u) => u.id !== deleteUnit.id));
    toast({ title: "Unit Deleted", description: `Room ${deleteUnit.roomNumber} removed.` });
    setDeleteUnit(null);
  };

  const handleGenerateInvoice = () => {
    if (!invoiceUnit) return;
    toast({ title: "Invoice Generated", description: `Invoice for room ${invoiceUnit.roomNumber} — ${invoiceUnit.tenant} created.` });
    setInvoiceUnit(null);
  };

  const formatUGX = (n: number) => `UGX ${n.toLocaleString()}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Units / Rooms</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage room units, deposits, amounts and invoices</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Room Unit
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Rooms", value: units.length, color: "text-blue-600" },
          { label: "Occupied", value: units.filter((u) => u.status === "Occupied").length, color: "text-green-600" },
          { label: "Available", value: units.filter((u) => u.status === "Available").length, color: "text-amber-600" },
          { label: "Occupancy Rate", value: `${Math.round((units.filter((u) => u.status === "Occupied").length / units.length) * 100)}%`, color: "text-purple-600" },
        ].map((s) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-xl p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="glass-card rounded-xl p-4 space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search room, property, tenant..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room No.</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Security Deposit</TableHead>
                <TableHead>Monthly Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No units found</TableCell></TableRow>
              ) : (
                filtered.map((unit) => (
                  <TableRow key={unit.id}>
                    <TableCell className="font-medium">{unit.roomNumber}</TableCell>
                    <TableCell>{unit.property}</TableCell>
                    <TableCell>{formatUGX(unit.securityDeposit)}</TableCell>
                    <TableCell>{formatUGX(unit.monthlyAmount)}</TableCell>
                    <TableCell>
                      <Badge variant={unit.status === "Occupied" ? "default" : "secondary"} className="flex items-center gap-1 w-fit">
                        {unit.status === "Occupied" ? <DoorClosed className="h-3 w-3" /> : <DoorOpen className="h-3 w-3" />}
                        {unit.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{unit.tenant || <span className="text-muted-foreground text-sm">—</span>}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {unit.status === "Occupied" && (
                          <Button size="sm" variant="outline" onClick={() => setInvoiceUnit(unit)}>
                            <FileText className="h-4 w-4 mr-1" />Invoice
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => openEdit(unit)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setDeleteUnit(unit)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={addOpen || !!editUnit} onOpenChange={(o) => { if (!o) { setAddOpen(false); setEditUnit(null); } }}>
        <DialogContent className="sm:max-w-md rounded-[20px]">
          <DialogHeader>
            <DialogTitle>{editUnit ? "Edit Room Unit" : "Add Room Unit"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Room Number *</Label>
                <Input placeholder="e.g. A1" value={form.roomNumber} onChange={(e) => setForm({ ...form, roomNumber: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Property *</Label>
                <Select value={form.property} onValueChange={(v) => setForm({ ...form, property: v })}>
                  <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                  <SelectContent>
                    {dummyProperties.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Security Deposit (UGX) *</Label>
                <Input type="number" placeholder="e.g. 150000" value={form.securityDeposit} onChange={(e) => setForm({ ...form, securityDeposit: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Monthly Amount (UGX) *</Label>
                <Input type="number" placeholder="e.g. 300000" value={form.monthlyAmount} onChange={(e) => setForm({ ...form, monthlyAmount: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v: "Available" | "Occupied") => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Available">Available</SelectItem>
                    <SelectItem value="Occupied">Occupied</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.status === "Occupied" && (
                <div className="space-y-1">
                  <Label>Tenant Name</Label>
                  <Input placeholder="Tenant name" value={form.tenant} onChange={(e) => setForm({ ...form, tenant: e.target.value })} />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddOpen(false); setEditUnit(null); }}>Cancel</Button>
            <Button isLoading={isSubmitting} onClick={handleSave}>{editUnit ? "Save Changes" : "Add Unit"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUnit} onOpenChange={(o) => !o && setDeleteUnit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Room Unit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete room <strong>{deleteUnit?.roomNumber}</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invoice Dialog */}
      <Dialog open={!!invoiceUnit} onOpenChange={(o) => !o && setInvoiceUnit(null)}>
        <DialogContent className="sm:max-w-sm rounded-[20px]">
          <DialogHeader>
            <DialogTitle>Generate Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Room:</span><span className="font-medium">{invoiceUnit?.roomNumber}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Property:</span><span>{invoiceUnit?.property}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tenant:</span><span>{invoiceUnit?.tenant}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Amount Due:</span><span className="font-semibold text-primary">{invoiceUnit && formatUGX(invoiceUnit.monthlyAmount)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Invoice Date:</span><span>{new Date().toLocaleDateString()}</span></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceUnit(null)}>Cancel</Button>
            <Button onClick={handleGenerateInvoice}>Generate Invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UnitsManagement;
