import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Plus, Pencil, Trash2, DoorOpen, DoorClosed, UserPlus, UserMinus,
  Loader2, Building2, Home, Shield, X, AlertTriangle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { DataTable, Column } from "@/components/ui/data-table";
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

const selCls =
  "w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 transition-colors";

const StatusBadge = ({ status }: { status: string }) => {
  if (status === "Occupied")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        <DoorClosed className="h-3 w-3" />Occupied
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">
      <DoorOpen className="h-3 w-3" />Available
    </span>
  );
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

  const propertyName = (id: number) =>
    properties.find((p) => p.id === id)?.name ?? `Property #${id}`;

  const filtered = units.filter(
    (u) =>
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
  const occupied = units.filter((u) => u.status === "Occupied").length;
  const occupancyRate = units.length ? Math.round((occupied / units.length) * 100) : 0;

  const unitColumns: Column<PropertyUnit>[] = [
    {
      key: "unitNumber",
      header: "Room No.",
      cell: (u) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <DoorOpen className="h-4 w-4 text-blue-600" />
          </div>
          <span className="font-mono text-sm font-semibold text-[#0F172A]">{u.unitNumber}</span>
        </div>
      ),
    },
    {
      key: "property",
      header: "Property",
      cell: (u) => (
        <div className="flex items-center gap-1.5 text-sm text-[#0F172A]">
          <Home className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
          {propertyName(u.propertyId)}
        </div>
      ),
    },
    {
      key: "securityDeposit",
      header: "Security Deposit",
      cell: (u) => (
        <div className="flex items-center gap-1.5 text-sm text-[#0F172A]">
          <Shield className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
          {formatUGX(u.securityDeposit)}
        </div>
      ),
    },
    {
      key: "monthlyAmount",
      header: "Monthly Amount",
      cell: (u) => <span className="font-semibold text-[#0F172A]">{formatUGX(u.monthlyAmount)}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (u) => <StatusBadge status={u.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "text-right",
      className: "text-right",
      cell: (u) => (
        <div className="flex items-center justify-end gap-2">
          {u.status === "Occupied" ? (
            <button
              onClick={() => setRemoveUnit(u)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-[#E2E8F0] text-slate-600 hover:border-amber-300 hover:text-amber-700 hover:bg-amber-50 transition-colors"
            >
              <UserMinus className="h-3.5 w-3.5" />Remove
            </button>
          ) : (
            <button
              onClick={() => { setAssignUnit(u); setSelectedTenantId(""); }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-[#E2E8F0] text-slate-600 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
            >
              <UserPlus className="h-3.5 w-3.5" />Assign
            </button>
          )}
          <button
            onClick={() => openEdit(u)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-[#1D4ED8] transition-colors"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => setDeleteUnit(u)}
            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const UnitFormBody = () => (
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-wider text-slate-400 font-medium">Room Number *</label>
          <Input
            placeholder="e.g. A1"
            value={form.unitNumber}
            onChange={(e) => setForm({ ...form, unitNumber: e.target.value })}
            className="border-[#E2E8F0] focus:border-[#1D4ED8] focus-visible:ring-[#1D4ED8]/10"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-wider text-slate-400 font-medium">Property *</label>
          <select
            className={selCls}
            value={form.propertyId}
            onChange={(e) => setForm({ ...form, propertyId: e.target.value })}
          >
            <option value="">Select property</option>
            {properties.map((p) => (
              <option key={p.id} value={String(p.id)}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-wider text-slate-400 font-medium">Security Deposit (UGX) *</label>
          <Input
            type="number"
            placeholder="e.g. 150000"
            value={form.securityDeposit}
            onChange={(e) => setForm({ ...form, securityDeposit: e.target.value })}
            className="border-[#E2E8F0] focus:border-[#1D4ED8] focus-visible:ring-[#1D4ED8]/10"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-wider text-slate-400 font-medium">Monthly Amount (UGX) *</label>
          <Input
            type="number"
            placeholder="e.g. 300000"
            value={form.monthlyAmount}
            onChange={(e) => setForm({ ...form, monthlyAmount: e.target.value })}
            className="border-[#E2E8F0] focus:border-[#1D4ED8] focus-visible:ring-[#1D4ED8]/10"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs uppercase tracking-wider text-slate-400 font-medium">Status</label>
        <select
          className={selCls}
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
        >
          <option value="Available">Available</option>
          <option value="Occupied">Occupied</option>
        </select>
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
                <Building2 className="h-4 w-4 text-white" />
              </div>
              <span className="text-blue-200 text-sm font-medium">Property Management</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Units / Rooms</h1>
            <p className="text-blue-200 text-sm mt-1">Manage room units, deposits, amounts and tenant assignments</p>
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              {[
                { label: "Total", value: units.length },
                { label: "Occupied", value: occupied },
                { label: "Available", value: units.length - occupied },
                { label: "Occupancy", value: `${occupancyRate}%` },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-1.5">
                  <span className="text-white font-bold text-sm">{s.value}</span>
                  <span className="text-blue-200 text-xs">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-[#1D4ED8] text-sm font-semibold hover:bg-blue-50 transition-colors shadow-lg self-start md:self-auto"
          >
            <Plus className="h-4 w-4" />Add Room Unit
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Rooms", value: units.length, Icon: Building2, border: "border-l-blue-500", bg: "bg-blue-50", color: "text-blue-600" },
          { label: "Occupied", value: occupied, Icon: DoorClosed, border: "border-l-emerald-500", bg: "bg-emerald-50", color: "text-emerald-600" },
          { label: "Available", value: units.length - occupied, Icon: DoorOpen, border: "border-l-amber-500", bg: "bg-amber-50", color: "text-amber-600" },
          { label: "Occupancy Rate", value: `${occupancyRate}%`, Icon: Building2, border: "border-l-purple-500", bg: "bg-purple-50", color: "text-purple-600" },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`bg-white rounded-xl border border-[#E2E8F0] border-l-4 ${card.border} p-4 flex items-center gap-3`}
          >
            <div className={`h-10 w-10 rounded-lg ${card.bg} flex items-center justify-center flex-shrink-0`}>
              <card.Icon className={`h-5 w-5 ${card.color}`} />
            </div>
            <div>
              <p className="text-xs text-slate-500">{card.label}</p>
              <p className={`text-2xl font-bold mt-0.5 ${card.color}`}>{card.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-4">
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

      {/* Add / Edit Modal */}
      {(addOpen || !!editUnit) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => { setAddOpen(false); setEditUnit(null); }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="bg-gradient-to-r from-[#0F172A] to-[#1D4ED8] px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {editUnit ? "Edit Room Unit" : "Add Room Unit"}
                </h2>
                <p className="text-blue-200 text-xs mt-0.5">
                  {editUnit ? `Editing ${editUnit.unitNumber}` : "Fill in the unit details"}
                </p>
              </div>
              <button
                onClick={() => { setAddOpen(false); setEditUnit(null); }}
                className="text-white/60 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <UnitFormBody />
            <div className="px-6 py-4 border-t border-[#E2E8F0] flex justify-end gap-3">
              <button
                onClick={() => { setAddOpen(false); setEditUnit(null); }}
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
                {editUnit ? "Save Changes" : "Add Unit"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Assign Tenant Modal */}
      {!!assignUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setAssignUnit(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
          >
            <div className="bg-gradient-to-r from-emerald-700 to-emerald-500 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Assign Tenant</h2>
                <p className="text-emerald-100 text-xs mt-0.5">Room {assignUnit.unitNumber}</p>
              </div>
              <button onClick={() => setAssignUnit(null)} className="text-white/60 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider text-slate-400 font-medium">Select Tenant *</label>
                <select
                  className={selCls}
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                >
                  <option value="">Select tenant</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={String(t.id)}>{t.fullName}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#E2E8F0] flex justify-end gap-3">
              <button
                onClick={() => setAssignUnit(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-[#E2E8F0] text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignTenant}
                disabled={isSubmitting}
                className="btn-grid inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Assign Tenant
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Remove Tenant Confirmation */}
      {!!removeUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setRemoveUnit(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
          >
            <div className="bg-gradient-to-r from-amber-600 to-amber-500 px-6 py-4 flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-white flex-shrink-0" />
              <div>
                <h2 className="text-lg font-bold text-white">Remove Tenant</h2>
                <p className="text-amber-100 text-xs mt-0.5">Room {removeUnit.unitNumber}</p>
              </div>
            </div>
            <div className="p-6">
              <p className="text-slate-600 text-sm">
                Are you sure you want to remove the tenant from room{" "}
                <strong className="text-[#0F172A]">{removeUnit.unitNumber}</strong>? The unit will become available.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-[#E2E8F0] flex justify-end gap-3">
              <button
                onClick={() => setRemoveUnit(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-[#E2E8F0] text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveTenant}
                className="btn-grid px-4 py-2 rounded-lg text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors"
              >
                Remove Tenant
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation */}
      {!!deleteUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteUnit(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
          >
            <div className="bg-gradient-to-r from-red-600 to-red-500 px-6 py-4 flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-white flex-shrink-0" />
              <div>
                <h2 className="text-lg font-bold text-white">Delete Room Unit</h2>
                <p className="text-red-100 text-xs mt-0.5">This action is permanent</p>
              </div>
            </div>
            <div className="p-6">
              <p className="text-slate-600 text-sm">
                Are you sure you want to delete room{" "}
                <strong className="text-[#0F172A]">{deleteUnit.unitNumber}</strong>? This cannot be undone.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-[#E2E8F0] flex justify-end gap-3">
              <button
                onClick={() => setDeleteUnit(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-[#E2E8F0] text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="btn-grid px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Delete Unit
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default UnitsManagement;
