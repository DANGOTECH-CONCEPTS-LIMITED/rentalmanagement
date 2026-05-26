import { useState, useEffect, useRef } from "react";
import {
  X, Printer, RefreshCw, FileText, Banknote, AlertTriangle,
  Building2, User, Phone, Calendar, Home, Key,
} from "lucide-react";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";

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
  return "bg-amber-50 text-amber-700";
};

interface Props {
  tenant: Tenant;
  onClose: () => void;
}

const TenantStatementModal = ({ tenant, onClose }: Props) => {
  const { toast } = useToast();
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

      const rows: Omit<LedgerRow, "balance">[] = [
        // Debit row for every invoice
        ...filteredInvoices.map((inv) => ({
          date: inv.invoiceDate,
          type: "Invoice" as const,
          description: inv.type + (inv.notes ? ` — ${inv.notes}` : ""),
          debit: inv.amount,
          credit: 0,
          reference: inv.invoiceNumber,
          status: inv.status,
        })),
        // Credit row for invoices manually marked as Paid (no payment record exists for them)
        ...filteredInvoices
          .filter((inv) => inv.status?.toLowerCase() === "paid")
          .map((inv) => ({
            date: inv.invoiceDate,
            type: "Payment" as const,
            description: `Invoice Settled — ${inv.invoiceNumber}`,
            debit: 0,
            credit: inv.amount,
            reference: inv.invoiceNumber,
            status: "Settled",
          })),
        // Actual recorded payment transactions
        ...filteredPayments.map((p) => ({
          date: p.paymentDate,
          type: "Payment" as const,
          description: `${p.paymentMethod}${p.description ? ` — ${p.description}` : ""}`,
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
    const content = printRef.current;
    if (!content) return;
    const printWin = window.open("", "_blank", "width=900,height=700");
    if (!printWin) return;
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Tenant Statement — ${tenant.fullName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; padding: 32px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 2px solid #1D4ED8; padding-bottom: 16px; }
          .company { font-size: 20px; font-weight: 700; color: #1D4ED8; }
          .company-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
          .print-date { font-size: 10px; color: #64748b; text-align: right; }
          .info-section { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
          .info-block label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; display: block; margin-bottom: 2px; }
          .info-block span { font-size: 12px; font-weight: 600; color: #0f172a; }
          .period { font-size: 11px; color: #64748b; margin-bottom: 16px; }
          .summary { display: flex; gap: 12px; margin-bottom: 20px; }
          .summary-box { flex: 1; padding: 10px 14px; border-radius: 8px; }
          .summary-box.invoiced { background: #fef9f0; border: 1px solid #fcd34d; }
          .summary-box.paid { background: #f0fdf4; border: 1px solid #86efac; }
          .summary-box.balance { background: #eff6ff; border: 1px solid #93c5fd; }
          .summary-box label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; display: block; margin-bottom: 3px; }
          .summary-box span { font-size: 14px; font-weight: 700; }
          .summary-box.invoiced span { color: #d97706; }
          .summary-box.paid span { color: #059669; }
          .summary-box.balance span { color: #1d4ed8; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { background: #1e293b; color: white; padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
          th.right, td.right { text-align: right; }
          td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; }
          tr:nth-child(even) td { background: #f8fafc; }
          tr.invoice-row td { background: #fefce8; }
          tr.payment-row td { background: #f0fdf4; }
          .type-badge { display: inline-block; padding: 2px 7px; border-radius: 999px; font-size: 9px; font-weight: 700; text-transform: uppercase; }
          .type-invoice { background: #fef9c3; color: #a16207; }
          .type-payment { background: #dcfce7; color: #15803d; }
          .status-badge { display: inline-block; padding: 2px 7px; border-radius: 999px; font-size: 9px; font-weight: 600; }
          .s-paid, .s-successful, .s-completed { background: #dcfce7; color: #15803d; }
          .s-pending { background: #fef9c3; color: #a16207; }
          .s-overdue, .s-failed { background: #fee2e2; color: #dc2626; }
          .balance-positive { color: #dc2626; font-weight: 700; }
          .balance-zero { color: #059669; font-weight: 700; }
          tfoot td { font-weight: 700; background: #1e293b !important; color: white; padding: 8px 10px; }
          .footer { margin-top: 24px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="company">Property Management</div>
            <div class="company-sub">Tenant Account Statement</div>
          </div>
          <div class="print-date">Printed on: ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</div>
        </div>

        <div class="info-section">
          <div>
            <div class="info-block"><label>Tenant Name</label><span>${tenant.fullName}</span></div>
          </div>
          <div>
            <div class="info-block"><label>Account No.</label><span>TEN-${String(tenant.id).padStart(6, "0")}</span></div>
          </div>
          <div>
            <div class="info-block"><label>Property</label><span>${tenant.property.name}</span></div>
          </div>
          <div>
            <div class="info-block"><label>Unit</label><span>${tenant.unit?.unitNumber ?? "—"}</span></div>
          </div>
          <div>
            <div class="info-block"><label>Phone</label><span>${tenant.phoneNumber}</span></div>
          </div>
          <div>
            <div class="info-block"><label>Move-in Date</label><span>${fmtDate(tenant.dateMovedIn)}</span></div>
          </div>
        </div>

        <div class="period">Statement Period: <strong>${fmtDate(from)}</strong> to <strong>${fmtDate(to)}</strong></div>

        <div class="summary">
          <div class="summary-box invoiced"><label>Total Invoiced</label><span>UGX ${fmt(totalDebits)}</span></div>
          <div class="summary-box paid"><label>Total Paid</label><span>UGX ${fmt(totalCredits)}</span></div>
          <div class="summary-box balance"><label>Closing Balance</label><span>UGX ${fmt(Math.abs(closingBalance))}</span></div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Transaction Type</th>
              <th>Description</th>
              <th class="right">Debit (UGX)</th>
              <th class="right">Credit (UGX)</th>
              <th class="right">Balance (UGX)</th>
              <th>Reference</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${ledger.map((r) => `
              <tr class="${r.type === "Invoice" ? "invoice-row" : "payment-row"}">
                <td>${fmtDate(r.date)}</td>
                <td><span class="type-badge type-${r.type.toLowerCase()}">${r.type}</span></td>
                <td>${r.description}</td>
                <td class="right">${r.debit > 0 ? fmt(r.debit) : "—"}</td>
                <td class="right">${r.credit > 0 ? fmt(r.credit) : "—"}</td>
                <td class="right ${r.balance > 0 ? "balance-positive" : "balance-zero"}">${fmt(Math.abs(r.balance))}</td>
                <td>${r.reference}</td>
                <td><span class="status-badge s-${r.status?.toLowerCase().replace(" ", "-")}">${r.status}</span></td>
              </tr>
            `).join("")}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3">TOTALS — ${ledger.length} transaction(s)</td>
              <td class="right">UGX ${fmt(totalDebits)}</td>
              <td class="right">UGX ${fmt(totalCredits)}</td>
              <td class="right">UGX ${fmt(Math.abs(closingBalance))}</td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>

        <div class="footer">
          This is a computer-generated statement. Total records: ${ledger.length}
        </div>
      </body>
      </html>
    `);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); printWin.close(); }, 300);
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
                        {row.balance > 0 && (
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
