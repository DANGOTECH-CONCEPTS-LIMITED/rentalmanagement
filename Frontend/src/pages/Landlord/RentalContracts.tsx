import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Edit, Trash2, Eye, Filter, Download, FilePlus,
  X, Calendar, User, Home, DollarSign, AlertTriangle,
  CheckCircle2, Clock, XCircle, Loader2, RefreshCw, Phone, CreditCard, ScrollText,
} from 'lucide-react';
import { DataTable, Column } from '@/components/ui/data-table';
import { useToast } from '@/hooks/use-toast';
import ContractGenerator from '@/components/contract/ContractGenerator';
import jsPDF from 'jspdf';
import { useBranding } from '@/context/BrandingContext';

const apiUrl = import.meta.env.VITE_API_BASE_URL;

const inputCls =
  'h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-sm text-[#0F172A] ' +
  'placeholder:text-[#94A3B8] shadow-sm outline-none transition-all ' +
  'focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10';

const selCls =
  'h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-sm text-[#0F172A] ' +
  'shadow-sm outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 cursor-pointer';

// ── API contract shape (matches backend RentalContract entity) ────────────────
interface Contract {
  id: number;
  contractNumber: string;
  tenantId?: number;
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  propertyId?: number;
  propertyName: string;
  unitId?: number;
  unitName: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  currency: string;
  securityDeposit: number;
  status: string;
  terms?: string;
  createdAt: string;
}

interface Tenant {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  propertyId?: number;
  propertyUnitId?: number;
}

interface Property {
  id: number;
  name: string;
  address?: string;
}

interface PropertyUnit {
  id: number;
  propertyId: number;
  unitNumber: string;
  monthlyAmount: number;
  securityDeposit: number;
  status: string;
}

interface CreateContractDto {
  tenantId?: number;
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  propertyId?: number;
  propertyName: string;
  unitId?: number;
  unitName: string;
  startDate: string;
  endDate: string;
  openEnded?: boolean;
  rentAmount: number;
  currency: string;
  securityDeposit: number;
  status: string;
  terms: string;
  ownerId: number;
}

const emptyForm: CreateContractDto = {
  tenantId: undefined, tenantName: '', tenantEmail: '', tenantPhone: '',
  propertyId: undefined, propertyName: '', unitId: undefined, unitName: '',
  startDate: '', endDate: '',
  rentAmount: 0, currency: 'UGX', securityDeposit: 0,
  status: 'pending', terms: '', ownerId: 0,
};

// ── Status badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const s = status?.toLowerCase();
  if (s === 'active')
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
        <CheckCircle2 className="h-3 w-3" /> Active
      </span>
    );
  if (s === 'expired' || s === 'terminated')
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-100 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
        <XCircle className="h-3 w-3" /> {status}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
      <Clock className="h-3 w-3" /> Pending
    </span>
  );
};

