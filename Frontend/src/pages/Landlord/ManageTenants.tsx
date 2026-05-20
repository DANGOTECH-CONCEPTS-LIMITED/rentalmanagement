import { useState, useEffect } from "react";
import { getImageUrl as buildImageUrl } from "@/lib/imageUrl";
import { Input } from "@/components/ui/input";
import { DataTable, Column } from "@/components/ui/data-table";
import {
  Users, Eye, Edit, Trash2, Calendar, Home, CreditCard,
  X, PhoneIcon, Upload, Camera, Check, Key, Mail, Phone,
  User, Banknote, Loader2, UserCheck, UserX, DollarSign,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import Modal from "@/components/common/Model";
import { Property } from "./RegisterTenants";
import { motion } from "framer-motion";
import axios from "axios";
import ConfirmDeleteModal from "@/components/common/DeleteModal";

interface Tenant {
  idFront: string;
  idBack: string;
  propertyId: string;
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  active: boolean;
  passportPhoto: string;
  nationalIdNumber: string;
  paymentStatus: string;
  balanceDue: number;
  arrears: number;
  nextPaymentDate: string;
  dateMovedIn: string;
  unitId?: string;
  waterMeterNo?: string;
  occupation?: string;
  nextOfKinName?: string;
  nextOfKinPhone?: string;
  property: {
    id: number;
    name: string;
    type: string;
    price: number;
    currency: string;
  };
}

// ── Small helpers ─────────────────────────────────────────────────────────────
const StatusBadge = ({ active }: { active: boolean }) =>
  active ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
      <UserCheck className="h-3 w-3" /> Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-red-100 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
      <UserX className="h-3 w-3" /> Inactive
    </span>
  );

