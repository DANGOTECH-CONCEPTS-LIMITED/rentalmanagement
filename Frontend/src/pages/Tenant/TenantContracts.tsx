import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import { useBranding } from '@/context/BrandingContext';
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

// ── PDF download (jsPDF — matches landlord design) ────────────────────────────
const downloadContractPdf = (c: Contract, branding: { companyName?: string; logoDataUrl?: string } = {}) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 16;
  const cW = pageW - margin * 2;
  let y = 0;
  const isOpen = !c.endDate || c.endDate.startsWith('0001') || c.endDate === '';

  const drawFooter = (pageNum: number, totalPages: number) => {
    doc.setFillColor(10, 18, 40);
    doc.rect(0, pageH - 11, pageW, 11, 'F');
    doc.setFillColor(29, 78, 216);
    doc.rect(0, pageH - 11, 3, 11, 'F');
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    const co = branding.companyName || 'Property Management System';
    doc.text(`${c.contractNumber}  ·  ${co}  ·  Generated ${new Date().toLocaleDateString('en-GB')}`, margin, pageH - 4);
    doc.text(`Page ${pageNum} / ${totalPages}`, pageW - margin, pageH - 4, { align: 'right' });
  };

  const checkNewPage = (need = 20) => { if (y + need > pageH - 18) { doc.addPage(); y = 20; } };

  // Header
  doc.setFillColor(10, 18, 40);
  doc.rect(0, 0, pageW, 54, 'F');
  doc.setFillColor(29, 78, 216);
  doc.rect(0, 50, pageW, 4, 'F');
  doc.setFillColor(234, 179, 8);
  doc.rect(0, 0, 4, 54, 'F');

  // Logo or initials
  const logoX = margin + 2;
  const logoY = 9;
  if (branding.logoDataUrl) {
    try { doc.addImage(branding.logoDataUrl, 'PNG', logoX, logoY, 26, 26); } catch { /* skip */ }
  } else if (branding.companyName) {
    doc.setFillColor(29, 78, 216);
    doc.roundedRect(logoX, logoY, 26, 26, 4, 4, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const ini = branding.companyName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
    doc.text(ini, logoX + 13, logoY + 17, { align: 'center' });
  }
  if (branding.companyName) {
    const hx = logoX + 30;
    doc.setTextColor(234, 179, 8);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(branding.companyName.toUpperCase(), hx, 16);
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Property Management', hx, 22);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('RENTAL AGREEMENT', pageW - margin, branding.companyName ? 20 : 22, { align: 'right' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(`Contract:  ${c.contractNumber}`, pageW - margin, 30, { align: 'right' });
  doc.text(`Issued:      ${fmtDate(c.createdAt)}`, pageW - margin, 36, { align: 'right' });
  doc.text(`Period:     ${fmtDate(c.startDate)} → ${isOpen ? 'Open-ended' : fmtDate(c.endDate)}`, pageW - margin, 42, { align: 'right' });

  const sActive = c.status?.toLowerCase() === 'active';
  const sExpired = ['expired', 'terminated'].includes(c.status?.toLowerCase());
  if (sActive) doc.setFillColor(16, 185, 129);
  else if (sExpired) doc.setFillColor(239, 68, 68);
  else doc.setFillColor(245, 158, 11);
  doc.roundedRect(pageW - margin - 32, 43, 32, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text(c.status.toUpperCase(), pageW - margin - 16, 48.5, { align: 'center' });

  y = 62;

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

  const card = (x: number, cy: number, w: number, h: number, fill: [number, number, number] = [248, 250, 252]) => {
    doc.setFillColor(...fill);
    doc.roundedRect(x, cy, w, h, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, cy, w, h, 2, 2, 'S');
  };

  const fieldRow = (label: string, value: string, last = false) => {
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
    if (!last) { doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.15); doc.line(margin, y + 8.5, margin + cW, y + 8.5); }
    y += 8.5;
  };

  // 01 Parties
  sectionBar('01  PARTIES TO THIS AGREEMENT');
  const halfW = (cW - 4) / 2;
  const partyH = 28;
  card(margin, y, halfW, partyH, [238, 242, 255]);
  doc.setFillColor(29, 78, 216); doc.roundedRect(margin, y, 3, partyH, 1, 1, 'F');
  doc.setTextColor(148, 163, 184); doc.setFontSize(7); doc.setFont('helvetica', 'bold');
  doc.text('TENANT', margin + 6, y + 7);
  doc.setTextColor(15, 23, 42); doc.setFontSize(9); doc.text(c.tenantName, margin + 6, y + 15);
  if (c.tenantPhone) { doc.setTextColor(100, 116, 139); doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.text(`Tel: ${c.tenantPhone}`, margin + 6, y + 22); }

  card(margin + halfW + 4, y, halfW, partyH);
  doc.setFillColor(234, 179, 8); doc.roundedRect(margin + halfW + 4, y, 3, partyH, 1, 1, 'F');
  doc.setTextColor(148, 163, 184); doc.setFontSize(7); doc.setFont('helvetica', 'bold');
  doc.text('PROPERTY', margin + halfW + 10, y + 7);
  doc.setTextColor(15, 23, 42); doc.setFontSize(9); doc.text(`${c.propertyName}${c.unitName ? ` — ${c.unitName}` : ''}`, margin + halfW + 10, y + 15);
  y += partyH + 7;

  // 02 Property
  checkNewPage(40);
  sectionBar('02  PROPERTY DETAILS');
  fieldRow('Property Name', c.propertyName);
  fieldRow('Unit / Room', c.unitName || 'Not specified', true);
  y += 6;

  // 03 Financial
  checkNewPage(50);
  sectionBar('03  FINANCIAL TERMS');
  const thirdW = (cW - 8) / 3;
  const finH = 30;
  card(margin, y, thirdW, finH, [238, 242, 255]);
  doc.setFillColor(29, 78, 216); doc.roundedRect(margin, y, 3, finH, 1, 1, 'F');
  doc.setTextColor(148, 163, 184); doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.text('MONTHLY RENT', margin + 6, y + 8);
  doc.setTextColor(29, 78, 216); doc.setFontSize(12); doc.text(`${c.currency} ${fmt(c.rentAmount)}`, margin + 6, y + 20);
  card(margin + thirdW + 4, y, thirdW, finH);
  doc.setTextColor(148, 163, 184); doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.text('SECURITY DEPOSIT', margin + thirdW + 8, y + 8);
  doc.setTextColor(15, 23, 42); doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text(`${c.currency} ${fmt(c.securityDeposit)}`, margin + thirdW + 8, y + 20);
  card(margin + (thirdW + 4) * 2, y, thirdW, finH);
  doc.setTextColor(148, 163, 184); doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.text('CURRENCY', margin + (thirdW + 4) * 2 + 4, y + 8);
  doc.setTextColor(15, 23, 42); doc.setFontSize(12); doc.text(c.currency, margin + (thirdW + 4) * 2 + 4, y + 20);
  y += finH + 7;

  // 04 Period
  checkNewPage(50);
  sectionBar('04  CONTRACT PERIOD');
  const dateH = 24;
  card(margin, y, halfW, dateH, [240, 253, 244]);
  doc.setFillColor(16, 185, 129); doc.roundedRect(margin, y, 3, dateH, 1, 1, 'F');
  doc.setTextColor(148, 163, 184); doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.text('START DATE', margin + 6, y + 8);
  doc.setTextColor(15, 23, 42); doc.setFontSize(9); doc.text(fmtDate(c.startDate), margin + 6, y + 18);
  card(margin + halfW + 4, y, halfW, dateH, isOpen ? [255, 251, 235] : [248, 250, 252]);
  doc.setFillColor(isOpen ? 245 : 100, isOpen ? 158 : 116, isOpen ? 11 : 139);
  doc.roundedRect(margin + halfW + 4, y, 3, dateH, 1, 1, 'F');
  doc.setTextColor(148, 163, 184); doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.text('END DATE', margin + halfW + 10, y + 8);
  doc.setTextColor(isOpen ? 180 : 15, isOpen ? 83 : 23, isOpen ? 9 : 42); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
  doc.text(isOpen ? 'Open-ended' : fmtDate(c.endDate), margin + halfW + 10, y + 18);
  y += dateH + 4;
  if (!isOpen) {
    const months = Math.round((new Date(c.endDate).getTime() - new Date(c.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44));
    if (months > 0) {
      doc.setFillColor(238, 242, 255); doc.roundedRect(margin, y, cW, 8, 2, 2, 'F');
      doc.setTextColor(29, 78, 216); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
      doc.text(`Duration: ${months} month${months !== 1 ? 's' : ''}`, margin + 5, y + 5.5);
      y += 8;
    }
  }
  y += 7;

  // 05 Terms
  if (c.terms) {
    checkNewPage(30);
    sectionBar('05  TERMS & CONDITIONS');
    const termLines = doc.splitTextToSize(c.terms, cW - 10);
    card(margin, y, cW, Math.min(termLines.length * 5.5 + 8, pageH - y - 20));
    let ty = y + 7;
    doc.setTextColor(51, 65, 85); doc.setFontSize(8.5); doc.setFont('helvetica', 'normal');
    termLines.forEach((line: string) => { checkNewPage(8); doc.text(line, margin + 5, ty); ty += 5.5; y = ty; });
    y += 10;
  }

  // 06 Signatures
  checkNewPage(70);
  sectionBar('06  SIGNATURES & ACKNOWLEDGEMENT');
  doc.setFillColor(255, 251, 235); doc.roundedRect(margin, y, cW, 12, 2, 2, 'F');
  doc.setFillColor(234, 179, 8); doc.roundedRect(margin, y, 3, 12, 1, 1, 'F');
  doc.setTextColor(120, 80, 0); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  const ackLines = doc.splitTextToSize('By signing below, both parties confirm they have read, understood, and agree to all terms of this rental agreement.', cW - 10);
  ackLines.forEach((l: string, i: number) => doc.text(l, margin + 7, y + 5 + i * 5.5));
  y += 18;

  const sigH = 38;
  card(margin, y, halfW, sigH);
  doc.setFillColor(29, 78, 216); doc.roundedRect(margin, y, 3, sigH, 1, 1, 'F');
  doc.setTextColor(148, 163, 184); doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.text('LANDLORD / OWNER', margin + 7, y + 8);
  doc.setDrawColor(200, 210, 225); doc.setLineWidth(0.4); doc.line(margin + 7, y + 28, margin + halfW - 6, y + 28);
  doc.setTextColor(148, 163, 184); doc.setFontSize(7); doc.setFont('helvetica', 'normal');
  doc.text('Signature', margin + 7, y + 33); doc.text('Date: ________________', margin + halfW / 2, y + 33);

  const s2x = margin + halfW + 4;
  card(s2x, y, halfW, sigH);
  doc.setFillColor(234, 179, 8); doc.roundedRect(s2x, y, 3, sigH, 1, 1, 'F');
  doc.setTextColor(148, 163, 184); doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.text('TENANT', s2x + 7, y + 8);
  doc.setTextColor(15, 23, 42); doc.setFontSize(9); doc.text(c.tenantName, s2x + 7, y + 16);
  doc.setDrawColor(200, 210, 225); doc.line(s2x + 7, y + 28, s2x + halfW - 6, y + 28);
  doc.setTextColor(148, 163, 184); doc.setFontSize(7); doc.setFont('helvetica', 'normal');
  doc.text('Signature', s2x + 7, y + 33); doc.text('Date: ________________', s2x + halfW / 2, y + 33);

  const total = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) { doc.setPage(i); drawFooter(i, total); }

  doc.save(`${c.contractNumber}-${c.tenantName.replace(/\s+/g, '-')}.pdf`);
};

// ── Component ─────────────────────────────────────────────────────────────────
const TenantContracts = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { branding } = useBranding();

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
            onClick={() => downloadContractPdf(c, branding)}
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
                onClick={() => { downloadContractPdf(viewContract, branding); }}
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
