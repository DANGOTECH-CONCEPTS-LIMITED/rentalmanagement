import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, Edit, Trash2, Eye, Filter, Download, FilePlus,
  X, Calendar, User, Home, DollarSign, AlertTriangle,
  CheckCircle2, Clock, XCircle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { DataTable, Column } from '@/components/ui/data-table';
import ContractGenerator from '@/components/contract/ContractGenerator';

interface Contract {
  id: string;
  tenant: string;
  property: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  status: 'active' | 'expired' | 'pending';
}

const emptyForm: Omit<Contract, 'id'> = {
  tenant: '', property: '', startDate: '', endDate: '', rentAmount: 0, status: 'active',
};

// ── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  if (status === 'active')
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
        <CheckCircle2 className="h-3 w-3" /> Active
      </span>
    );
  if (status === 'expired')
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-100 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
        <XCircle className="h-3 w-3" /> Expired
      </span>
    );
  if (status === 'pending')
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
        <Clock className="h-3 w-3" /> Pending
      </span>
    );
  return null;
};

// ── KPI card ─────────────────────────────────────────────────────────────────
interface KpiProps {
  label: string; value: number; icon: React.ElementType;
  iconBg: string; iconColor: string; accent: string;
}
const KpiCard = ({ label, value, icon: Icon, iconBg, iconColor, accent }: KpiProps) => (
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
const DetailRow = ({
  icon: Icon, label, value,
}: {
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

// ── Component ─────────────────────────────────────────────────────────────────
const RentalContracts = () => {
  const [isLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showContractGenerator, setShowContractGenerator] = useState(false);

  const [viewContract, setViewContract] = useState<Contract | null>(null);
  const [editContract, setEditContract] = useState<Contract | null>(null);
  const [editForm, setEditForm] = useState<Omit<Contract, 'id'>>(emptyForm);
  const [deleteContract, setDeleteContract] = useState<Contract | null>(null);

  const [contracts, setContracts] = useState<Contract[]>([
    { id: 'RC-001', tenant: 'John Smith', property: 'Sunset Apartments - Unit 101', startDate: '2023-01-01', endDate: '2023-12-31', rentAmount: 1200, status: 'active' },
    { id: 'RC-002', tenant: 'Sarah Johnson', property: 'Bayview Condos - Unit 305', startDate: '2023-03-15', endDate: '2024-03-14', rentAmount: 1500, status: 'active' },
    { id: 'RC-003', tenant: 'Michael Williams', property: 'Westside Heights - Unit 210', startDate: '2022-06-01', endDate: '2023-05-31', rentAmount: 1350, status: 'expired' },
    { id: 'RC-004', tenant: 'Emily Davis', property: 'Sunset Apartments - Unit 102', startDate: '2023-08-01', endDate: '2024-07-31', rentAmount: 1250, status: 'active' },
    { id: 'RC-005', tenant: 'Robert Miller', property: 'Parkview Residences - Unit 405', startDate: '2023-06-15', endDate: '2023-12-14', rentAmount: 1100, status: 'pending' },
  ]);

  const filteredContracts = contracts.filter(c =>
    (c.tenant.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.property.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (filterStatus === 'all' || c.status === filterStatus)
  );

  const openEdit = (contract: Contract) => {
    setEditContract(contract);
    setEditForm({ tenant: contract.tenant, property: contract.property, startDate: contract.startDate, endDate: contract.endDate, rentAmount: contract.rentAmount, status: contract.status });
  };

  const handleEditSave = () => {
    if (!editContract) return;
    setContracts(prev => prev.map(c => c.id === editContract.id ? { ...c, ...editForm } : c));
    setEditContract(null);
  };

  const handleDelete = () => {
    if (!deleteContract) return;
    setContracts(prev => prev.filter(c => c.id !== deleteContract.id));
    setDeleteContract(null);
  };

  const activeCount  = contracts.filter(c => c.status === 'active').length;
  const expiredCount = contracts.filter(c => c.status === 'expired').length;
  const pendingCount = contracts.filter(c => c.status === 'pending').length;

  const selectCls =
    'h-9 rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm text-[#0F172A] shadow-sm ' +
    'outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 cursor-pointer';

  const contractColumns: Column<Contract>[] = [
    {
      key: 'id',
      header: 'Contract ID',
      cell: (c) => (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#1D4ED8]/10">
            <FileText className="h-3.5 w-3.5 text-[#1D4ED8]" />
          </div>
          <span className="font-mono text-xs font-semibold text-[#0F172A]">{c.id}</span>
        </div>
      ),
    },
    {
      key: 'tenant',
      header: 'Tenant',
      cell: (c) => (
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-[#1D4ED8]">
            {c.tenant.charAt(0)}
          </span>
          <span className="text-sm font-medium text-[#0F172A]">{c.tenant}</span>
        </div>
      ),
    },
    {
      key: 'property',
      header: 'Property',
      cell: (c) => (
        <span className="flex items-center gap-1.5 text-sm text-slate-600">
          <Home className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          {c.property}
        </span>
      ),
    },
    {
      key: 'period',
      header: 'Period',
      cell: (c) => (
        <span className="flex items-center gap-1.5 text-sm text-slate-500">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          {c.startDate} → {c.endDate}
        </span>
      ),
    },
    {
      key: 'rent',
      header: 'Rent/mo',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (c) => (
        <span className="text-sm font-semibold text-[#0F172A]">
          ${c.rentAmount.toLocaleString()}
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
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-blue-50 hover:text-[#1D4ED8] transition-colors"
            onClick={() => setViewContract(c)} title="View"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            onClick={() => openEdit(c)} title="Edit"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-blue-50 hover:text-[#1D4ED8] transition-colors"
            title="Download"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
            onClick={() => setDeleteContract(c)} title="Delete"
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
              Contract Desk
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Rental Contracts</h1>
              <p className="mt-1 text-sm text-blue-200">Search, review, and generate rental agreements in one place.</p>
            </div>
            {/* Inline stats */}
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

          <button
            className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white px-5 py-2.5 text-sm font-bold text-[#1D4ED8] shadow-sm transition-colors hover:bg-blue-50 shrink-0"
            onClick={() => setShowContractGenerator(true)}
          >
            <FilePlus className="h-4 w-4" />
            Add New Contract
          </button>
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
              <option value="expired">Expired</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        }
      />

      {/* ── Add New Contract dialog ── */}
      <Dialog open={showContractGenerator} onOpenChange={setShowContractGenerator}>
        <DialogContent className="max-w-5xl rounded-[28px] border border-border/70 bg-white shadow-[0_30px_90px_-36px_rgba(15,23,42,0.42)]">
          <ContractGenerator onClose={() => setShowContractGenerator(false)} />
        </DialogContent>
      </Dialog>

      {/* ── View Modal ── */}
      {viewContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            {/* Modal gradient header */}
            <div className="bg-gradient-to-r from-[#0F172A] to-[#1D4ED8] px-6 py-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-300">Contract Details</p>
                  <h2 className="mt-0.5 text-xl font-bold">{viewContract.id}</h2>
                </div>
                <button
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                  onClick={() => setViewContract(null)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3">
                <StatusBadge status={viewContract.status} />
              </div>
            </div>

            <div className="px-6 py-4">
              <DetailRow icon={User}      label="Tenant"          value={viewContract.tenant} />
              <DetailRow icon={Home}      label="Property / Unit" value={viewContract.property} />
              <DetailRow icon={Calendar}  label="Contract Period"  value={`${viewContract.startDate} → ${viewContract.endDate}`} />
              <DetailRow icon={DollarSign} label="Monthly Rent"   value={`$${viewContract.rentAmount.toLocaleString()}/mo`} />
              <DetailRow icon={FileText}  label="Status"          value={<StatusBadge status={viewContract.status} />} />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                onClick={() => setViewContract(null)}
              >
                Close
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-[#1D4ED8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e40af] transition-colors"
                onClick={() => { setViewContract(null); openEdit(viewContract); }}
              >
                <Edit className="h-3.5 w-3.5" /> Edit Contract
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[90vh]"
          >
            <div className="shrink-0 bg-gradient-to-r from-[#0F172A] to-[#1D4ED8] px-6 py-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-300">Edit Contract</p>
                  <h2 className="mt-0.5 text-xl font-bold">{editContract.id}</h2>
                </div>
                <button
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                  onClick={() => setEditContract(null)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tenant Name</label>
                <Input value={editForm.tenant} onChange={e => setEditForm(f => ({ ...f, tenant: e.target.value }))} placeholder="Tenant full name" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Property / Unit</label>
                <Input value={editForm.property} onChange={e => setEditForm(f => ({ ...f, property: e.target.value }))} placeholder="Property and unit" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Start Date</label>
                  <Input type="date" value={editForm.startDate} onChange={e => setEditForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">End Date</label>
                  <Input type="date" value={editForm.endDate} onChange={e => setEditForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Monthly Rent ($)</label>
                <Input
                  type="number"
                  value={editForm.rentAmount}
                  onChange={e => setEditForm(f => ({ ...f, rentAmount: Number(e.target.value) }))}
                  placeholder="0" min={0}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Status</label>
                <select
                  className="h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-sm text-[#0F172A] shadow-sm outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10"
                  value={editForm.status}
                  onChange={e => setEditForm(f => ({ ...f, status: e.target.value as Contract['status'] }))}
                >
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>

            <div className="shrink-0 flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                onClick={() => setEditContract(null)}
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-[#1D4ED8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e40af] transition-colors"
                onClick={handleEditSave}
              >
                Save Changes
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      {deleteContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
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
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                  onClick={() => setDeleteContract(null)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="px-6 py-5">
              <p className="text-sm text-slate-600 leading-relaxed">
                Are you sure you want to delete contract{' '}
                <span className="font-semibold text-[#0F172A]">{deleteContract.id}</span> for{' '}
                <span className="font-semibold text-[#0F172A]">{deleteContract.tenant}</span>?
                This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
              <button
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                onClick={() => setDeleteContract(null)}
              >
                Cancel
              </button>
              <button
                className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
                onClick={handleDelete}
              >
                Yes, Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default RentalContracts;
