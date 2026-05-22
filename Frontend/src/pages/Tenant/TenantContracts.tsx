import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import {
  FileText, CheckCircle2, Clock, XCircle, Eye, Download,
  X, Calendar, Home, DollarSign, CreditCard, ScrollText,
  PenLine, AlertTriangle, Loader2,
} from 'lucide-react';
import { DataTable, Column } from '@/components/ui/data-table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

const apiUrl = import.meta.env.VITE_API_BASE_URL;

interface Contract {
  id: number;
  contractNumber: string;
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  propertyName: string;
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

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const fmt = (n: number) => n?.toLocaleString() ?? '0';

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
  <div className={`rounded-2xl border border-slate-200 border-l-4 bg-white p-5 shadow-sm ${accent}`}>
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

// ── PDF download (HTML blob, no external dependency) ──────────────────────────
const downloadContractPdf = (c: Contract) => {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Contract ${c.contractNumber}</title>
    <style>
      body{font-family:Arial,sans-serif;margin:40px;color:#0f172a}
      h1{font-size:22px;font-weight:bold;margin-bottom:4px}
      .sub{font-size:13px;color:#64748b;margin-bottom:28px}
      .row{display:flex;margin-bottom:10px;font-size:13px}
      .lbl{font-weight:600;width:180px;color:#475569;flex-shrink:0}
      .divider{border:none;border-top:1px dashed #cbd5e1;margin:20px 0}
      .terms{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;font-size:12px;line-height:1.6;white-space:pre-wrap}
      .footer{margin-top:40px;font-size:11px;color:#94a3b8;text-align:center}
      .badge{display:inline-block;padding:2px 10px;border-radius:999px;font-size:11px;font-weight:600;
             background:${c.status?.toLowerCase()==='active'?'#dcfce7':c.status?.toLowerCase()==='pending'?'#fef9c3':'#fee2e2'};
             color:${c.status?.toLowerCase()==='active'?'#166534':c.status?.toLowerCase()==='pending'?'#854d0e':'#991b1b'}}
    </style></head><body>
    <h1>Rental Contract</h1>
    <div class="sub">${c.contractNumber}</div>
    <div class="row"><span class="lbl">Status</span><span class="badge">${c.status}</span></div>
    <hr class="divider">
    <div class="row"><span class="lbl">Tenant</span><span>${c.tenantName}</span></div>
    <div class="row"><span class="lbl">Email</span><span>${c.tenantEmail || '—'}</span></div>
    <div class="row"><span class="lbl">Phone</span><span>${c.tenantPhone || '—'}</span></div>
    <hr class="divider">
    <div class="row"><span class="lbl">Property</span><span>${c.propertyName}</span></div>
    <div class="row"><span class="lbl">Unit</span><span>${c.unitName || '—'}</span></div>
    <div class="row"><span class="lbl">Start Date</span><span>${fmtDate(c.startDate)}</span></div>
    <div class="row"><span class="lbl">End Date</span><span>${fmtDate(c.endDate)}</span></div>
    <hr class="divider">
    <div class="row"><span class="lbl">Monthly Rent</span><span>${c.currency} ${fmt(c.rentAmount)}</span></div>
    <div class="row"><span class="lbl">Security Deposit</span><span>${c.currency} ${fmt(c.securityDeposit)}</span></div>
    ${c.terms ? `<hr class="divider"><p style="font-weight:600;font-size:13px;margin-bottom:8px">Terms &amp; Conditions</p><div class="terms">${c.terms}</div>` : ''}
    <div class="footer">Generated ${new Date().toLocaleDateString()} &mdash; Property Management System</div>
    </body></html>`;
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Contract_${c.contractNumber}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ── Component ─────────────────────────────────────────────────────────────────
const TenantContracts = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewContract, setViewContract] = useState<Contract | null>(null);
  const [confirmContract, setConfirmContract] = useState<Contract | null>(null);
  const [acknowledging, setAcknowledging] = useState(false);

  const fetchContracts = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await axios.get<Contract[]>(`${apiUrl}/GetContractsByTenantId/${user.id}`);
      setContracts(res.data);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.response?.data || 'Failed to load contracts',
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, toast]);

  useEffect(() => { fetchContracts(); }, [fetchContracts]);

  const handleAcknowledge = async () => {
    if (!confirmContract) return;
    setAcknowledging(true);
    try {
      await axios.put(`${apiUrl}/AcknowledgeContract/${confirmContract.id}`);
      toast({ title: 'Contract accepted', description: 'Your agreement is now active.' });
      setConfirmContract(null);
      fetchContracts();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.response?.data || 'Failed to acknowledge contract' });
    } finally {
      setAcknowledging(false);
    }
  };

  const activeCount  = contracts.filter(c => c.status?.toLowerCase() === 'active').length;
  const pendingCount = contracts.filter(c => c.status?.toLowerCase() === 'pending').length;
  const expiredCount = contracts.filter(c => ['expired', 'terminated'].includes(c.status?.toLowerCase())).length;

  const columns: Column<Contract>[] = [
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
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          {fmtDate(c.startDate)} → {fmtDate(c.endDate)}
        </span>
      ),
    },
    {
      key: 'rentAmount',
      header: 'Rent/mo',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (c) => (
        <span className="text-sm font-semibold text-[#0F172A]">
          {c.currency} {fmt(c.rentAmount)}
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
      header: '',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (c) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => setViewContract(c)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <Eye className="h-3.5 w-3.5" /> View
          </button>
          <button
            onClick={() => downloadContractPdf(c)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> PDF
          </button>
          {c.status?.toLowerCase() === 'pending' && (
            <button
              onClick={() => setConfirmContract(c)}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
            >
              <PenLine className="h-3.5 w-3.5" /> Sign & Accept
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">

      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl px-8 py-8 text-white shadow-xl" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0f2044 45%, #1a3a6e 100%)" }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative">
          <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-200">
            <FileText className="mr-1.5 h-3 w-3" /> My Contracts
          </span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">Rental Agreements</h1>
          <p className="mt-1 text-sm text-blue-200">View, download, and sign your rental contracts.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {[
              { label: 'Total', value: contracts.length },
              { label: 'Active', value: activeCount, color: 'text-emerald-300' },
              { label: 'Pending', value: pendingCount, color: 'text-amber-300' },
              { label: 'Expired', value: expiredCount, color: 'text-red-300' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-1.5">
                <span className={`text-sm font-bold ${s.color ?? 'text-white'}`}>{s.value}</span>
                <span className="text-xs text-blue-200">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Active" value={activeCount} icon={CheckCircle2} iconBg="bg-emerald-50" iconColor="text-emerald-600" accent="border-l-emerald-500" />
        <KpiCard label="Awaiting Signature" value={pendingCount} icon={Clock} iconBg="bg-amber-50" iconColor="text-amber-600" accent="border-l-amber-500" />
        <KpiCard label="Expired / Terminated" value={expiredCount} icon={XCircle} iconBg="bg-red-50" iconColor="text-red-500" accent="border-l-red-400" />
      </div>

      {/* Table */}
      <DataTable
        data={contracts.filter(c =>
          c.contractNumber.toLowerCase().includes(search.toLowerCase()) ||
          c.propertyName.toLowerCase().includes(search.toLowerCase())
        )}
        columns={columns}
        loading={loading}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by contract ID or property…"
        label="contract"
        pageSize={10}
        emptyMessage="No contracts found"
        emptyIcon={<FileText className="h-6 w-6 text-slate-300" />}
      />

      {/* ── View modal ── */}
      {viewContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="bg-gradient-to-r from-[#0F172A] to-[#1D4ED8] px-6 py-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-300">Contract Details</p>
                  <h2 className="mt-0.5 text-xl font-bold">{viewContract.contractNumber}</h2>
                  <div className="mt-2"><StatusBadge status={viewContract.status} /></div>
                </div>
                <button
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  onClick={() => setViewContract(null)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <DetailRow icon={Home}       label="Property / Unit" value={`${viewContract.propertyName}${viewContract.unitName ? ` — ${viewContract.unitName}` : ''}`} />
              <DetailRow icon={Calendar}   label="Contract Period"  value={`${fmtDate(viewContract.startDate)} → ${fmtDate(viewContract.endDate)}`} />
              <DetailRow icon={DollarSign} label="Monthly Rent"     value={`${viewContract.currency} ${fmt(viewContract.rentAmount)}/mo`} />
              <DetailRow icon={CreditCard} label="Security Deposit" value={`${viewContract.currency} ${fmt(viewContract.securityDeposit)}`} />
              {viewContract.terms && (
                <DetailRow
                  icon={ScrollText}
                  label="Terms & Conditions"
                  value={<span className="whitespace-pre-wrap text-xs leading-relaxed">{viewContract.terms}</span>}
                />
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                onClick={() => { downloadContractPdf(viewContract); }}
              >
                <Download className="h-3.5 w-3.5" /> Download
              </button>
              {viewContract.status?.toLowerCase() === 'pending' && (
                <button
                  className="btn-grid inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
                  onClick={() => { setViewContract(null); setConfirmContract(viewContract); }}
                >
                  <PenLine className="h-3.5 w-3.5" /> Sign & Accept
                </button>
              )}
              <button
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                onClick={() => setViewContract(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Acknowledge / sign confirmation modal ── */}
      {confirmContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="bg-gradient-to-r from-emerald-700 to-emerald-500 px-6 py-5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-200">Confirm Signature</p>
                    <h2 className="text-lg font-bold">Sign & Accept Contract</h2>
                  </div>
                </div>
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  onClick={() => setConfirmContract(null)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                By accepting, you confirm you have read and agree to all the terms of contract{' '}
                <span className="font-semibold text-[#0F172A]">{confirmContract.contractNumber}</span> for{' '}
                <span className="font-semibold text-[#0F172A]">{confirmContract.propertyName}</span>.
                This will mark the agreement as <span className="font-semibold text-emerald-700">Active</span>.
              </p>
              {confirmContract.terms && (
                <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {confirmContract.terms}
                </div>
              )}
            </div>

            <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
              <button
                className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                onClick={() => setConfirmContract(null)}
                disabled={acknowledging}
              >
                Cancel
              </button>
              <button
                className="btn-grid flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                onClick={handleAcknowledge}
                disabled={acknowledging}
              >
                {acknowledging
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing…</>
                  : <><PenLine className="h-4 w-4" /> I Accept & Sign</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantContracts;
