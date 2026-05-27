import { useState, useEffect, useRef } from "react";
import {
  X, Printer, RefreshCw, FileText, Banknote, AlertTriangle,
  Building2, User, Phone, Calendar, Home, Key,
} from "lucide-react";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { useBranding } from "@/context/BrandingContext";

interface Tenant {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  dateMovedIn: string;
  propertyUnitId?: number;
  unit?: { id: number; unitNumber: string };
  property: { id: number; name: string; address?: string; type: string; price: number; currency: string };
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  type: string;
  status: string;
  amount: number;
  invoiceDate: string;
  dueDate: string;
  notes?: string;
}

interface Payment {
  id: number;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  paymentStatus: string;
  transactionId: string;
  description: string | null;
}

interface LedgerRow {
  date: string;
  type: "Invoice" | "Payment";
  description: string;
  debit: number;
  credit: number;
  balance: number;
  reference: string;
  status: string;
}

const fmt = (n: number, currency = "UGX") =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const fmtDate = (ds: string) =>
  new Date(ds).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const statusColor = (s: string) => {
  const l = s?.toLowerCase();
  if (l === "paid" || l === "successful" || l === "completed") return "bg-emerald-50 text-emerald-700";
  if (l === "overdue" || l === "failed") return "bg-red-50 text-red-700";
  if (l === "partial") return "bg-blue-50 text-blue-700";
  return "bg-amber-50 text-amber-700";
};

interface Props {
  tenant: Tenant;
  onClose: () => void;
}