interface KpiProps {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; iconBg: string; iconColor: string; accent: string;
}
const KpiCard = ({ label, value, sub, icon: Icon, iconBg, iconColor, accent }: KpiProps) => (
  <div className={`rounded-2xl border-l-4 border border-slate-200 bg-white p-5 shadow-sm ${accent}`}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-1.5 text-2xl font-bold text-[#0F172A] leading-none">{value}</p>
        {sub && <p className="mt-1.5 text-xs text-slate-500">{sub}</p>}
      </div>
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
    </div>
  </div>
);

const DetailRow = ({
  icon: Icon, label, value,
}: {
  icon: React.ElementType; label: string; value: React.ReactNode;
}) => (
  <div className="flex items-start gap-3 border-b border-slate-100 py-2.5 last:border-0">
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100">
      <Icon className="h-3.5 w-3.5 text-slate-500" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <div className="mt-0.5 text-sm text-[#0F172A]">{value}</div>
    </div>
  </div>
);

// ── Component ─────────────────────────────────────────────────────────────────
const ManageTenants = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const { toast } = useToast();
  const [isLoadingProperties, setIsLoadingProperties] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [passportPhoto, setPassportPhoto] = useState<File | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [passportPhotoPreview, setPassportPhotoPreview] = useState<string | null>(null);
  const [deleteTenant, setDeleteTenant] = useState<Tenant | null>(null);
  const [idFrontPhoto, setIdFrontPhoto] = useState<File | null>(null);
  const [idFrontPhotoPreview, setIdFrontPhotoPreview] = useState<string | null>(null);
  const [idBackPhoto, setIdBackPhoto] = useState<File | null>(null);
  const [idBackPhotoPreview, setIdBackPhotoPreview] = useState<string | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMethod: "Cash",
    referenceNo: "",
    notes: "",
  });
  const [formData, setFormData] = useState({
    id: 0, FullName: "", Name: "", Email: "", PhoneNumber: "",
    NationalIdNumber: "", DateMovedIn: "", PropertyId: "", Active: "true",
    idFront: "", idBack: "", passportPhoto: "",
    UnitId: "", WaterMeterNo: "", TenantStatus: "active",
    Occupation: "", NextOfKinName: "", NextOfKinPhone: "",
  });

  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const user = localStorage.getItem("user");
  const userData = JSON.parse(user);
  const getAuthToken = () => {
    try { return userData?.token ?? null; }
    catch { return null; }
  };

  const PLACEHOLDER_IMAGE = "https://placehold.co/150?text=No+Image";
  const getImageUrl = (relativePath: string) => {
    if (!relativePath) return PLACEHOLDER_IMAGE;
    if (relativePath.startsWith("http")) return relativePath;
    const token = getAuthToken();
    return `${apiUrl}/${relativePath}${token ? `?token=${token}` : ""}`;
  };

  const fetchTenants = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get(`${apiUrl}/GetAllTenants`);
      setTenants(data.filter((t: any) => t?.property?.ownerId === userData.id));
    } catch (error) {
      toast({ title: "Error", description: "Failed to load tenants.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchTenants(); }, []);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const { data } = await axios.get(`${apiUrl}/GetAllProperties`);
        setProperties(data);
      } catch {
        toast({ title: "Error", description: "Failed to load properties.", variant: "destructive" });
      } finally {
        setIsLoadingProperties(false);
      }
    };
    fetchProperties();
  }, [toast]);

  useEffect(() => {
    return () => {
      if (passportPhotoPreview) URL.revokeObjectURL(passportPhotoPreview);
      if (idFrontPhotoPreview) URL.revokeObjectURL(idFrontPhotoPreview);
      if (idBackPhotoPreview) URL.revokeObjectURL(idBackPhotoPreview);
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "PassportPhoto" | "IdFront" | "IdBack") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    if (type === "PassportPhoto") { if (passportPhotoPreview) URL.revokeObjectURL(passportPhotoPreview); setPassportPhoto(file); setPassportPhotoPreview(previewUrl); }
    else if (type === "IdFront") { if (idFrontPhotoPreview) URL.revokeObjectURL(idFrontPhotoPreview); setIdFrontPhoto(file); setIdFrontPhotoPreview(previewUrl); }
    else { if (idBackPhotoPreview) URL.revokeObjectURL(idBackPhotoPreview); setIdBackPhoto(file); setIdBackPhotoPreview(previewUrl); }
  };

  const clearFile = (type: "PassportPhoto" | "IdFront" | "IdBack") => {
    if (type === "PassportPhoto") { if (passportPhotoPreview) URL.revokeObjectURL(passportPhotoPreview); setPassportPhoto(null); setPassportPhotoPreview(null); }
    else if (type === "IdFront") { if (idFrontPhotoPreview) URL.revokeObjectURL(idFrontPhotoPreview); setIdFrontPhoto(null); setIdFrontPhotoPreview(null); }
    else { if (idBackPhotoPreview) URL.revokeObjectURL(idBackPhotoPreview); setIdBackPhoto(null); setIdBackPhotoPreview(null); }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value, ...(name === "FullName" ? { Name: value } : {}) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const form = new FormData();
      const formattedDate = new Date(formData.DateMovedIn).toISOString();
      form.append("tenantid", formData.id.toString());
      form.append("FullName", formData.FullName);
      form.append("Name", formData.Name || formData.FullName);
      form.append("Email", formData.Email);
      form.append("PhoneNumber", formData.PhoneNumber);
      form.append("NationalIdNumber", formData.NationalIdNumber);
      form.append("DateMovedIn", formattedDate);
      form.append("PropertyId", formData.PropertyId);
      form.append("Active", formData.Active);
      form.append("PassportPhoto", passportPhoto);
      form.append("IdFront", idFrontPhoto);
      form.append("IdBack", idBackPhoto);
      form.append("files", passportPhoto);
      form.append("files", idFrontPhoto);
      form.append("files", idBackPhoto);

      const response = await axios.put(`${apiUrl}/UpdateTenant`, form, { headers: { Accept: "*/*" } });
      if (response.status !== 200) throw new Error("Failed to update tenant");

      setIsSubmitting(false);
      setIsSuccess(true);
      toast({ title: "Tenant Updated Successfully", description: `${formData.FullName} has been updated.` });

      setTimeout(() => {
        setFormData({ id: 0, FullName: "", Name: "", Email: "", PhoneNumber: "", NationalIdNumber: "", DateMovedIn: "", PropertyId: "", Active: "true", idFront: "", idBack: "", passportPhoto: "", UnitId: "", WaterMeterNo: "", TenantStatus: "active", Occupation: "", NextOfKinName: "", NextOfKinPhone: "" });
        clearFile("PassportPhoto"); clearFile("IdFront"); clearFile("IdBack");
        setIsSuccess(false); setIsEdit(false);
      }, 3000);
    } catch (error) {
      console.error("Error submitting form:", error);
      setIsSubmitting(false);
      toast({ title: "Error", description: "Failed to update tenant.", variant: "destructive" });
    }
  };

  const filteredTenants = tenants.filter(
    (t) =>
      t.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.property.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number, currency = "UGX") =>
    new Intl.NumberFormat("en-UG", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);

  const formatDate = (ds: string) =>
    new Date(ds).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  const handleDeleteTenant = async (tenantId: number) => {
    try {
      const response = await fetch(`${apiUrl}/DeleteTenant/${tenantId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      if (response.ok) {
        setSelectedTenant(null);
        toast({ title: "Success", description: "Tenant deleted successfully" });
        fetchTenants();
      } else throw new Error("Failed to delete tenant");
    } catch {
      toast({ title: "Error", description: "Failed to delete tenant.", variant: "destructive" });
    }
  };

  const handleRecordPayment = async () => {
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      toast({ title: "Validation Error", description: "Please enter a valid amount.", variant: "destructive" });
      return;
    }
    setIsSubmittingPayment(true);
    try {
      const body = {
        tenantId: selectedTenant?.id,
        amount: Number(paymentForm.amount),
        paymentDate: paymentForm.paymentDate,
        paymentMethod: paymentForm.paymentMethod,
        referenceNo: paymentForm.referenceNo,
        notes: paymentForm.notes,
      };
      const response = await fetch(`${apiUrl}/RecordPayment`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getAuthToken()}`, "Content-Type": "application/json", Accept: "*/*" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);

      const paid = Number(paymentForm.amount);
      setTenants((prev) =>
        prev.map((t) => t.id === selectedTenant?.id ? { ...t, balanceDue: Math.max(0, t.balanceDue - paid) } : t)
      );
      if (selectedTenant)
        setSelectedTenant({ ...selectedTenant, balanceDue: Math.max(0, selectedTenant.balanceDue - paid) });

      toast({ title: "Payment Recorded", description: `${formatCurrency(paid, selectedTenant?.property.currency)} recorded.` });
      setPaymentModalOpen(false);
      setPaymentForm({ amount: "", paymentDate: new Date().toISOString().split("T")[0], paymentMethod: "Cash", referenceNo: "", notes: "" });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to record payment.", variant: "destructive" });
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const openEdit = (t: Tenant) => {
    setFormData({
      id: t.id, FullName: t.fullName, Name: t.fullName, Email: t.email,
      PhoneNumber: t.phoneNumber, NationalIdNumber: t.nationalIdNumber,
      DateMovedIn: new Date(t.dateMovedIn).toISOString().split("T")[0],
      PropertyId: t.propertyId, Active: String(t.active),
      idFront: t.idFront || "", idBack: t.idBack || "", passportPhoto: t.passportPhoto || "",
      UnitId: t.unitId || "", WaterMeterNo: t.waterMeterNo || "",
      TenantStatus: t.active ? "active" : "left",
      Occupation: t.occupation || "", NextOfKinName: t.nextOfKinName || "", NextOfKinPhone: t.nextOfKinPhone || "",
    });
    setPassportPhotoPreview(getImageUrl(t.passportPhoto));
    setIdFrontPhotoPreview(getImageUrl(t.idFront));
    setIdBackPhotoPreview(getImageUrl(t.idBack));
    setIsEdit(true);
  };

  const activeCount = tenants.filter(t => t.active).length;
  const totalBalance = tenants.reduce((s, t) => s + (t.balanceDue || 0), 0);

  const selectCls =
    "h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-sm text-[#0F172A] shadow-sm " +
    "outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10";

  const uploadBox = (
    label: string,
    IconEl: React.ElementType,
    file: File | null,
    preview: string | null,
    type: "PassportPhoto" | "IdFront" | "IdBack",
    inputId: string
  ) => (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
        <IconEl className="h-3.5 w-3.5" /> {label}
      </label>
      <div
        className="flex h-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 hover:border-[#1D4ED8] transition-colors relative overflow-hidden"
        onClick={() => document.getElementById(inputId)?.click()}
      >
        {file ? (
          <>
            <img src={preview!} alt={label} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); clearFile(type); }}
              className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              <X size={12} />
            </button>
          </>
        ) : (
          <>
            <Upload className="h-7 w-7 text-slate-300 mb-1.5" />
            <p className="text-xs text-slate-400">Click to upload</p>
          </>
        )}
        <input id={inputId} type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, type)} />
      </div>
    </div>
  );

  const tenantColumns: Column<Tenant>[] = [
    {
      key: "tenant", header: "Tenant",
      cell: (t) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border-2 border-slate-100 bg-slate-100">
            <img
              src={buildImageUrl(t.passportPhoto)}
              alt={t.fullName}
              className="h-full w-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE; }}
            />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-[#0F172A]">{t.fullName}</p>
            <p className="truncate text-xs text-slate-400">{t.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "property", header: "Property",
      cell: (t) => (
        <div className="flex items-center gap-1.5 text-sm text-slate-600">
          <Home className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <div>
            <p className="font-medium text-[#0F172A]">{t.property.name}</p>
            <p className="text-xs text-slate-400">{t.property.type}</p>
          </div>
        </div>
      ),
    },
    {
      key: "unit", header: "Unit",
      cell: (t) => t.unitId
        ? <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-600">{t.unitId}</span>
        : <span className="text-slate-300">—</span>,
    },
    {
      key: "movein", header: "Move-in",
      cell: (t) => (
        <span className="flex items-center gap-1 text-sm text-slate-500">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          {formatDate(t.dateMovedIn)}
        </span>
      ),
    },
    {
      key: "rent", header: "Rent/mo",
      headerClassName: "text-right",
      className: "text-right",
      cell: (t) => <span className="text-sm font-semibold text-[#0F172A]">{formatCurrency(t.property.price, t.property.currency)}</span>,
    },
    {
      key: "status", header: "Status",
      cell: (t) => <StatusBadge active={t.active} />,
    },
    {
      key: "actions", header: "Actions", headerClassName: "text-right",
      className: "text-right",
      cell: (t) => (
        <div className="flex items-center justify-end gap-1">
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-blue-50 hover:text-[#1D4ED8] transition-colors"
            onClick={() => {
              setSelectedTenant(t);
              setFormData({ id: t.id, FullName: t.fullName, Name: t.fullName, Email: t.email, PhoneNumber: t.phoneNumber, NationalIdNumber: t.nationalIdNumber, DateMovedIn: new Date(t.dateMovedIn).toISOString().split("T")[0], PropertyId: t.propertyId, Active: String(t.active), idFront: t.idFront, idBack: t.idBack, passportPhoto: t.passportPhoto, UnitId: t.unitId || "", WaterMeterNo: t.waterMeterNo || "", TenantStatus: t.active ? "active" : "left", Occupation: t.occupation || "", NextOfKinName: t.nextOfKinName || "", NextOfKinPhone: t.nextOfKinPhone || "" });
            }}
            title="View"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            onClick={() => openEdit(t)}
            title="Edit"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
            onClick={() => { setDeleteTenant(t); setIsDeleteModalOpen(true); }}
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">

      {/* ── Hero banner ── */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#1E3A5F] to-[#1D4ED8] px-8 py-8 text-white shadow-xl">
        <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-8 left-1/3 h-40 w-40 rounded-full bg-white/5" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-200">
              Tenant Management
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Manage Tenants</h1>
              <p className="mt-1 text-sm text-blue-200">
                Review occupants, update records, and keep tenant information aligned with properties.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 pt-1">
              {[
                { label: "Total", value: tenants.length },
                { label: "Active", value: activeCount, color: "text-emerald-300" },
                { label: "Inactive", value: tenants.length - activeCount, color: "text-red-300" },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-1.5">
                  <span className={`text-sm font-bold ${s.color ?? "text-white"}`}>{s.value}</span>
                  <span className="text-xs text-blue-200">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => navigate("/landlord-dashboard/register-tenants")}
            className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white px-5 py-2.5 text-sm font-bold text-[#1D4ED8] shadow-sm transition-colors hover:bg-blue-50 shrink-0"
          >
            Add Tenant
          </button>
        </div>
      </section>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Total Tenants"  value={tenants.length} sub={`${activeCount} active`}                                icon={Users}    iconBg="bg-blue-50"    iconColor="text-[#1D4ED8]"    accent="border-l-[#1D4ED8]" />
        <KpiCard label="Active Tenants" value={activeCount}    sub={`${tenants.length - activeCount} inactive`}             icon={UserCheck} iconBg="bg-emerald-50" iconColor="text-emerald-600" accent="border-l-emerald-500" />
        <KpiCard label="Total Balance Due" value={formatCurrency(totalBalance)} sub="across all tenants"                   icon={DollarSign} iconBg="bg-amber-50"  iconColor="text-amber-600"   accent="border-l-amber-500" />
      </div>

      {/* ── Table ── */}
      <DataTable
        data={filteredTenants}
        columns={tenantColumns}
        loading={isLoading}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by name, email, or property…"
        label="tenant"
        pageSize={10}
        minWidth="1000px"
        emptyIcon={<Users className="h-6 w-6 text-slate-300" />}
        emptyMessage={searchTerm ? "No tenants match your search" : "Start by adding a new tenant"}
      />

      {/* ── Tenant Detail Modal ── */}
      {selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

            {/* Header */}
            <div className="relative shrink-0 bg-gradient-to-r from-[#0F172A] to-[#1D4ED8] px-6 py-5 text-white">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-white/30 bg-white/10">
                  <img
                    src={buildImageUrl(selectedTenant.passportPhoto)}
                    alt={selectedTenant.fullName}
                    className="h-full w-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE; }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-300">Tenant Profile</p>
                  <h2 className="text-xl font-bold truncate">{selectedTenant.fullName}</h2>
                  <p className="text-sm text-blue-200">{selectedTenant.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge active={selectedTenant.active} />
                  <button
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                    onClick={() => setSelectedTenant(null)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 gap-0 sm:grid-cols-2">

                {/* Left: personal + property */}
                <div className="border-r border-slate-100 px-6 py-4">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Personal Info</p>
                  <DetailRow icon={PhoneIcon} label="Phone" value={selectedTenant.phoneNumber} />
                  <DetailRow icon={CreditCard} label="National ID" value={selectedTenant.nationalIdNumber} />
                  <DetailRow icon={Calendar} label="Move-in Date" value={formatDate(selectedTenant.dateMovedIn)} />
                  {selectedTenant.occupation && <DetailRow icon={User} label="Occupation" value={selectedTenant.occupation} />}
                  {selectedTenant.nextOfKinName && (
                    <>
                      <p className="mb-1 mt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Next of Kin</p>
                      <DetailRow icon={User} label="Name" value={selectedTenant.nextOfKinName} />
                      {selectedTenant.nextOfKinPhone && <DetailRow icon={PhoneIcon} label="Contact" value={selectedTenant.nextOfKinPhone} />}
                    </>
                  )}
                </div>

                {/* Right: property + payment */}
                <div className="px-6 py-4">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Property & Payment</p>
                  <DetailRow icon={Home} label="Property" value={`${selectedTenant.property.name} (${selectedTenant.property.type})`} />
                  {selectedTenant.unitId && <DetailRow icon={Key} label="Unit / Room" value={selectedTenant.unitId} />}
                  {selectedTenant.waterMeterNo && <DetailRow icon={Key} label="Water Meter" value={selectedTenant.waterMeterNo} />}
                  <DetailRow icon={Banknote} label="Monthly Rent" value={<span className="font-semibold">{formatCurrency(selectedTenant.property.price, selectedTenant.property.currency)}</span>} />
                  <DetailRow
                    icon={Calendar}
                    label="Next Payment Due"
                    value={formatDate(selectedTenant.nextPaymentDate)}
                  />
                  <DetailRow
                    icon={DollarSign}
                    label="Balance Due"
                    value={
                      <span className={`font-semibold ${selectedTenant.balanceDue > 0 ? "text-red-600" : "text-emerald-600"}`}>
                        {formatCurrency(selectedTenant.balanceDue, selectedTenant.property.currency)}
                      </span>
                    }
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 flex items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
              <button
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                onClick={() => setSelectedTenant(null)}
              >
                Close
              </button>
              <div className="flex items-center gap-2">
                <button
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
                  onClick={() => {
                    setPaymentForm({ amount: "", paymentDate: new Date().toISOString().split("T")[0], paymentMethod: "Cash", referenceNo: "", notes: "" });
                    setPaymentModalOpen(true);
                  }}
                >
                  <Banknote className="h-4 w-4" /> Record Payment
                </button>
                <button
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  onClick={() => openEdit(selectedTenant)}
                >
                  <Edit className="h-4 w-4" /> Update
                </button>
                <button
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 transition-colors"
                  onClick={() => { setDeleteTenant(selectedTenant); setIsDeleteModalOpen(true); }}
                >
                  <Trash2 className="h-4 w-4" /> Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Tenant Modal ── */}
      <Modal
        isOpen={isEdit}
        onClose={() => setIsEdit(false)}
        title="Update Tenant"
        size="xl"
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              onClick={() => setIsEdit(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-[#1D4ED8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e40af] transition-colors disabled:opacity-50"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Update Tenant
            </button>
          </div>
        }
      >
        <div className="h-[65vh] overflow-y-auto px-1">
          {isSuccess ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center text-center py-14"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mb-4">
                <Check className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold mb-1">Tenant Updated Successfully!</h3>
              <p className="text-sm text-slate-500">An email has been sent to {formData.Email} with updated details.</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6 py-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { name: "FullName", label: "Full Name", icon: User, type: "text", placeholder: "Tenant's full name" },
                  { name: "Email", label: "Email", icon: Mail, type: "email", placeholder: "Tenant's email" },
                  { name: "PhoneNumber", label: "Phone Number", icon: Phone, type: "tel", placeholder: "Phone number" },
                  { name: "NationalIdNumber", label: "National ID Number", icon: Key, type: "text", placeholder: "ID number" },
                  { name: "DateMovedIn", label: "Move-in Date", icon: Calendar, type: "date", placeholder: "" },
                ].map(({ name, label, icon: Icon, type, placeholder }) => (
                  <div key={name} className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <Icon className="h-3.5 w-3.5" /> {label}
                    </label>
                    <Input name={name} type={type} value={(formData as any)[name]} onChange={handleInputChange} placeholder={placeholder} required />
                  </div>
                ))}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <Home className="h-3.5 w-3.5" /> Property
                  </label>
                  <select name="PropertyId" className={selectCls} value={formData.PropertyId} onChange={handleInputChange} required disabled={isLoadingProperties}>
                    <option value="">Select a property</option>
                    {properties.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.address}</option>)}
                  </select>
                </div>
              </div>

              {/* Tenancy details */}
              <div className="pt-4 border-t border-slate-100">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Tenancy Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Unit / Room</label>
                    <select name="UnitId" className={selectCls} value={formData.UnitId} onChange={handleInputChange}>
                      <option value="">Select unit</option>
                      {["A1","A2","B1","B2","C1","C2"].map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Water Meter No.</label>
                    <Input name="WaterMeterNo" value={formData.WaterMeterNo} onChange={handleInputChange} placeholder="e.g. WM-00123" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tenant Status</label>
                    <select name="TenantStatus" className={selectCls} value={formData.TenantStatus} onChange={handleInputChange}>
                      <option value="active">Active</option>
                      <option value="left">Left</option>
                      <option value="pending payment">Pending Payment</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Occupation</label>
                    <Input name="Occupation" value={formData.Occupation} onChange={handleInputChange} placeholder="e.g. Teacher, Engineer…" />
                  </div>
                </div>

                <p className="mb-3 mt-5 text-xs font-semibold uppercase tracking-wider text-slate-400">Next of Kin</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Name</label>
                    <Input name="NextOfKinName" value={formData.NextOfKinName} onChange={handleInputChange} placeholder="Full name" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Contact</label>
                    <Input name="NextOfKinPhone" value={formData.NextOfKinPhone} onChange={handleInputChange} placeholder="Phone number" />
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div className="pt-4 border-t border-slate-100">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Current Documents</p>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { src: buildImageUrl(formData.passportPhoto), label: "Passport" },
                    { src: buildImageUrl(formData.idFront), label: "ID Front" },
                    { src: buildImageUrl(formData.idBack), label: "ID Back" },
                  ].map(({ src, label }) => (
                    <div key={label} className="space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</p>
                      <div className="h-28 overflow-hidden rounded-xl border border-slate-200">
                        <img src={src} alt={label} className="h-full w-full object-cover" />
                      </div>
                    </div>
                  ))}
                </div>

                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Replace Documents</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {uploadBox("Passport Photo", Camera, passportPhoto, passportPhotoPreview, "PassportPhoto", "passportPhotoInput")}
                  {uploadBox("ID Front", CreditCard, idFrontPhoto, idFrontPhotoPreview, "IdFront", "idFrontInput")}
                  {uploadBox("ID Back", CreditCard, idBackPhoto, idBackPhotoPreview, "IdBack", "idBackInput")}
                </div>
              </div>
            </form>
          )}
        </div>
      </Modal>

      {/* ── Record Payment Modal ── */}
      {paymentModalOpen && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="bg-gradient-to-r from-emerald-700 to-emerald-500 px-6 py-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-200">Record Payment</p>
                  <h2 className="mt-0.5 text-xl font-bold">{selectedTenant.fullName}</h2>
                  <p className="mt-0.5 text-sm text-emerald-100">
                    Balance due: {formatCurrency(selectedTenant.balanceDue, selectedTenant.property.currency)}
                  </p>
                </div>
                <button
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                  onClick={() => setPaymentModalOpen(false)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Amount ({selectedTenant.property.currency}) *
                </label>
                <Input type="number" placeholder="e.g. 350000" value={paymentForm.amount}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Date *</label>
                  <Input type="date" value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm((p) => ({ ...p, paymentDate: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Method</label>
                  <select className={selectCls} value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm((p) => ({ ...p, paymentMethod: e.target.value }))}>
                    <option value="Cash">Cash</option>
                    <option value="Mobile Money">Mobile Money</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Reference / Receipt No.</label>
                <Input placeholder="Optional transaction reference" value={paymentForm.referenceNo}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, referenceNo: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Notes</label>
                <Input placeholder="Optional notes" value={paymentForm.notes}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                onClick={() => setPaymentModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                disabled={isSubmittingPayment}
                onClick={handleRecordPayment}
              >
                {isSubmittingPayment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        title="Delete Tenant"
        isOpen={isDeleteModalOpen}
        tenantName={deleteTenant?.fullName || ""}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => { if (deleteTenant) handleDeleteTenant(deleteTenant.id); }}
      />
    </div>
  );
};

export default ManageTenants;
