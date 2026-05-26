import React, { useState, useEffect } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useToast } from "@/hooks/use-toast";
import { useBranding } from "@/context/BrandingContext";
import {
  Droplets, Search, FileDown, CheckCircle2, XCircle, Clock,
  Hash, TrendingUp, DollarSign, User, Home, Key, Phone,
  Copy, Check, AlertTriangle, RefreshCw, WifiOff, Zap,
  ChevronRight, Activity,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type UtilityTx = {
  id: number;
  transactionID: string;
  reasonAtTelecom: string;
  paymentMethod: string;
  utilityType: string;
  status: string;
  amount: number;
  charges: number;
  createdAt: string;
  phoneNumber: string;
  meterNumber: string;
  isTokenGenerated: boolean;
  token: string | null;
  units: string | null;
};

type Tenant = {
  id: number;
  fullName: string;
  phoneNumber: string;
  waterMeterNo?: string;
  unit?: { unitNumber: string };
  property: { id: number; name: string };
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  `UGX ${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const fmtDate = (ds: string) =>
  new Date(ds).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const initials = (name: string) =>
  name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

const statusMeta = (status: string) => {
  const up = status?.toUpperCase() ?? "";
  if (up.includes("FAILED") || up.includes("ERROR"))
    return { color: "text-red-600", bg: "bg-red-50", border: "border-red-200", icon: XCircle, dot: "bg-red-500" };
  if (up.includes("PENDING"))
    return { color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", icon: Clock, dot: "bg-amber-400" };
  return { color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", icon: CheckCircle2, dot: "bg-emerald-500" };
};

// ── Sub-components ─────────────────────────────────────────────────────────────
const CopyToken = ({ token }: { token: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(token); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="group flex items-center gap-1.5 font-mono text-xs font-bold text-blue-700 hover:text-blue-900 transition-colors"
      title="Copy token"
    >
      <span>{token}</span>
      {copied
        ? <Check className="h-3.5 w-3.5 text-emerald-500" />
        : <Copy className="h-3.5 w-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />}
    </button>
  );
};

const AvatarCircle = ({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) => {
  const sizes = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-14 w-14 text-base" };
  const colors = ["bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-rose-500", "bg-amber-500", "bg-cyan-500"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`${sizes[size]} ${color} rounded-full flex items-center justify-center font-bold text-white shrink-0`}>
      {initials(name)}
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
const UtilityReport: React.FC = () => {
  const { toast } = useToast();
  const { branding } = useBranding();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const userData = JSON.parse(localStorage.getItem("user") || "{}");

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantSearch, setTenantSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [meterOverride, setMeterOverride] = useState("");

  const [txs, setTxs] = useState<UtilityTx[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const selected = tenants.find((t) => String(t.id) === selectedId) ?? null;
  const activeMeter = selected?.waterMeterNo || meterOverride.trim();

  // Load tenants
  useEffect(() => {
    axios.get(`${apiUrl}/GetAllTenants`)
      .then((r) => setTenants((r.data as any[]).filter((t) => t?.property?.ownerId === userData.id)))
      .catch(() => {});
  }, []);

  // Auto-fetch on tenant select
  useEffect(() => {
    if (selected?.waterMeterNo) fetchTxs(selected.waterMeterNo);
    else { setTxs([]); setFetched(false); }
  }, [selectedId]);

  const fetchTxs = async (meter?: string) => {
    const m = meter ?? activeMeter;
    if (!m) { toast({ title: "No meter", description: "Select a tenant with a meter or enter one.", variant: "destructive" }); return; }
    setLoading(true); setFetched(false);
    try {
      const { data } = await axios.get<UtilityTx[]>(`${apiUrl}/GetUtilityPaymentByMeterNumber/${m}`);
      setTxs(data ?? []);
      setFetched(true);
    } catch {
      setTxs([]); setFetched(true);
    } finally { setLoading(false); }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const companyName = branding.companyName || "Property Management System";

    // ── Dark navy header ──────────────────────────────────────────────────────
    doc.setFillColor(10, 18, 24);
    doc.rect(0, 0, pw, 38, "F");

    // Gold accent bar
    doc.setFillColor(212, 175, 55);
    doc.rect(0, 38, pw, 2.5, "F");

    // Logo or initials circle
    if (branding.logoDataUrl) {
      try { doc.addImage(branding.logoDataUrl, "PNG", 12, 6, 26, 26); } catch { /* skip */ }
    } else {
      doc.setFillColor(212, 175, 55);
      doc.circle(25, 19, 12, "F");
      doc.setTextColor(10, 18, 24);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      const ini = companyName.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase();
      doc.text(ini, 25, 23, { align: "center" });
    }

    // Company name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.text(companyName, 44, 16);

    // Report title right-aligned
    doc.setFontSize(9);
    doc.setTextColor(212, 175, 55);
    doc.setFont("helvetica", "normal");
    doc.text("UTILITY PAYMENT REPORT", pw - 12, 16, { align: "right" });

    // Subtitle
    doc.setTextColor(180, 200, 220);
    doc.setFontSize(8);
    doc.text(new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }), pw - 12, 24, { align: "right" });

    // Blue accent strip under header
    doc.setFillColor(29, 78, 216);
    doc.rect(0, 40.5, pw, 1, "F");

    // ── Info row ──────────────────────────────────────────────────────────────
    let y = 52;
    const infoCards: [string, string][] = [];
    if (selected) infoCards.push(["TENANT", selected.fullName]);
    infoCards.push(["METER NUMBER", activeMeter]);
    if (selected?.unit?.unitNumber) infoCards.push(["UNIT", selected.unit.unitNumber]);
    if (selected?.property.name) infoCards.push(["PROPERTY", selected.property.name]);

    const cardW = (pw - 24 - (infoCards.length - 1) * 4) / infoCards.length;
    infoCards.forEach(([label, value], i) => {
      const cx = 12 + i * (cardW + 4);
      doc.setFillColor(235, 242, 255);
      doc.roundedRect(cx, y, cardW, 18, 2, 2, "F");
      doc.setFontSize(6.5);
      doc.setTextColor(100, 130, 180);
      doc.setFont("helvetica", "bold");
      doc.text(label, cx + 5, y + 6);
      doc.setFontSize(8);
      doc.setTextColor(15, 30, 60);
      doc.setFont("helvetica", "normal");
      doc.text(value, cx + 5, y + 13, { maxWidth: cardW - 8 });
    });
    y += 26;

    // ── Summary stats ─────────────────────────────────────────────────────────
    const totalAmt = txs.reduce((s, t) => s + t.amount, 0);
    const totalChr = txs.reduce((s, t) => s + t.charges, 0);
    const completed = txs.filter(t => !t.status?.toUpperCase().includes("FAILED") && !t.status?.toUpperCase().includes("PENDING")).length;

    const stats: [string, string][] = [
      ["TOTAL PAID", fmt(totalAmt)],
      ["TOTAL CHARGES", fmt(totalChr)],
      ["TRANSACTIONS", String(txs.length)],
      ["COMPLETED", String(completed)],
    ];
    const statW = (pw - 24 - 9) / 4;
    stats.forEach(([label, value], i) => {
      const sx = 12 + i * (statW + 3);
      doc.setFillColor(10, 18, 24);
      doc.roundedRect(sx, y, statW, 20, 2, 2, "F");
      doc.setFontSize(6);
      doc.setTextColor(212, 175, 55);
      doc.setFont("helvetica", "bold");
      doc.text(label, sx + statW / 2, y + 7, { align: "center" });
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text(value, sx + statW / 2, y + 15, { align: "center" });
    });
    y += 28;

    // ── Table ─────────────────────────────────────────────────────────────────
    autoTable(doc, {
      startY: y,
      head: [["Date", "Status", "Amount (UGX)", "Charges (UGX)", "Units", "Token"]],
      body: txs.map((t) => [
        fmtDate(t.createdAt),
        t.status,
        t.amount.toLocaleString(),
        t.charges.toLocaleString(),
        t.units || "N/A",
        t.isTokenGenerated ? t.token || "N/A" : "N/A",
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [29, 78, 216], textColor: 255, fontStyle: "bold", fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 248, 255] },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 24 },
        2: { cellWidth: 32, halign: "right" },
        3: { cellWidth: 32, halign: "right" },
        4: { cellWidth: 18, halign: "center" },
        5: { cellWidth: "auto" },
      },
    });

    // ── Footer on every page ──────────────────────────────────────────────────
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.setFillColor(10, 18, 24);
      doc.rect(0, ph - 12, pw, 12, "F");
      doc.setFontSize(7);
      doc.setTextColor(180, 200, 220);
      doc.setFont("helvetica", "normal");
      doc.text(companyName, 12, ph - 4);
      doc.text(`Page ${p} of ${pageCount}`, pw - 12, ph - 4, { align: "right" });
    }

    doc.save(`utility-${activeMeter}.pdf`);
  };

  // Stats
  const totalPaid = txs.reduce((s, t) => s + t.amount, 0);
  const totalCharges = txs.reduce((s, t) => s + t.charges, 0);
  const successful = txs.filter((t) => { const u = t.status?.toUpperCase(); return !u.includes("FAILED") && !u.includes("PENDING"); });
  const failed = txs.filter((t) => t.status?.toUpperCase().includes("FAILED"));
  const pending = txs.filter((t) => t.status?.toUpperCase().includes("PENDING"));
  const tokens = txs.filter((t) => t.isTokenGenerated && t.token);

  const filteredTenants = tenants.filter((t) =>
    t.fullName.toLowerCase().includes(tenantSearch.toLowerCase()) ||
    t.waterMeterNo?.includes(tenantSearch) ||
    t.property.name.toLowerCase().includes(tenantSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 pb-8">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-2xl px-6 py-7 md:px-10"
        style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0f2044 50%, #1a3a6e 100%)" }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.035]"
          style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        {/* Glow blobs */}
        <div className="absolute -top-10 -right-10 h-48 w-48 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-24 h-32 w-32 rounded-full bg-cyan-400/10 blur-2xl pointer-events-none" />

        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400/30 to-cyan-400/20 border border-white/15 shadow-inner">
              <Droplets className="h-7 w-7 text-cyan-300" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-blue-300/80">Water & Utility</p>
              <h1 className="text-2xl font-bold text-white md:text-3xl">Utility Tracker</h1>
              <p className="text-sm text-blue-200/70 mt-0.5">Meter allocations · token history · payment records</p>
            </div>
          </div>

          {/* Hero stat chips */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: "With Meter", value: tenants.filter((t) => t.waterMeterNo).length, color: "text-cyan-300" },
              { label: "No Meter", value: tenants.filter((t) => !t.waterMeterNo).length, color: "text-amber-300" },
              { label: "Total Tenants", value: tenants.length, color: "text-white" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex flex-col items-center rounded-xl border border-white/15 bg-white/10 px-4 py-2 min-w-[70px]">
                <span className={`text-xl font-bold ${color}`}>{value}</span>
                <span className="text-[10px] text-blue-200/70 font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Two-pane layout ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">

        {/* ── LEFT: Tenant list ── */}
        <div className="flex flex-col gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={tenantSearch}
              onChange={(e) => setTenantSearch(e.target.value)}
              placeholder="Search tenant or meter…"
              className="w-full rounded-xl border border-[#E2E8F0] bg-white pl-9 pr-4 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20 shadow-sm"
            />
          </div>

          {/* Tenant cards */}
          <div className="flex flex-col gap-2 max-h-[620px] overflow-y-auto pr-0.5">
            {filteredTenants.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 py-10 flex flex-col items-center gap-2">
                <User className="h-6 w-6 text-slate-300" />
                <p className="text-xs text-slate-400">No tenants found</p>
              </div>
            ) : (
              filteredTenants.map((t) => {
                const hasMeter = !!t.waterMeterNo;
                const isActive = selectedId === String(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => { setSelectedId(String(t.id)); setMeterOverride(""); }}
                    className={`w-full text-left rounded-xl border p-3.5 transition-all duration-150 ${
                      isActive
                        ? "border-[#1D4ED8] bg-blue-50 shadow-md shadow-blue-100"
                        : "border-[#E2E8F0] bg-white hover:border-blue-200 hover:bg-slate-50/60 shadow-sm"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <AvatarCircle name={t.fullName} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-sm font-semibold truncate ${isActive ? "text-[#1D4ED8]" : "text-[#0F172A]"}`}>
                            {t.fullName}
                          </p>
                          <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${isActive ? "text-[#1D4ED8] rotate-90" : "text-slate-300"}`} />
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {t.property.name}{t.unit?.unitNumber ? ` · ${t.unit.unitNumber}` : ""}
                        </p>
                        <div className="mt-2">
                          {hasMeter ? (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 border border-blue-100 px-2 py-0.5 font-mono text-[11px] font-bold text-blue-700">
                              <Droplets className="h-2.5 w-2.5" /> {t.waterMeterNo}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-600">
                              <WifiOff className="h-2.5 w-2.5" /> No meter
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Manual meter lookup */}
          <div className="rounded-xl border border-dashed border-[#E2E8F0] bg-slate-50/60 p-4 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Manual Meter Lookup</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  value={meterOverride}
                  onChange={(e) => { setMeterOverride(e.target.value); setSelectedId(""); }}
                  onKeyDown={(e) => e.key === "Enter" && fetchTxs()}
                  placeholder="Enter meter number"
                  className="w-full rounded-lg border border-[#E2E8F0] bg-white pl-8 pr-3 py-2 text-xs font-mono text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                />
              </div>
              <button
                onClick={() => fetchTxs()}
                disabled={loading || !meterOverride.trim()}
                className="rounded-lg bg-[#1D4ED8] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1e40af] disabled:opacity-40 transition-colors"
              >
                {loading ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Search className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Detail pane ── */}
        <div className="flex flex-col gap-4">

          {/* No tenant selected */}
          {!selected && !fetched && (
            <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-[#E2E8F0] bg-white py-24 gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
                <Droplets className="h-8 w-8 text-blue-300" />
              </div>
              <div className="text-center">
                <p className="text-base font-semibold text-[#0F172A]">Select a tenant</p>
                <p className="text-sm text-[#94A3B8] mt-1">Choose a tenant on the left to view their<br />meter allocation and payment history.</p>
              </div>
            </div>
          )}

          {/* Tenant selected */}
          {(selected || fetched) && (
            <>
              {/* Tenant header card */}
              {selected && (
                <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between gap-4 px-5 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-[#F1F5F9]">
                    <div className="flex items-center gap-4">
                      <AvatarCircle name={selected.fullName} size="lg" />
                      <div>
                        <h2 className="text-lg font-bold text-[#0F172A]">{selected.fullName}</h2>
                        <div className="flex flex-wrap items-center gap-3 mt-1">
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Home className="h-3 w-3" /> {selected.property.name}
                            {selected.unit?.unitNumber && <> · <span className="font-mono font-bold">{selected.unit.unitNumber}</span></>}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Phone className="h-3 w-3" /> {selected.phoneNumber}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {selected.waterMeterNo ? (
                        <div className="flex flex-col items-end">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Meter No.</p>
                          <span className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 font-mono text-sm font-bold text-white shadow-sm shadow-blue-200">
                            <Droplets className="h-4 w-4" /> {selected.waterMeterNo}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-sm font-medium text-amber-700">
                          <AlertTriangle className="h-4 w-4" /> No meter assigned
                        </span>
                      )}
                      <button
                        onClick={() => fetchTxs()}
                        disabled={loading || !selected.waterMeterNo}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-slate-400 hover:text-[#1D4ED8] hover:border-[#1D4ED8]/30 disabled:opacity-30 transition-colors"
                        title="Refresh"
                      >
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                      </button>
                      {txs.length > 0 && (
                        <button
                          onClick={exportPDF}
                          className="flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          <FileDown className="h-3.5 w-3.5" /> PDF
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Stat row */}
                  {fetched && (
                    <div className="grid grid-cols-2 divide-x divide-[#F1F5F9] sm:grid-cols-4 border-t border-[#F1F5F9]">
                      {[
                        { label: "Total Paid", value: fmt(totalPaid), color: "text-blue-600", icon: DollarSign },
                        { label: "Total Charges", value: fmt(totalCharges), color: "text-amber-600", icon: TrendingUp },
                        { label: "Successful", value: successful.length, color: "text-emerald-600", icon: CheckCircle2 },
                        { label: "Tokens Given", value: tokens.length, color: "text-purple-600", icon: Key },
                      ].map(({ label, value, color, icon: Icon }) => (
                        <div key={label} className="flex items-center gap-3 px-4 py-3">
                          <Icon className={`h-4 w-4 ${color} shrink-0`} />
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
                            <p className={`text-base font-bold ${color}`}>{value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Loading spinner */}
              {loading && (
                <div className="flex items-center justify-center rounded-2xl border border-[#E2E8F0] bg-white py-16">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
                    <p className="text-sm text-slate-400">Loading payment history…</p>
                  </div>
                </div>
              )}

              {/* Token showcase */}
              {!loading && tokens.length > 0 && (
                <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2 border-b border-[#F1F5F9] px-5 py-3.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50">
                      <Zap className="h-3.5 w-3.5 text-purple-600" />
                    </div>
                    <span className="text-sm font-semibold text-[#0F172A]">Generated Tokens</span>
                    <span className="rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 ml-1">{tokens.length}</span>
                  </div>
                  <div className="flex flex-wrap gap-3 p-4">
                    {tokens.map((t) => (
                      <div key={t.id}
                        className="relative flex flex-col gap-1.5 rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50 to-blue-50 px-4 py-3 min-w-[180px]">
                        {/* perforated edge decoration */}
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 h-4 w-4 rounded-full bg-white border border-[#E2E8F0]" />
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 h-4 w-4 rounded-full bg-white border border-[#E2E8F0]" />
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-purple-500">Prepaid Token</p>
                        <CopyToken token={t.token!} />
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-[10px] text-slate-400">{fmtDate(t.createdAt)}</span>
                          {t.units && (
                            <span className="text-[10px] font-bold text-blue-600">{t.units} kWh</span>
                          )}
                        </div>
                        <span className="text-[10px] font-semibold text-emerald-600">{fmt(t.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment history */}
              {!loading && fetched && (
                <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between border-b border-[#F1F5F9] px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-semibold text-[#0F172A]">Payment History</span>
                      <span className="rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 ml-1">
                        {txs.length} records
                      </span>
                    </div>
                    <div className="flex gap-2 text-[10px] font-semibold">
                      <span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5">{successful.length} OK</span>
                      {pending.length > 0 && <span className="rounded-full bg-amber-50 text-amber-700 px-2 py-0.5">{pending.length} Pending</span>}
                      {failed.length > 0 && <span className="rounded-full bg-red-50 text-red-700 px-2 py-0.5">{failed.length} Failed</span>}
                    </div>
                  </div>

                  {txs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-14 gap-3">
                      <Droplets className="h-8 w-8 text-slate-200" />
                      <p className="text-sm text-slate-400">No payment records for this meter yet.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#F8FAFC]">
                      {txs.map((tx) => {
                        const sm = statusMeta(tx.status);
                        const Icon = sm.icon;
                        return (
                          <div key={tx.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
                            {/* Status dot + icon */}
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${sm.bg} border ${sm.border}`}>
                              <Icon className={`h-4 w-4 ${sm.color}`} />
                            </div>

                            {/* Date + type */}
                            <div className="w-24 shrink-0">
                              <p className="text-xs font-semibold text-[#0F172A]">{fmtDate(tx.createdAt)}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{tx.utilityType || tx.paymentMethod || "Utility"}</p>
                            </div>

                            {/* Amount */}
                            <div className="flex-1">
                              <p className="text-sm font-bold text-[#0F172A]">{fmt(tx.amount)}</p>
                              {tx.charges > 0 && (
                                <p className="text-[10px] text-slate-400 mt-0.5">Charges: {fmt(tx.charges)}</p>
                              )}
                            </div>

                            {/* Token */}
                            <div className="flex-1 hidden sm:block">
                              {tx.isTokenGenerated && tx.token ? (
                                <CopyToken token={tx.token} />
                              ) : (
                                <span className="text-xs text-slate-300">No token</span>
                              )}
                              {tx.units && (
                                <p className="text-[10px] text-blue-600 font-bold mt-0.5">{tx.units} kWh</p>
                              )}
                            </div>

                            {/* Status badge */}
                            <div className="shrink-0">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${sm.bg} ${sm.color} border ${sm.border}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${sm.dot}`} />
                                {tx.status}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UtilityReport;