// ── KPI card ──────────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, icon: Icon, iconBg, iconColor, accent }: {
  label: string; value: number; icon: React.ElementType;
  iconBg: string; iconColor: string; accent: string;
}) => (
  <div className={`rounded-2xl border-l-4 border border-slate-200 bg-white p-5 shadow-sm ${accent}`}>
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-1.5 text-2xl font-bold text-[#0F172A]">{value}</p>
      </div>
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
    </div>
  </div>
);

// ── Detail row ────────────────────────────────────────────────────────────────
const DetailRow = ({ icon: Icon, label, value }: {
  icon: React.ElementType; label: string; value: React.ReactNode;
}) => (
  <div className="flex items-start gap-3 border-b border-slate-100 py-3 last:border-0">
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100">
      <Icon className="h-3.5 w-3.5 text-slate-500" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <div className="mt-0.5 text-sm font-medium text-[#0F172A]">{value}</div>
    </div>
  </div>
);

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (d: string) => {
  if (!d || d.startsWith('0001')) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtPeriod = (startDate: string, endDate: string) => {
  const start = fmtDate(startDate);
  const isOpen = !endDate || endDate.startsWith('0001') || endDate === '';
  return isOpen ? `${start} → Open-ended` : `${start} → ${fmtDate(endDate)}`;
};

// ── Contract form fields (module-level so React never remounts it) ────────────
const ContractFields = ({
  form, setForm, tenants, properties, token,
}: {
  form: CreateContractDto;
  setForm: React.Dispatch<React.SetStateAction<CreateContractDto>>;
  tenants: Tenant[];
  properties: Property[];
  token: string;
}) => {
  const [units, setUnits] = useState<PropertyUnit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  const fetchUnits = async (propertyId: number, autoSelectUnitId?: number) => {
    setLoadingUnits(true);
    try {
      const res = await fetch(`${apiUrl}/GetPropertyUnitsByPropertyId/${propertyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: PropertyUnit[] = await res.json();
        // Show only available units, plus the currently-assigned unit when editing
        setUnits(data.filter(u =>
          u.status?.toLowerCase() === 'available' ||
          (autoSelectUnitId && u.id === autoSelectUnitId)
        ));
        if (autoSelectUnitId) {
          const u = data.find(x => x.id === autoSelectUnitId);
          if (u) {
            setForm(f => ({
              ...f,
              unitId: u.id,
              unitName: u.unitNumber,
              rentAmount: u.monthlyAmount || f.rentAmount,
              securityDeposit: u.securityDeposit || f.securityDeposit,
            }));
          }
        }
      }
    } finally {
      setLoadingUnits(false);
    }
  };

  // When editing a contract that already has a property selected, load its units on mount
  useEffect(() => {
    if (form.propertyId) fetchUnits(form.propertyId);
  }, []);

  const selectedTenant = tenants.find(t => t.id === form.tenantId);

  const handleTenantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    const t = tenants.find(x => x.id === id);
    if (t) {
      const p = properties.find(x => x.id === t.propertyId);
      setForm(f => ({
        ...f,
        tenantId: t.id,
        tenantName: t.fullName,
        tenantEmail: t.email,
        tenantPhone: t.phoneNumber,
        propertyId: t.propertyId ?? f.propertyId,
        propertyName: p?.name ?? f.propertyName,
        unitId: undefined,
        unitName: '',
      }));
      if (t.propertyId) {
        setUnits([]);
        fetchUnits(t.propertyId, t.propertyUnitId);
      }
    } else {
      setForm(f => ({ ...f, tenantId: undefined, tenantName: '', tenantEmail: '', tenantPhone: '', propertyId: undefined, propertyName: '', unitId: undefined, unitName: '' }));
      setUnits([]);
    }
  };

  const handlePropertyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    const p = properties.find(x => x.id === id);
    setUnits([]);
    if (p) {
      setForm(f => ({ ...f, propertyId: p.id, propertyName: p.name, unitId: undefined, unitName: '' }));
      fetchUnits(p.id);
    } else {
      setForm(f => ({ ...f, propertyId: undefined, propertyName: '', unitId: undefined, unitName: '' }));
    }
  };

  const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    const u = units.find(x => x.id === id);
    if (u) {
      setForm(f => ({
        ...f,
        unitId: u.id,
        unitName: u.unitNumber,
        rentAmount: u.monthlyAmount,
        securityDeposit: u.securityDeposit,
      }));
    } else {
      setForm(f => ({ ...f, unitId: undefined, unitName: '' }));
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B]">Tenant *</label>
        <select className={selCls} value={form.tenantId ?? ''} onChange={handleTenantChange}>
          <option value="">— Select tenant —</option>
          {tenants.map(t => (
            <option key={t.id} value={t.id}>{t.fullName}</option>
          ))}
        </select>
        {selectedTenant && (
          <div className="mt-2 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
              <Phone className="h-3 w-3 shrink-0 text-slate-400" />
              {selectedTenant.phoneNumber || '—'}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
              <User className="h-3 w-3 shrink-0 text-slate-400" />
              {selectedTenant.email || '—'}
            </span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B]">Property *</label>
          <select className={selCls} value={form.propertyId ?? ''} onChange={handlePropertyChange}>
            <option value="">— Select property —</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B]">Unit</label>
          <select
            className={selCls}
            value={form.unitId ?? ''}
            onChange={handleUnitChange}
            disabled={!form.propertyId || loadingUnits}
          >
            <option value="">
              {loadingUnits ? 'Loading…' : form.propertyId ? '— Select unit —' : '— Select property first —'}
            </option>
            {units.map(u => {
              const isCurrent = u.id === form.unitId;
              const isOccupied = !isCurrent && u.status?.toLowerCase() === 'occupied';
              if (isOccupied) return null;
              return (
                <option key={u.id} value={u.id}>
                  {u.unitNumber} — {form.currency} {u.monthlyAmount.toLocaleString()}/mo{isCurrent ? ' (current)' : ''}
                </option>
              );
            })}
          </select>
          {form.propertyId && !loadingUnits && units.filter(u => u.status?.toLowerCase() !== 'occupied').length === 0 && (
            <p className="text-xs text-amber-600 mt-1">All units in this property are currently occupied.</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B]">Start Date *</label>
          <input type="date" className={inputCls} value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B]">
            End Date {form.openEnded ? <span className="normal-case font-normal text-slate-400 ml-1">(open-ended)</span> : '*'}
          </label>
          <input
            type="date"
            className={`${inputCls} ${form.openEnded ? 'opacity-40 cursor-not-allowed bg-slate-50' : ''}`}
            value={form.endDate}
            onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
            disabled={!!form.openEnded}
          />
        </div>
      </div>
      <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-[#1D4ED8] accent-[#1D4ED8]"
          checked={!!form.openEnded}
          onChange={e => setForm(f => ({ ...f, openEnded: e.target.checked, endDate: e.target.checked ? '' : f.endDate }))}
        />
        <span className="text-sm text-slate-600">Open-ended contract <span className="text-slate-400 text-xs">(no fixed end date)</span></span>
      </label>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B]">Monthly Rent *</label>
          <input type="number" min={0} className={inputCls} value={form.rentAmount || ''} onChange={e => setForm(f => ({ ...f, rentAmount: Number(e.target.value) }))} placeholder="0" />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B]">Security Deposit</label>
          <input type="number" min={0} className={inputCls} value={form.securityDeposit || ''} onChange={e => setForm(f => ({ ...f, securityDeposit: Number(e.target.value) }))} placeholder="0" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B]">Currency</label>
          <select className={selCls} value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
            <option value="UGX">UGX</option>
            <option value="USD">USD</option>
            <option value="KES">KES</option>
            <option value="TZS">TZS</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B]">Status</label>
          <select className={selCls} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="terminated">Terminated</option>
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B]">Terms &amp; Conditions</label>
        <textarea
          rows={4}
          className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-3 text-sm text-[#0F172A] placeholder:text-[#94A3B8] shadow-sm outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 resize-none"
          value={form.terms}
          onChange={e => setForm(f => ({ ...f, terms: e.target.value }))}
          placeholder="Describe the rental terms, utilities, pet policy, etc."
        />
      </div>
    </div>
  );
};

// ── Component ─────────────────────────────────────────────────────────────────
const RentalContracts = () => {
  const { toast } = useToast();
  const userData = JSON.parse(localStorage.getItem('user') || '{}');
  const token = userData?.token;

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showContractGenerator, setShowContractGenerator] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const [viewContract, setViewContract] = useState<Contract | null>(null);
  const [editContract, setEditContract] = useState<Contract | null>(null);
  const [editForm, setEditForm] = useState<CreateContractDto>(emptyForm);
  const [addForm, setAddForm] = useState<CreateContractDto>({ ...emptyForm, ownerId: userData?.id ?? 0 });
  const [deleteContract, setDeleteContract] = useState<Contract | null>(null);

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);

  const { branding } = useBranding();

  // ── Fetch tenants ─────────────────────────────────────────────────────────
  const fetchTenants = async () => {
    try {
      const res = await fetch(`${apiUrl}/GetAllTenants`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setTenants(await res.json());
    } catch {
      // non-critical
    }
  };

  // ── Fetch properties ──────────────────────────────────────────────────────
  const fetchProperties = async () => {
    try {
      const res = await fetch(`${apiUrl}/GetPropertiesByLandLordId/${userData.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setProperties(await res.json());
    } catch {
      // non-critical
    }
  };

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchContracts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${apiUrl}/GetContractsByOwnerId/${userData.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load contracts');
      setContracts(await res.json());
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: (e as Error).message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchContracts(); fetchTenants(); fetchProperties(); }, []);

  // ── Create ────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!addForm.tenantId || !addForm.propertyName || !addForm.startDate || (!addForm.openEnded && !addForm.endDate)) {
      toast({ variant: 'destructive', title: 'Missing fields', description: 'Please select a tenant and fill in property, start date, and end date (or mark as open-ended).' });
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`${apiUrl}/CreateContract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...addForm, ownerId: userData.id }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: 'Contract created', description: 'The rental agreement has been saved.' });
      setShowAddModal(false);
      setAddForm({ ...emptyForm, ownerId: userData?.id ?? 0 });
      fetchContracts();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: (e as Error).message });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Update ────────────────────────────────────────────────────────────────
  const handleEditSave = async () => {
    if (!editContract) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${apiUrl}/UpdateContract`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: editContract.id, ...editForm }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: 'Contract updated', description: 'Changes saved successfully.' });
      setEditContract(null);
      fetchContracts();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: (e as Error).message });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteContract) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${apiUrl}/DeleteContract/${deleteContract.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: 'Contract deleted' });
      setDeleteContract(null);
      fetchContracts();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: (e as Error).message });
    } finally {
      setIsDeleting(false);
    }
  };

  const openEdit = (c: Contract) => {
    setEditContract(c);
    setEditForm({
      tenantId: c.tenantId, tenantName: c.tenantName, tenantEmail: c.tenantEmail, tenantPhone: c.tenantPhone,
      propertyId: c.propertyId, propertyName: c.propertyName,
      unitId: c.unitId, unitName: c.unitName,
      startDate: c.startDate?.slice(0, 10) ?? '', endDate: c.endDate?.slice(0, 10) ?? '',
      openEnded: !c.endDate || c.endDate.startsWith('0001'),
      rentAmount: c.rentAmount, currency: c.currency, securityDeposit: c.securityDeposit,
      status: c.status, terms: c.terms ?? '', ownerId: userData?.id ?? 0,
    });
  };

  const downloadContractPDF = (c: Contract, branding: { companyName?: string; logoDataUrl?: string } = {}) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW  = doc.internal.pageSize.getWidth();
    const pageH  = doc.internal.pageSize.getHeight();
    const margin = 16;
    const cW     = pageW - margin * 2;
    let y = 0;

    const landlordName = userData?.fullName || 'Property Owner';
    const isOpen = !c.endDate || c.endDate.startsWith('0001') || c.endDate === '';

    // ── Reusable footer (drawn on every page at end) ─────────────────────────
    const drawFooter = (pageNum: number, totalPages: number) => {
      doc.setFillColor(10, 18, 40);
      doc.rect(0, pageH - 11, pageW, 11, 'F');
      doc.setFillColor(29, 78, 216);
      doc.rect(0, pageH - 11, 3, 11, 'F');
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      const co = branding.companyName || 'Rental Management System';
      doc.text(`${c.contractNumber}  ·  ${co}  ·  Generated ${new Date().toLocaleDateString('en-GB')}`, margin, pageH - 4);
      doc.text(`Page ${pageNum} / ${totalPages}`, pageW - margin, pageH - 4, { align: 'right' });
    };

    const checkNewPage = (need = 20) => {
      if (y + need > pageH - 18) { doc.addPage(); y = 20; }
    };

    // ════════════════════════════════════════════════════════════════════════
    // HEADER
    // ════════════════════════════════════════════════════════════════════════
    // Dark background
    doc.setFillColor(10, 18, 40);
    doc.rect(0, 0, pageW, 54, 'F');
    // Blue accent strip at bottom of header
    doc.setFillColor(29, 78, 216);
    doc.rect(0, 50, pageW, 4, 'F');
    // Left gold accent bar
    doc.setFillColor(234, 179, 8);
    doc.rect(0, 0, 4, 54, 'F');

    // Logo or initials circle
    const logoX = margin + 2;
    const logoY = 9;
    if (branding.logoDataUrl) {
      try {
        doc.addImage(branding.logoDataUrl, 'PNG', logoX, logoY, 26, 26);
      } catch { /* skip */ }
    } else if (branding.companyName) {
      doc.setFillColor(29, 78, 216);
      doc.roundedRect(logoX, logoY, 26, 26, 4, 4, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      const ini = branding.companyName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
      doc.text(ini, logoX + 13, logoY + 17, { align: 'center' });
    }

    const headerTextX = (branding.logoDataUrl || branding.companyName) ? logoX + 30 : margin + 2;

    if (branding.companyName) {
      doc.setTextColor(234, 179, 8);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(branding.companyName.toUpperCase(), headerTextX, 16);
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.text('Property Management', headerTextX, 22);
    }

    // Title block (right-aligned)
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('RENTAL AGREEMENT', pageW - margin, branding.companyName ? 20 : 22, { align: 'right' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`Contract:  ${c.contractNumber}`, pageW - margin, 28, { align: 'right' });
    doc.text(`Issued:      ${fmtDate(c.createdAt)}`, pageW - margin, 34, { align: 'right' });
    doc.text(`Period:     ${fmtPeriod(c.startDate, c.endDate)}`, pageW - margin, 40, { align: 'right' });

    // Status badge
    const sActive  = c.status?.toLowerCase() === 'active';
    const sExpired = ['expired', 'terminated'].includes(c.status?.toLowerCase());
    if (sActive)       doc.setFillColor(16, 185, 129);
    else if (sExpired) doc.setFillColor(239, 68, 68);
    else               doc.setFillColor(245, 158, 11);
    doc.roundedRect(pageW - margin - 32, 43, 32, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text(c.status.toUpperCase(), pageW - margin - 16, 48.5, { align: 'center' });

    y = 62;

    // ════════════════════════════════════════════════════════════════════════
    // HELPERS
    // ════════════════════════════════════════════════════════════════════════
    const sectionBar = (title: string) => {
      checkNewPage(16);
      doc.setFillColor(15, 23, 42);
      doc.roundedRect(margin, y, cW, 8.5, 1.5, 1.5, 'F');
      doc.setFillColor(234, 179, 8);
      doc.roundedRect(margin, y, 3, 8.5, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text(title, margin + 7, y + 6);
      y += 13;
    };

    const card = (x: number, cardY: number, w: number, h: number, fill: [number,number,number] = [248,250,252]) => {
      doc.setFillColor(...fill);
      doc.roundedRect(x, cardY, w, h, 2, 2, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.roundedRect(x, cardY, w, h, 2, 2, 'S');
    };

    const cardLabel = (label: string, x: number, cy: number) => {
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(label.toUpperCase(), x, cy);
    };

    const cardValue = (value: string, x: number, cy: number, large = false, color: [number,number,number] = [15,23,42]) => {
      doc.setTextColor(...color);
      doc.setFontSize(large ? 12 : 9);
      doc.setFont('helvetica', 'bold');
      doc.text(value || '—', x, cy);
    };

    const fieldRow = (label: string, value: string, lastRow = false) => {
      checkNewPage(9);
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, cW, 8.5, 'F');
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(label, margin + 4, y + 5.8);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(value || '—', margin + 52, y + 5.8);
      if (!lastRow) {
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.15);
        doc.line(margin, y + 8.5, margin + cW, y + 8.5);
      }
      y += 8.5;
    };

    // ════════════════════════════════════════════════════════════════════════
    // 1. PARTIES
    // ════════════════════════════════════════════════════════════════════════
    sectionBar('01  PARTIES TO THIS AGREEMENT');

    const halfW = (cW - 4) / 2;
    const partyH = 34;
    card(margin, y, halfW, partyH, [238, 242, 255]);
    doc.setFillColor(29, 78, 216);
    doc.roundedRect(margin, y, 3, partyH, 1, 1, 'F');
    cardLabel('Tenant', margin + 6, y + 7);
    cardValue(c.tenantName, margin + 6, y + 15);
    if (c.tenantPhone) {
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Tel: ${c.tenantPhone}`, margin + 6, y + 22);
    }
    if (c.tenantEmail) {
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Email: ${c.tenantEmail}`, margin + 6, y + 28);
    }

    card(margin + halfW + 4, y, halfW, partyH);
    doc.setFillColor(234, 179, 8);
    doc.roundedRect(margin + halfW + 4, y, 3, partyH, 1, 1, 'F');
    cardLabel('Landlord / Owner', margin + halfW + 10, y + 7);
    cardValue(landlordName, margin + halfW + 10, y + 15);

    y += partyH + 7;

    // ════════════════════════════════════════════════════════════════════════
    // 2. PROPERTY
    // ════════════════════════════════════════════════════════════════════════
    checkNewPage(40);
    sectionBar('02  PROPERTY DETAILS');
    fieldRow('Property Name', c.propertyName);
    fieldRow('Unit / Room', c.unitName || 'Not specified', true);
    y += 6;

    // ════════════════════════════════════════════════════════════════════════
    // 3. FINANCIAL TERMS
    // ════════════════════════════════════════════════════════════════════════
    checkNewPage(50);
    sectionBar('03  FINANCIAL TERMS');

    const thirdW = (cW - 8) / 3;
    const finH = 30;

    // Monthly rent — highlighted card
    card(margin, y, thirdW, finH, [238, 242, 255]);
    doc.setFillColor(29, 78, 216);
    doc.roundedRect(margin, y, 3, finH, 1, 1, 'F');
    cardLabel('Monthly Rent', margin + 6, y + 8);
    cardValue(`${c.currency} ${c.rentAmount.toLocaleString()}`, margin + 6, y + 20, true, [29, 78, 216]);

    // Security deposit
    card(margin + thirdW + 4, y, thirdW, finH);
    cardLabel('Security Deposit', margin + thirdW + 8, y + 8);
    cardValue(`${c.currency} ${c.securityDeposit.toLocaleString()}`, margin + thirdW + 8, y + 20);

    // Currency
    card(margin + (thirdW + 4) * 2, y, thirdW, finH);
    cardLabel('Currency', margin + (thirdW + 4) * 2 + 4, y + 8);
    cardValue(c.currency, margin + (thirdW + 4) * 2 + 4, y + 20, true);

    y += finH + 7;

    // ════════════════════════════════════════════════════════════════════════
    // 4. CONTRACT PERIOD
    // ════════════════════════════════════════════════════════════════════════
    checkNewPage(50);
    sectionBar('04  CONTRACT PERIOD');

    const dateH = 24;
    card(margin, y, halfW, dateH, [240, 253, 244]);
    doc.setFillColor(16, 185, 129);
    doc.roundedRect(margin, y, 3, dateH, 1, 1, 'F');
    cardLabel('Start Date', margin + 6, y + 8);
    cardValue(fmtDate(c.startDate), margin + 6, y + 18);

    card(margin + halfW + 4, y, halfW, dateH, isOpen ? [255, 251, 235] : [248, 250, 252]);
    doc.setFillColor(isOpen ? 245 : 100, isOpen ? 158 : 116, isOpen ? 11 : 139);
    doc.roundedRect(margin + halfW + 4, y, 3, dateH, 1, 1, 'F');
    cardLabel(isOpen ? 'End Date' : 'End Date', margin + halfW + 10, y + 8);
    cardValue(isOpen ? 'Open-ended' : fmtDate(c.endDate), margin + halfW + 10, y + 18, false, isOpen ? [180, 83, 9] : [15, 23, 42]);

    y += dateH + 4;

    if (!isOpen) {
      const ms = new Date(c.endDate).getTime() - new Date(c.startDate).getTime();
      const months = Math.round(ms / (1000 * 60 * 60 * 24 * 30.44));
      if (months > 0) {
        doc.setFillColor(238, 242, 255);
        doc.roundedRect(margin, y, cW, 8, 2, 2, 'F');
        doc.setTextColor(29, 78, 216);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(`Duration: ${months} month${months !== 1 ? 's' : ''}`, margin + 5, y + 5.5);
        y += 8;
      }
    } else {
      doc.setFillColor(255, 251, 235);
      doc.roundedRect(margin, y, cW, 8, 2, 2, 'F');
      doc.setTextColor(180, 83, 9);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('This is an open-ended contract with no fixed termination date. Either party may terminate with proper notice.', margin + 5, y + 5.5);
      y += 8;
    }
    y += 7;

    // ════════════════════════════════════════════════════════════════════════
    // 5. TERMS & CONDITIONS
    // ════════════════════════════════════════════════════════════════════════
    if (c.terms) {
      checkNewPage(30);
      sectionBar('05  TERMS & CONDITIONS');
      doc.setFillColor(248, 250, 252);
      const termsLines = doc.splitTextToSize(c.terms, cW - 10);
      const termsH = termsLines.length * 5.5 + 8;
      card(margin, y, cW, Math.min(termsH, pageH - y - 20));
      let ty = y + 7;
      doc.setTextColor(51, 65, 85);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      termsLines.forEach((line: string) => {
        checkNewPage(8);
        doc.text(line, margin + 5, ty);
        ty += 5.5;
        y = ty;
      });
      y += 10;
    }

    // ════════════════════════════════════════════════════════════════════════
    // 6. ACKNOWLEDGEMENT & SIGNATURES
    // ════════════════════════════════════════════════════════════════════════
    checkNewPage(70);
    sectionBar('06  SIGNATURES & ACKNOWLEDGEMENT');

    // Acknowledgement text
    doc.setFillColor(255, 251, 235);
    doc.roundedRect(margin, y, cW, 12, 2, 2, 'F');
    doc.setFillColor(234, 179, 8);
    doc.roundedRect(margin, y, 3, 12, 1, 1, 'F');
    doc.setTextColor(120, 80, 0);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const ackLines = doc.splitTextToSize(
      'By signing below, both parties confirm they have read, understood, and agree to all terms of this rental agreement.',
      cW - 10
    );
    ackLines.forEach((l: string, i: number) => doc.text(l, margin + 7, y + 5 + i * 5.5));
    y += 18;

    // Signature boxes
    const sigW = halfW;
    const sigH = 40;

    // Landlord box
    card(margin, y, sigW, sigH);
    doc.setFillColor(29, 78, 216);
    doc.roundedRect(margin, y, 3, sigH, 1, 1, 'F');
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('LANDLORD / OWNER', margin + 7, y + 8);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.text(landlordName, margin + 7, y + 16);
    doc.setDrawColor(200, 210, 225);
    doc.setLineWidth(0.4);
    doc.line(margin + 7, y + 30, margin + sigW - 6, y + 30);
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Signature', margin + 7, y + 35);
    doc.text('Date: ____________________', margin + sigW / 2, y + 35);

    // Tenant box
    const sig2X = margin + sigW + 4;
    card(sig2X, y, sigW, sigH);
    doc.setFillColor(234, 179, 8);
    doc.roundedRect(sig2X, y, 3, sigH, 1, 1, 'F');
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('TENANT', sig2X + 7, y + 8);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.text(c.tenantName, sig2X + 7, y + 16);
    doc.setDrawColor(200, 210, 225);
    doc.line(sig2X + 7, y + 30, sig2X + sigW - 6, y + 30);
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Signature', sig2X + 7, y + 35);
    doc.text('Date: ____________________', sig2X + sigW / 2, y + 35);

    // ── Draw footer on all pages ─────────────────────────────────────────────
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      drawFooter(i, totalPages);
    }

    doc.save(`${c.contractNumber}-${c.tenantName.replace(/\s+/g, '-')}.pdf`);
  };

  const filteredContracts = contracts.filter(c =>
    (c.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.propertyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contractNumber.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (filterStatus === 'all' || c.status?.toLowerCase() === filterStatus)
  );

  const activeCount  = contracts.filter(c => c.status?.toLowerCase() === 'active').length;
  const expiredCount = contracts.filter(c => ['expired', 'terminated'].includes(c.status?.toLowerCase())).length;
  const pendingCount = contracts.filter(c => c.status?.toLowerCase() === 'pending').length;

  const selectCls =
    'h-9 rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm text-[#0F172A] shadow-sm ' +
    'outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 cursor-pointer';

  // ── Table columns ─────────────────────────────────────────────────────────
  const contractColumns: Column<Contract>[] = [
    {
      key: 'contractNumber',
      header: 'Contract ID',
      cell: (c) => (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#1D4ED8]/10">
            <FileText className="h-3.5 w-3.5 text-[#1D4ED8]" />
          </div>
          <span className="font-mono text-xs font-semibold text-[#0F172A]">{c.contractNumber}</span>
        </div>
      ),
    },
    {
      key: 'tenantName',
      header: 'Tenant',
      cell: (c) => (
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-[#1D4ED8]">
            {c.tenantName.charAt(0)}
          </span>
          <span className="text-sm font-medium text-[#0F172A]">{c.tenantName}</span>
        </div>
      ),
    },
    {
      key: 'propertyName',
      header: 'Property / Unit',
      cell: (c) => (
        <span className="flex items-center gap-1.5 text-sm text-slate-600">
          <Home className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          {c.propertyName}{c.unitName ? ` — ${c.unitName}` : ''}
        </span>
      ),
    },
    {
      key: 'startDate',
      header: 'Period',
      cell: (c) => (
        <span className="flex items-center gap-1.5 text-sm text-slate-500">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          {fmtPeriod(c.startDate, c.endDate)}
        </span>
      ),
    },
    {
      key: 'rentAmount',
      header: 'Rent Per Room/mo',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (c) => (
        <span className="text-sm font-semibold text-[#0F172A]">
          {c.currency} {c.rentAmount.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (c) => <StatusBadge status={c.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (c) => (
        <div className="flex items-center justify-end gap-1">
          <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-blue-50 hover:text-[#1D4ED8] transition-colors" onClick={() => setViewContract(c)} title="View">
            <Eye className="h-4 w-4" />
          </button>
          <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors" onClick={() => openEdit(c)} title="Edit">
            <Edit className="h-4 w-4" />
          </button>
          <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-blue-50 hover:text-[#1D4ED8] transition-colors" title="Download PDF" onClick={() => downloadContractPDF(c, branding)}>
            <Download className="h-4 w-4" />
          </button>
          <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors" onClick={() => setDeleteContract(c)} title="Delete">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">

      {/* ── Hero banner ── */}
      <section className="relative overflow-hidden rounded-2xl px-8 py-8 text-white shadow-xl" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0f2044 45%, #1a3a6e 100%)" }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-200">
              Contract Desk
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Rental Contracts</h1>
              <p className="mt-1 text-sm text-blue-200">Search, review, and generate rental agreements in one place.</p>
            </div>
            <div className="flex flex-wrap gap-3 pt-1">
              {[
                { label: 'Total', value: contracts.length },
                { label: 'Active', value: activeCount, color: 'text-emerald-300' },
                { label: 'Pending', value: pendingCount, color: 'text-amber-300' },
                { label: 'Expired', value: expiredCount, color: 'text-red-300' },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-1.5">
                  <span className={`text-sm font-bold ${s.color ?? 'text-white'}`}>{s.value}</span>
                  <span className="text-xs text-blue-200">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            <button
              onClick={fetchContracts}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white px-5 py-2.5 text-sm font-bold text-[#1D4ED8] shadow-sm hover:bg-blue-50 transition-colors"
            >
              <FilePlus className="h-4 w-4" />
              New Contract
            </button>
            <button
              onClick={() => setShowContractGenerator(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
            >
              <ScrollText className="h-4 w-4" />
              AI Generator
            </button>
          </div>
        </div>
      </section>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Active Contracts"  value={activeCount}  icon={CheckCircle2} iconBg="bg-emerald-50" iconColor="text-emerald-600" accent="border-l-emerald-500" />
        <KpiCard label="Pending Contracts" value={pendingCount} icon={Clock}         iconBg="bg-amber-50"   iconColor="text-amber-600"   accent="border-l-amber-500" />
        <KpiCard label="Expired Contracts" value={expiredCount} icon={XCircle}       iconBg="bg-red-50"     iconColor="text-red-500"     accent="border-l-red-400" />
      </div>

      {/* ── Table ── */}
      <DataTable
        data={filteredContracts}
        columns={contractColumns}
        loading={isLoading}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by tenant, property, or contract ID…"
        label="contract"
        pageSize={10}
        emptyMessage="No contracts found"
        emptyIcon={<FileText className="h-6 w-6 text-slate-300" />}
        headerRight={
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select className={selectCls} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="expired">Expired</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>
        }
      />

      {/* ── AI Contract Generator modal ── */}
      <AnimatePresence>
        {showContractGenerator && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
              <ContractGenerator onClose={() => setShowContractGenerator(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Add Contract modal ── */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[92vh]"
            >
              <div className="shrink-0 bg-gradient-to-r from-[#0F172A] to-[#1D4ED8] px-6 py-5 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                    <FilePlus className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-300">New Agreement</p>
                    <h2 className="text-lg font-bold">Create Rental Contract</h2>
                  </div>
                </div>
                <button onClick={() => setShowAddModal(false)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <ContractFields form={addForm} setForm={setAddForm} tenants={tenants} properties={properties} token={token} />
              </div>
              <div className="shrink-0 border-t border-slate-100 px-6 py-4 flex items-center justify-end gap-2">
                <button onClick={() => setShowAddModal(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button onClick={handleCreate} disabled={isSaving} className="btn-grid inline-flex items-center gap-2 rounded-xl bg-[#1D4ED8] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1e40af] disabled:opacity-50 transition-colors">
                  {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : 'Create Contract'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── View Modal ── */}
      <AnimatePresence>
        {viewContract && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
              <div className="bg-gradient-to-r from-[#0F172A] to-[#1D4ED8] px-6 py-5 text-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-300">Contract Details</p>
                    <h2 className="mt-0.5 text-xl font-bold">{viewContract.contractNumber}</h2>
                  </div>
                  <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors" onClick={() => setViewContract(null)}>
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3"><StatusBadge status={viewContract.status} /></div>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <DetailRow icon={User}        label="Tenant"          value={viewContract.tenantName} />
                <DetailRow icon={Phone}       label="Phone"           value={viewContract.tenantPhone || '—'} />
                <DetailRow icon={Home}        label="Property / Unit" value={`${viewContract.propertyName}${viewContract.unitName ? ` — ${viewContract.unitName}` : ''}`} />
                <DetailRow icon={Calendar}    label="Contract Period"  value={fmtPeriod(viewContract.startDate, viewContract.endDate)} />
                <DetailRow icon={DollarSign}  label="Monthly Rent"    value={`${viewContract.currency} ${viewContract.rentAmount.toLocaleString()}/mo`} />
                <DetailRow icon={CreditCard}  label="Security Deposit" value={`${viewContract.currency} ${viewContract.securityDeposit.toLocaleString()}`} />
                {viewContract.terms && (
                  <DetailRow icon={ScrollText} label="Terms" value={<span className="whitespace-pre-wrap text-xs leading-relaxed">{viewContract.terms}</span>} />
                )}
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
                <button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors" onClick={() => setViewContract(null)}>
                  Close
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-xl border border-[#1D4ED8] px-4 py-2 text-sm font-semibold text-[#1D4ED8] hover:bg-blue-50 transition-colors"
                  onClick={() => { downloadContractPDF(viewContract, branding); setViewContract(null); }}
                >
                  <Download className="h-3.5 w-3.5" /> Download PDF
                </button>
                <button
                  className="btn-grid inline-flex items-center gap-2 rounded-xl bg-[#1D4ED8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e40af] transition-colors"
                  onClick={() => { setViewContract(null); openEdit(viewContract); }}
                >
                  <Edit className="h-3.5 w-3.5" /> Edit Contract
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Edit Modal ── */}
      <AnimatePresence>
        {editContract && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[92vh]"
            >
              <div className="shrink-0 bg-gradient-to-r from-[#0F172A] to-[#1D4ED8] px-6 py-5 text-white flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-300">Edit Contract</p>
                  <h2 className="mt-0.5 text-xl font-bold">{editContract.contractNumber}</h2>
                </div>
                <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors" onClick={() => setEditContract(null)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <ContractFields form={editForm} setForm={setEditForm} tenants={tenants} properties={properties} token={token} />
              </div>
              <div className="shrink-0 flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
                <button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors" onClick={() => setEditContract(null)}>
                  Cancel
                </button>
                <button onClick={handleEditSave} disabled={isSaving} className="btn-grid inline-flex items-center gap-2 rounded-xl bg-[#1D4ED8] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1e40af] disabled:opacity-50 transition-colors">
                  {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirmation ── */}
      <AnimatePresence>
        {deleteContract && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
              <div className="bg-gradient-to-r from-red-600 to-red-500 px-6 py-5 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-red-200">Confirm Action</p>
                      <h2 className="text-lg font-bold">Delete Contract</h2>
                    </div>
                  </div>
                  <button className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors" onClick={() => setDeleteContract(null)}>
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="px-6 py-5">
                <p className="text-sm text-slate-600 leading-relaxed">
                  Are you sure you want to delete contract{' '}
                  <span className="font-semibold text-[#0F172A]">{deleteContract.contractNumber}</span> for{' '}
                  <span className="font-semibold text-[#0F172A]">{deleteContract.tenantName}</span>?
                  This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
                <button className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors" onClick={() => setDeleteContract(null)}>
                  Cancel
                </button>
                <button onClick={handleDelete} disabled={isDeleting} className="btn-grid flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
                  {isDeleting ? <><Loader2 className="h-4 w-4 animate-spin" /> Deleting…</> : 'Yes, Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default RentalContracts;
