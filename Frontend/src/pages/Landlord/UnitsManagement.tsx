import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, DoorOpen, DoorClosed, UserPlus, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

interface PropertyUnit {
  id: number;
  unitNumber: string;
  propertyId: number;
  securityDeposit: number;
  monthlyAmount: number;
  status: string;
  createdAt?: string;
}

interface Property {
  id: number;
  name: string;
  address?: string;
}

interface Tenant {
  id: number;
  fullName: string;
  propertyId: number;
}

const emptyForm = {
  unitNumber: "",
  propertyId: "",
  securityDeposit: "",
  monthlyAmount: "",
  status: "Available",
};

const UnitsManagement = () => {
  const { toast } = useToast();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const userData = JSON.parse(localStorage.getItem("user") || "{}");

  const [units, setUnits] = useState<PropertyUnit[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editUnit, setEditUnit] = useState<PropertyUnit | null>(null);
  const [deleteUnit, setDeleteUnit] = useState<PropertyUnit | null>(null);
  const [assignUnit, setAssignUnit] = useState<PropertyUnit | null>(null);
  const [removeUnit, setRemoveUnit] = useState<PropertyUnit | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUnits = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get<PropertyUnit[]>(`${apiUrl}/GetPropertyUnitsByLandLordId/${userData.id}`);
      setUnits(data);
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data || "Failed to load units.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();

    const fetchProperties = async () => {
      try {
        const { data } = await axios.get<Property[]>(`${apiUrl}/GetPropertiesByLandLordId/${userData.id}`);
        setProperties(data);
      } catch {
        // silent
      }
    };

    const fetchTenants = async () => {
      try {
        const { data } = await axios.get<Tenant[]>(`${apiUrl}/GetAllTenants`);
        setTenants(data.filter((t) => t.propertyId > 0));
      } catch {
        // silent
      }
    };

    fetchProperties();
    fetchTenants();
  }, []);

  const propertyName = (id: number) => properties.find((p) => p.id === id)?.name ?? `Property #${id}`;

  const filtered = units.filter((u) =>
    u.unitNumber.toLowerCase().includes(search.toLowerCase()) ||
    propertyName(u.propertyId).toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setForm(emptyForm); setAddOpen(true); };
  const openEdit = (unit: PropertyUnit) => {
    setForm({
      unitNumber: unit.unitNumber,
      propertyId: String(unit.propertyId),
      securityDeposit: String(unit.securityDeposit),
      monthlyAmount: String(unit.monthlyAmount),
      status: unit.status,
    });
    setEditUnit(unit);
  };

  const handleSave = async () => {
    if (!form.unitNumber || !form.propertyId || !form.securityDeposit || !form.monthlyAmount) {
      toast({ title: "Validation Error", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const body = {
      PropertyId: Number(form.propertyId),
      UnitNumber: form.unitNumber,
      SecurityDeposit: Number(form.securityDeposit),
      MonthlyAmount: Number(form.monthlyAmount),
      Status: form.status,
    };
    try {
      if (editUnit) {
        await axios.put(`${apiUrl}/UpdatePropertyUnit/${editUnit.id}`, body);
        toast({ title: "Unit Updated", description: `Room ${form.unitNumber} updated successfully.` });
        setEditUnit(null);
      } else {
        await axios.post(`${apiUrl}/AddPropertyUnit`, body);
        toast({ title: "Unit Added", description: `Room ${form.unitNumber} added successfully.` });
        setAddOpen(false);
      }
      fetchUnits();
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data || "Operation failed.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUnit) return;
    try {
      await axios.delete(`${apiUrl}/DeletePropertyUnit/${deleteUnit.id}`);
      toast({ title: "Unit Deleted", description: `Room ${deleteUnit.unitNumber} removed.` });
      setDeleteUnit(null);
      fetchUnits();
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data || "Delete failed.", variant: "destructive" });
    }
  };

  const handleAssignTenant = async () => {
    if (!assignUnit || !selectedTenantId) {
      toast({ title: "Validation Error", description: "Please select a tenant.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await axios.put(`${apiUrl}/AssignTenantToUnit`, {
        TenantId: Number(selectedTenantId),
        UnitId: assignUnit.id,
      });
      toast({ title: "Tenant Assigned", description: "Tenant assigned to unit successfully." });
      setAssignUnit(null);
      setSelectedTenantId("");
      fetchUnits();
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data || "Assign failed.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveTenant = async () => {
    if (!removeUnit) return;
    try {
      const tenant = tenants.find((t) => t.propertyId === removeUnit.propertyId);
      if (!tenant) {
        toast({ title: "Error", description: "Could not find assigned tenant.", variant: "destructive" });
        setRemoveUnit(null);
        return;
      }
      await axios.put(`${apiUrl}/RemoveTenantFromUnit/${tenant.id}`);
      toast({ title: "Tenant Removed", description: "Tenant removed from unit." });
      setRemoveUnit(null);
      fetchUnits();
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data || "Remove failed.", variant: "destructive" });
    }
  };

  const formatUGX = (n: number) => `UGX ${n.toLocaleString()}`;

  const unitColumns: Column<PropertyUnit>[] = [
    { key: "unitNumber", header: "Room No.", cell: (u) => <span className="font-medium">{u.unitNumber}</span> },
    { key: "property", header: "Property", cell: (u) => propertyName(u.propertyId) },
    { key: "securityDeposit", header: "Security Deposit", cell: (u) => formatUGX(u.securityDeposit) },
    { key: "monthlyAmount", header: "Monthly Amount", cell: (u) => formatUGX(u.monthlyAmount) },
    {
      key: "status", header: "Status",
      cell: (u) => (
        <Badge variant={u.status === "Occupied" ? "default" : "secondary"} className="flex items-center gap-1 w-fit">
          {u.status === "Occupied" ? <DoorClosed className="h-3 w-3" /> : <DoorOpen className="h-3 w-3" />}
          {u.status}
        </Badge>
      ),
    },
    {
      key: "actions", header: "Actions", headerClassName: "text-right", className: "text-right",
      cell: (u) => (
        <div className="flex items-center justify-end gap-2">
          {u.status === "Occupied" ? (
            <Button size="sm" variant="outline" onClick={() => setRemoveUnit(u)}>
              <UserMinus className="h-4 w-4 mr-1" />Remove
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => { setAssignUnit(u); setSelectedTenantId(""); }}>
              <UserPlus className="h-4 w-4 mr-1" />Assign
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => openEdit(u)}><Pencil className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" onClick={() => setDeleteUnit(u)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
        </div>
      ),
    },
  ];

  const occupied = units.filter((u) => u.status === "Occupied").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Units / Rooms</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage room units, deposits, amounts and tenant assignments</p>
        </div>
        <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add Room Unit</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Rooms", value: units.length, color: "text-blue-600" },
          { label: "Occupied", value: occupied, color: "text-green-600" },
          { label: "Available", value: units.length - occupied, color: "text-amber-600" },
          { label: "Occupancy Rate", value: units.length ? `${Math.round((occupied / units.length) * 100)}%` : "0%", color: "text-purple-600" },
        ].map((s) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-xl p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="glass-card rounded-xl p-4">
        <DataTable
          data={filtered}
          columns={unitColumns}
          loading={isLoading}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search room or property..."
          label="unit"
          pageSize={10}
          emptyMessage="No units found"
          emptyIcon={<DoorOpen className="h-12 w-12" />}
        />
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
                <Input placeholder="e.g. A1" value={form.unitNumber} onChange={(e) => setForm({ ...form, unitNumber: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Property *</Label>
                <Select value={form.propertyId} onValueChange={(v) => setForm({ ...form, propertyId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                  <SelectContent>
                    {properties.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
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
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Available">Available</SelectItem>
                  <SelectItem value="Occupied">Occupied</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddOpen(false); setEditUnit(null); }}>Cancel</Button>
            <Button disabled={isSubmitting} onClick={handleSave}>{editUnit ? "Save Changes" : "Add Unit"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Tenant Dialog */}
      <Dialog open={!!assignUnit} onOpenChange={(o) => !o && setAssignUnit(null)}>
        <DialogContent className="sm:max-w-sm rounded-[20px]">
          <DialogHeader><DialogTitle>Assign Tenant to {assignUnit?.unitNumber}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Select Tenant *</Label>
            <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
              <SelectTrigger><SelectValue placeholder="Select tenant" /></SelectTrigger>
              <SelectContent>
                {tenants.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.fullName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignUnit(null)}>Cancel</Button>
            <Button disabled={isSubmitting} onClick={handleAssignTenant}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Tenant Confirmation */}
      <AlertDialog open={!!removeUnit} onOpenChange={(o) => !o && setRemoveUnit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Tenant from Unit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the tenant from room <strong>{removeUnit?.unitNumber}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveTenant}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUnit} onOpenChange={(o) => !o && setDeleteUnit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Room Unit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete room <strong>{deleteUnit?.unitNumber}</strong>? This cannot be undone.
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

export default UnitsManagement;