const TenantStatementModal = ({ tenant, onClose }: Props) => {
  const { toast } = useToast();
  const { branding } = useBranding();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const printRef = useRef<HTMLDivElement>(null);

  const today = new Date().toISOString().split("T")[0];
  const yearStart = `${new Date().getFullYear()}-01-01`;

  const [from, setFrom] = useState(yearStart);
  const [to, setTo] = useState(today);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStatement = async () => {
    setIsLoading(true);
    try {
      const [invRes, payRes] = await Promise.allSettled([
        axios.get<Invoice[]>(`${apiUrl}/GetInvoicesByTenantId/${tenant.id}`),
        axios.get<Payment[]>(`${apiUrl}/GetPaymentsByTenantId/${tenant.id}`),
      ]);

      const invoices: Invoice[] = invRes.status === "fulfilled" ? invRes.value.data ?? [] : [];
      const payments: Payment[] = payRes.status === "fulfilled" ? payRes.value.data ?? [] : [];

      const fromMs = new Date(from).getTime();
      const toMs = new Date(to + "T23:59:59").getTime();

      const filteredInvoices = invoices.filter((inv) => {
        const t = new Date(inv.invoiceDate).getTime();
        return t >= fromMs && t <= toMs;
      });

      const filteredPayments = payments.filter((p) => {
        const t = new Date(p.paymentDate).getTime();
        return t >= fromMs && t <= toMs;
      });

      // Payment-type invoices (type = "Manual Payment" etc.) are direct payments,
      // not charges. Exclude them from debit rows entirely.
      const chargeInvoices = filteredInvoices.filter(
        (inv) => !inv.type?.toLowerCase().includes("manual payment") && !inv.type?.toLowerCase().includes("payment")
      );

      // When a partial payment is made, the backend marks the original invoice "Paid"
      // and creates a new "balance remaining" invoice (e.g. notes: "Balance of UGX 450,000
      // remaining after partial payment of UGX 250,000"). We must exclude these balance
      // invoices from debit rows and use only the actual partial amount as the credit.
      const parsePartialPayment = (notes?: string): number | null => {
        const m = notes?.match(/remaining after partial payment of (?:ugx\s*)?([\d,]+)/i);
        return m ? parseInt(m[1].replace(/,/g, ""), 10) : null;
      };

      const balanceInvoiceIds = new Set<number>();
      const parentToPartialPayment = new Map<number, number>();

      chargeInvoices.forEach((inv) => {
        const partial = parsePartialPayment(inv.notes);
        if (partial === null) return;
        balanceInvoiceIds.add(inv.id);
        const parentAmount = inv.amount + partial;
        const parent = chargeInvoices.find(
          (p) => p.id !== inv.id && Math.abs(p.amount - parentAmount) < 1 && p.status?.toLowerCase() === "paid"
        );
        if (parent) parentToPartialPayment.set(parent.id, partial);
      });

      const debitInvoices = chargeInvoices.filter((inv) => !balanceInvoiceIds.has(inv.id));

      // Paid invoices that have NO matching actual payment record.
      // For partially-paid invoices, match against the partial amount (not the full invoice amount).
      const invoicesCoveredByPayment = new Set<number>();
      debitInvoices.forEach((inv) => {
        if (inv.status?.toLowerCase() !== "paid") return;
        const expectedCredit = parentToPartialPayment.get(inv.id) ?? inv.amount;
        const invDate = new Date(inv.invoiceDate).getTime();
        const covered = filteredPayments.some(
          (p) => Math.abs(p.amount - expectedCredit) < 1 && Math.abs(new Date(p.paymentDate).getTime() - invDate) <= 86_400_000 * 2
        );
        if (covered) invoicesCoveredByPayment.add(inv.id);
      });

      const rows: Omit<LedgerRow, "balance">[] = [
        // Debit row for every charge invoice (balance-remaining invoices excluded)
        ...debitInvoices.map((inv) => ({
          date: inv.invoiceDate,
          type: "Invoice" as const,
          description: inv.notes ? inv.notes : inv.type === "Invoice" ? "Rent Invoice" : inv.type,
          debit: inv.amount,
          credit: 0,
          reference: inv.invoiceNumber,
          // Override "Paid" to "Partial" for invoices that were only partially paid
          status: parentToPartialPayment.has(inv.id) ? "Partial" : inv.status,
        })),
        // Synthetic credit for paid invoices not covered by an actual payment record.
        // Use partial payment amount for partially-paid parent invoices.
        ...debitInvoices
          .filter((inv) => inv.status?.toLowerCase() === "paid" && !invoicesCoveredByPayment.has(inv.id))
          .map((inv) => ({
            date: inv.invoiceDate,
            type: "Payment" as const,
            description: `Invoice Settled — ${inv.invoiceNumber}`,
            debit: 0,
            credit: parentToPartialPayment.get(inv.id) ?? inv.amount,
            reference: inv.invoiceNumber,
            status: "Settled",
          })),
        // Actual recorded payment transactions
        ...filteredPayments.map((p) => ({
          date: p.paymentDate,
          type: "Payment" as const,
          description: p.description ? p.description : p.paymentMethod ?? "Payment",
          debit: 0,
          credit: p.amount,
          reference: p.transactionId || "—",
          status: p.paymentStatus,
        })),
      ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate running balance (invoices = debit, payments = credit)
      let running = 0;
      const withBalance: LedgerRow[] = rows.map((r) => {
        running += r.debit - r.credit;
        return { ...r, balance: running };
      });

      setLedger(withBalance);
    } catch (err: any) {
      toast({ title: "Error", description: "Failed to load statement.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchStatement(); }, [tenant.id]);

  const totalDebits = ledger.reduce((s, r) => s + r.debit, 0);
  const totalCredits = ledger.reduce((s, r) => s + r.credit, 0);
  const closingBalance = ledger.length > 0 ? ledger[ledger.length - 1].balance : 0;

  const handlePrint = () => {
    const printWin = window.open("", "_blank", "width=960,height=800");
    if (!printWin) return;
    const companyName = branding.companyName || "Property Management";
    const logoHtml = branding.logoDataUrl
      ? `<img src="${branding.logoDataUrl}" alt="logo" style="height:52px;width:52px;object-fit:contain;border-radius:10px;" />`
      : `<div style="height:52px;width:52px;background:#1D4ED8;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;color:white;">${companyName.charAt(0).toUpperCase()}</div>`;
    const balanceColor = closingBalance > 0 ? "#dc2626" : "#059669";
    printWin.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Tenant Statement — ${tenant.fullName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Inter',Arial,sans-serif; font-size:12px; color:#1e293b; background:#fff; }
    .page { padding:36px 40px; max-width:860px; margin:0 auto; }

    /* ── Top header bar ── */
    .header-bar {
      background: linear-gradient(135deg,#0f172a 0%,#1D4ED8 100%);
      border-radius:14px;
      padding:22px 28px;
      display:flex;
      align-items:center;
      justify-content:space-between;
      margin-bottom:22px;
    }
    .header-left { display:flex; align-items:center; gap:16px; }
    .header-text .doc-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:#93c5fd; margin-bottom:3px; }
    .header-text .company-name { font-size:22px; font-weight:800; color:#fff; line-height:1.1; }
    .header-text .doc-sub { font-size:11px; color:#bfdbfe; margin-top:2px; }
    .header-right { text-align:right; }
    .header-right .print-date { font-size:10px; color:#bfdbfe; }
    .header-right .period-val { font-size:11px; color:#e0f2fe; margin-top:4px; font-weight:600; }

    /* ── Tenant info card ── */
    .info-card {
      border:1px solid #e2e8f0; border-radius:12px;
      background:#f8fafc; padding:16px 20px;
      display:grid; grid-template-columns:repeat(3,1fr); gap:14px;
      margin-bottom:18px;
    }
    .info-block label { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:#94a3b8; display:block; margin-bottom:3px; }
    .info-block span { font-size:12px; font-weight:600; color:#0f172a; }

    /* ── Summary KPIs ── */
    .kpis { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:20px; }
    .kpi { border-radius:10px; padding:12px 16px; }
    .kpi.invoiced { background:#fffbeb; border:1.5px solid #fcd34d; }
    .kpi.paid     { background:#f0fdf4; border:1.5px solid #86efac; }
    .kpi.balance  { background:${closingBalance > 0 ? "#fef2f2" : "#eff6ff"}; border:1.5px solid ${closingBalance > 0 ? "#fca5a5" : "#93c5fd"}; }
    .kpi label { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; display:block; margin-bottom:5px; }
    .kpi.invoiced label { color:#d97706; }
    .kpi.paid     label { color:#059669; }
    .kpi.balance  label { color:${balanceColor}; }
    .kpi span { font-size:16px; font-weight:800; }
    .kpi.invoiced span { color:#d97706; }
    .kpi.paid     span { color:#059669; }
    .kpi.balance  span { color:${balanceColor}; }

    /* ── Table ── */
    table { width:100%; border-collapse:collapse; font-size:11px; border-radius:10px; overflow:hidden; }
    thead tr { background:#1e293b; }
    th { padding:9px 11px; text-align:left; font-size:9.5px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#e2e8f0; }
    th.r, td.r { text-align:right; }
    tbody tr.inv { background:#fefce8; }
    tbody tr.pay { background:#f0fdf4; }
    tbody tr:hover { filter:brightness(.97); }
    td { padding:8px 11px; border-bottom:1px solid #f1f5f9; vertical-align:middle; }
    .badge { display:inline-block; padding:2px 8px; border-radius:999px; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; }
    .b-inv { background:#fef9c3; color:#a16207; }
    .b-pay { background:#dcfce7; color:#15803d; }
    .s-paid,.s-successful,.s-completed { background:#dcfce7; color:#15803d; }
    .s-partial  { background:#dbeafe; color:#1d4ed8; }
    .s-pending  { background:#fef9c3; color:#a16207; }
    .s-settled  { background:#f0fdf4; color:#059669; }
    .s-overdue,.s-failed { background:#fee2e2; color:#dc2626; }
    .bal-pos { color:#dc2626; font-weight:700; }
    .bal-neg { color:#059669; font-weight:700; }
    tfoot tr { background:#1e293b; }
    tfoot td { padding:9px 11px; font-weight:700; color:#fff; font-size:11px; border:none; }

    /* ── Footer ── */
    .doc-footer {
      margin-top:24px; padding-top:14px;
      border-top:1px solid #e2e8f0;
      display:flex; align-items:center; justify-content:space-between;
    }
    .doc-footer .left { font-size:10px; color:#94a3b8; }
    .doc-footer .right { font-size:10px; color:#94a3b8; text-align:right; }
    .doc-footer .stamp {
      font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.08em;
      color:#1D4ED8; border:1.5px solid #1D4ED8; border-radius:6px;
      padding:3px 10px; display:inline-block; margin-top:4px;
    }

    @media print {
      body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      .page { padding:20px 24px; }
    }
  </style>
</head>
<body>
<div class="page">

  <div class="header-bar">
    <div class="header-left">
      ${logoHtml}
      <div class="header-text">
        <div class="doc-label">Tenant Account Statement</div>
        <div class="company-name">${companyName}</div>
        <div class="doc-sub">TEN-${String(tenant.id).padStart(6, "0")} &nbsp;·&nbsp; ${tenant.property.name}${tenant.unit?.unitNumber ? ` · Unit ${tenant.unit.unitNumber}` : ""}</div>
      </div>
    </div>
    <div class="header-right">
      <div class="print-date">Printed on: ${new Date().toLocaleDateString("en-GB", { day:"2-digit", month:"long", year:"numeric" })}</div>
      <div class="period-val">${fmtDate(from)} — ${fmtDate(to)}</div>
    </div>
  </div>

  <div class="info-card">
    <div class="info-block"><label>Tenant Name</label><span>${tenant.fullName}</span></div>
    <div class="info-block"><label>Account No.</label><span>TEN-${String(tenant.id).padStart(6, "0")}</span></div>
    <div class="info-block"><label>Phone</label><span>${tenant.phoneNumber}</span></div>
    <div class="info-block"><label>Property</label><span>${tenant.property.name}</span></div>
    <div class="info-block"><label>Unit</label><span>${tenant.unit?.unitNumber ?? "—"}</span></div>
    <div class="info-block"><label>Move-in Date</label><span>${fmtDate(tenant.dateMovedIn)}</span></div>
  </div>

  <div class="kpis">
    <div class="kpi invoiced"><label>Total Invoiced</label><span>UGX ${fmt(totalDebits)}</span></div>
    <div class="kpi paid"><label>Total Paid</label><span>UGX ${fmt(totalCredits)}</span></div>
    <div class="kpi balance"><label>${closingBalance > 0 ? "Outstanding Balance" : "Closing Balance"}</label><span>UGX ${fmt(Math.abs(closingBalance))}</span></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Type</th>
        <th>Description</th>
        <th class="r">Debit (UGX)</th>
        <th class="r">Credit (UGX)</th>
        <th class="r">Balance (UGX)</th>
        <th>Reference</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${ledger.map((r) => {
        const sc = r.status?.toLowerCase().replace(/\s+/g, "-") ?? "";
        return `
        <tr class="${r.type === "Invoice" ? "inv" : "pay"}">
          <td style="white-space:nowrap">${fmtDate(r.date)}</td>
          <td><span class="badge ${r.type === "Invoice" ? "b-inv" : "b-pay"}">${r.type}</span></td>
          <td>${r.description}</td>
          <td class="r" style="color:#dc2626;font-weight:600">${r.debit > 0 ? fmt(r.debit) : '<span style="color:#cbd5e1">—</span>'}</td>
          <td class="r" style="color:#059669;font-weight:600">${r.credit > 0 ? fmt(r.credit) : '<span style="color:#cbd5e1">—</span>'}</td>
          <td class="r ${r.balance > 0 ? "bal-pos" : "bal-neg"}">${fmt(Math.abs(r.balance))}</td>
          <td style="font-family:monospace;font-size:10px">${r.reference}</td>
          <td><span class="badge s-${sc}">${r.status}</span></td>
        </tr>`;
      }).join("")}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="3">TOTALS — ${ledger.length} transaction(s)</td>
        <td class="r" style="color:#fca5a5">UGX ${fmt(totalDebits)}</td>
        <td class="r" style="color:#86efac">UGX ${fmt(totalCredits)}</td>
        <td class="r" style="color:${closingBalance > 0 ? "#fca5a5" : "#86efac"}">UGX ${fmt(Math.abs(closingBalance))}</td>
        <td colspan="2"></td>
      </tr>
    </tfoot>
  </table>

  <div class="doc-footer">
    <div class="left">
      This is a computer-generated statement. &nbsp;|&nbsp; Total records: <strong>${ledger.length}</strong><br/>
      <span style="color:#1D4ED8;font-weight:600">${companyName}</span>
    </div>
    <div class="right">
      <div class="stamp">Official Document</div>
    </div>
  </div>

</div>
</body>
</html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); printWin.close(); }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

        {/* ── Header ── */}
        <div className="shrink-0 bg-gradient-to-r from-[#0F172A] to-[#1D4ED8] px-6 py-5 text-white">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-300">Account Statement</p>
                <h2 className="text-xl font-bold">{tenant.fullName}</h2>
                <p className="text-xs text-blue-200">
                  TEN-{String(tenant.id).padStart(6, "0")} &nbsp;·&nbsp; {tenant.property.name}
                  {tenant.unit?.unitNumber ? ` · Unit ${tenant.unit.unitNumber}` : ""}
                </p>
              </div>
            </div>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Tenant info strip ── */}
        <div className="shrink-0 grid grid-cols-2 gap-4 border-b border-[#E2E8F0] bg-slate-50/70 px-6 py-3 sm:grid-cols-4">
          {[
            { icon: User, label: "Phone", value: tenant.phoneNumber },
            { icon: Home, label: "Property", value: tenant.property.name },
            { icon: Key, label: "Unit", value: tenant.unit?.unitNumber ?? "—" },
            { icon: Calendar, label: "Move-in", value: fmtDate(tenant.dateMovedIn) },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-2">
              <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
                <p className="text-xs font-medium text-[#0F172A]">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Controls ── */}
        <div className="shrink-0 flex flex-wrap items-center gap-3 border-b border-[#E2E8F0] px-6 py-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-[#94A3B8]">From</label>
            <input
              type="date" value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-[#94A3B8]">To</label>
            <input
              type="date" value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30"
            />
          </div>
          <button
            onClick={fetchStatement}
            className="flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>

        {/* ── Summary KPIs ── */}
        <div className="shrink-0 grid grid-cols-3 gap-3 px-6 py-3 border-b border-[#E2E8F0]">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">Total Invoiced</p>
            <p className="mt-1 text-base font-bold text-amber-700">UGX {fmt(totalDebits)}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Total Paid</p>
            <p className="mt-1 text-base font-bold text-emerald-700">UGX {fmt(totalCredits)}</p>
          </div>
          <div className={`rounded-xl border p-3 ${closingBalance > 0 ? "border-red-200 bg-red-50" : "border-blue-200 bg-blue-50"}`}>
            <p className={`text-[10px] font-semibold uppercase tracking-wider ${closingBalance > 0 ? "text-red-600" : "text-blue-600"}`}>
              {closingBalance > 0 ? "Outstanding Balance" : "Closing Balance"}
            </p>
            <p className={`mt-1 text-base font-bold ${closingBalance > 0 ? "text-red-700" : "text-blue-700"}`}>
              UGX {fmt(Math.abs(closingBalance))}
            </p>
          </div>
        </div>

        {/* ── Ledger table ── */}
        <div className="flex-1 overflow-y-auto" ref={printRef}>
          {isLoading ? (
            <div className="flex flex-col gap-3 p-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 rounded-lg bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : ledger.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                <FileText className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm text-[#64748B]">No transactions found for this period.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#1e293b] text-white">
                    {["Date", "Transaction Type", "Description", "Debit (UGX)", "Credit (UGX)", "Balance (UGX)", "Reference", "Status"].map((h, i) => (
                      <th
                        key={h}
                        className={`px-4 py-3 text-[10px] font-bold uppercase tracking-wider ${i >= 3 && i <= 5 ? "text-right" : "text-left"}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {ledger.map((row, idx) => (
                    <tr
                      key={idx}
                      className={`transition-colors ${row.type === "Invoice" ? "bg-amber-50/40 hover:bg-amber-50" : "bg-emerald-50/30 hover:bg-emerald-50/60"}`}
                    >
                      <td className="px-4 py-3 text-xs text-[#64748B] whitespace-nowrap">{fmtDate(row.date)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          row.type === "Invoice"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}>
                          {row.type === "Invoice"
                            ? <FileText className="h-3 w-3" />
                            : <Banknote className="h-3 w-3" />}
                          {row.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#0F172A] max-w-[180px] truncate">{row.description}</td>
                      <td className="px-4 py-3 text-right text-xs font-semibold text-red-600">
                        {row.debit > 0 ? `${fmt(row.debit)}` : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-semibold text-emerald-600">
                        {row.credit > 0 ? `${fmt(row.credit)}` : <span className="text-slate-300">—</span>}
                      </td>
                      <td className={`px-4 py-3 text-right text-xs font-bold ${row.balance > 0 ? "text-red-700" : "text-emerald-700"}`}>
                        {fmt(Math.abs(row.balance))}
                        {row.balance > 0 && idx === ledger.length - 1 && (
                          <AlertTriangle className="inline h-3 w-3 ml-1 text-red-500" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-[#64748B] whitespace-nowrap">{row.reference}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor(row.status)}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#1e293b] text-white">
                    <td colSpan={3} className="px-4 py-3 text-xs font-bold">
                      TOTALS — {ledger.length} transaction(s)
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-bold text-red-300">
                      {fmt(totalDebits)}
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-bold text-emerald-300">
                      {fmt(totalCredits)}
                    </td>
                    <td className={`px-4 py-3 text-right text-xs font-bold ${closingBalance > 0 ? "text-red-300" : "text-emerald-300"}`}>
                      {fmt(Math.abs(closingBalance))}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 flex items-center justify-between gap-3 border-t border-[#E2E8F0] bg-slate-50 px-6 py-4">
          <p className="text-xs text-slate-400">
            Total records: <span className="font-semibold text-slate-600">{ledger.length}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              onClick={onClose}
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              disabled={ledger.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1D4ED8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e40af] transition-colors disabled:opacity-40"
            >
              <Printer className="h-4 w-4" />
              Print Statement
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenantStatementModal;
