import { useEffect, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import {
  FileText, CheckCircle2, Clock, AlertCircle, Eye, Download,
  Hash, Building2, Calendar, StickyNote, X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, Column } from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";
import { useBranding } from "@/context/BrandingContext";

type InvoiceStatus = "Paid" | "Pending" | "Overdue";

interface Invoice {
  id: number;
  invoiceNo: string;
  type: string;
  status: InvoiceStatus;
  amount: number;
  dueDate: string;
  generatedDate: string;
  notes?: string;
}

interface TenantInfo {
  id: number;
  fullName: string;
  property?: { name?: string; currency?: string };
  unit?: { unitNumber?: string };
}

const statusConfig: Record<InvoiceStatus, { label: string; icon: any; badge: string; row: string; dot: string }> = {
  Paid:    { label: "Paid",    icon: CheckCircle2,  badge: "bg-green-50 text-green-700 border border-green-200",  row: "bg-green-50",   dot: "bg-green-500" },
  Pending: { label: "Pending", icon: Clock,         badge: "bg-amber-50 text-amber-700 border border-amber-200",  row: "bg-amber-50",   dot: "bg-amber-500" },
  Overdue: { label: "Overdue", icon: AlertCircle,   badge: "bg-red-50 text-red-700 border border-red-200",        row: "bg-red-50",     dot: "bg-red-500"   },
};

const StatusBadge = ({ status }: { status: InvoiceStatus }) => {
  const cfg = statusConfig[status] ?? statusConfig.Pending;
  const Icon = cfg.icon;
  return (
    <Badge className={`${cfg.badge} flex items-center gap-1 font-semibold`}>
      <Icon className="h-3 w-3" /> {cfg.label}
    </Badge>
  );
};

const TypeBadge = ({ type }: { type: string }) => {
  const map: Record<string, string> = {
    Invoice: "bg-blue-50 text-blue-700 border border-blue-200",
    "Manual Invoice": "bg-violet-50 text-violet-700 border border-violet-200",
    "Manual Payment": "bg-teal-50 text-teal-700 border border-teal-200",
  };
  return <Badge className={`${map[type] ?? "bg-slate-100 text-slate-700"} font-medium`}>{type}</Badge>;
};

const KpiCard = ({ label, amount, count, icon: Icon, iconBg, iconColor, amountColor = "text-slate-900" }: {
  label: string; amount: string; count: number;
  icon: any; iconBg: string; iconColor: string; amountColor?: string;
}) => (
  <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
      <span className="text-xs font-medium text-slate-400">{count} invoice{count !== 1 ? "s" : ""}</span>
    </div>
    <div className="mt-4">
      <p className={`text-xl font-bold tracking-tight ${amountColor}`}>{amount}</p>
      <p className="mt-0.5 text-sm font-medium text-slate-500">{label}</p>
    </div>
  </div>
);

const TenantInvoices = () => {
  const { toast } = useToast();
  const { branding } = useBranding();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const stored = localStorage.getItem("user");
        if (!stored) return;
        const userData = JSON.parse(stored);

        const tenantRes = await axios.get<TenantInfo>(`${apiUrl}/GetTenantById/${userData.id}`);
        const tenantData = tenantRes.data;
        setTenant(tenantData);

        const invoicesRes = await axios.get<any[]>(`${apiUrl}/GetInvoicesByTenantId/${tenantData.id}`);
        setInvoices(invoicesRes.data.map((inv) => ({
          id: inv.id,
          invoiceNo: inv.invoiceNumber,
          type: inv.type ?? "Invoice",
          status: inv.status as InvoiceStatus,
          amount: inv.amount,
          dueDate: inv.dueDate,
          generatedDate: inv.invoiceDate ?? inv.createdAt,
          notes: inv.notes,
        })));
      } catch (err) {
        toast({
          title: "Failed to load invoices",
          description: axios.isAxiosError(err) ? err.response?.data || err.message : "An error occurred",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [apiUrl]);

  const currency = tenant?.property?.currency || "UGX";
  const propertyName = tenant?.property?.name ?? "";
  const unitNumber = tenant?.unit?.unitNumber ?? "";

  const filtered = invoices.filter((inv) => tab === "all" || inv.status.toLowerCase() === tab);

  const totalPaid    = invoices.filter((i) => i.status === "Paid").reduce((s, i) => s + i.amount, 0);
  const totalPending = invoices.filter((i) => i.status === "Pending").reduce((s, i) => s + i.amount, 0);
  const totalOverdue = invoices.filter((i) => i.status === "Overdue").reduce((s, i) => s + i.amount, 0);

  const handleDownload = (inv: Invoice) => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 16;
    const cW = pageW - margin * 2;
    let y = 0;

    const fmtDate = (d: string) =>
      d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

    const drawFooter = (pageNum: number, totalPages: number) => {
      doc.setFillColor(10, 18, 40);
      doc.rect(0, pageH - 11, pageW, 11, "F");
      doc.setFillColor(29, 78, 216);
      doc.rect(0, pageH - 11, 3, 11, "F");
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      const co = branding.companyName || "Property Management System";
      doc.text(`${inv.invoiceNo}  ·  ${co}  ·  Generated ${new Date().toLocaleDateString("en-GB")}`, margin, pageH - 4);
      doc.text(`Page ${pageNum} / ${totalPages}`, pageW - margin, pageH - 4, { align: "right" });
    };

    const checkNewPage = (need = 20) => { if (y + need > pageH - 18) { doc.addPage(); y = 20; } };

    // ── Header ────────────────────────────────────────────────────────────────
    doc.setFillColor(10, 18, 40);
    doc.rect(0, 0, pageW, 54, "F");
    doc.setFillColor(29, 78, 216);
    doc.rect(0, 50, pageW, 4, "F");
    doc.setFillColor(234, 179, 8);
    doc.rect(0, 0, 4, 54, "F");

    // Logo or initials
    const logoX = margin + 2;
    const logoY = 9;
    if (branding.logoDataUrl) {
      try { doc.addImage(branding.logoDataUrl, "PNG", logoX, logoY, 26, 26); } catch { /* skip */ }
    } else if (branding.companyName) {
      doc.setFillColor(29, 78, 216);
      doc.roundedRect(logoX, logoY, 26, 26, 4, 4, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      const ini = branding.companyName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
      doc.text(ini, logoX + 13, logoY + 17, { align: "center" });
    }
    if (branding.companyName) {
      const hx = logoX + 30;
      doc.setTextColor(234, 179, 8);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(branding.companyName.toUpperCase(), hx, 16);
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.text("Invoice System", hx, 22);
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE", pageW - margin, branding.companyName ? 20 : 22, { align: "right" });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text(`Invoice:  ${inv.invoiceNo}`, pageW - margin, 28, { align: "right" });
    doc.text(`Issued:   ${fmtDate(inv.generatedDate)}`, pageW - margin, 34, { align: "right" });
    doc.text(`Due:      ${fmtDate(inv.dueDate)}`, pageW - margin, 40, { align: "right" });

    // Status badge
    const s = inv.status;
    if (s === "Paid") doc.setFillColor(16, 185, 129);
    else if (s === "Overdue") doc.setFillColor(239, 68, 68);
    else doc.setFillColor(245, 158, 11);
    doc.roundedRect(pageW - margin - 28, 43, 28, 8, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text(s.toUpperCase(), pageW - margin - 14, 48.5, { align: "center" });

    y = 62;

    // ── Helpers ───────────────────────────────────────────────────────────────
    const sectionBar = (title: string) => {
      checkNewPage(16);
      doc.setFillColor(15, 23, 42);
      doc.roundedRect(margin, y, cW, 8.5, 1.5, 1.5, "F");
      doc.setFillColor(234, 179, 8);
      doc.roundedRect(margin, y, 3, 8.5, 1, 1, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.text(title, margin + 7, y + 6);
      y += 13;
    };

    const card = (x: number, cy: number, w: number, h: number, fill: [number, number, number] = [248, 250, 252]) => {
      doc.setFillColor(...fill);
      doc.roundedRect(x, cy, w, h, 2, 2, "F");
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.roundedRect(x, cy, w, h, 2, 2, "S");
    };

    const fieldRow = (label: string, value: string, last = false) => {
      checkNewPage(9);
      doc.setFillColor(last ? 248 : 248, 250, 252);
      doc.rect(margin, y, cW, 8.5, "F");
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(label, margin + 4, y + 5.8);
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.text(value || "—", margin + 52, y + 5.8);
      if (!last) { doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.15); doc.line(margin, y + 8.5, margin + cW, y + 8.5); }
      y += 8.5;
    };

    // ── 01 Bill To ────────────────────────────────────────────────────────────
    sectionBar("01  BILL TO");
    const halfW = (cW - 4) / 2;
    const partyH = unitNumber ? 32 : 24;
    card(margin, y, halfW, partyH, [238, 242, 255]);
    doc.setFillColor(29, 78, 216);
    doc.roundedRect(margin, y, 3, partyH, 1, 1, "F");
    doc.setTextColor(148, 163, 184); doc.setFontSize(7); doc.setFont("helvetica", "bold");
    doc.text("TENANT", margin + 6, y + 7);
    doc.setTextColor(15, 23, 42); doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text(tenant?.fullName ?? "—", margin + 6, y + 16);

    card(margin + halfW + 4, y, halfW, partyH);
    doc.setFillColor(234, 179, 8);
    doc.roundedRect(margin + halfW + 4, y, 3, partyH, 1, 1, "F");
    doc.setTextColor(148, 163, 184); doc.setFontSize(7); doc.setFont("helvetica", "bold");
    doc.text("PROPERTY / UNIT", margin + halfW + 10, y + 7);
    doc.setTextColor(15, 23, 42); doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text(propertyName || "—", margin + halfW + 10, y + 16);
    if (unitNumber) {
      doc.setTextColor(100, 116, 139); doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
      doc.text(`Unit: ${unitNumber}`, margin + halfW + 10, y + 24);
    }
    y += partyH + 7;

    // ── 02 Invoice Details ────────────────────────────────────────────────────
    checkNewPage(50);
    sectionBar("02  INVOICE DETAILS");
    fieldRow("Invoice Number", inv.invoiceNo);
    fieldRow("Type", inv.type);
    fieldRow("Date Issued", fmtDate(inv.generatedDate));
    fieldRow("Due Date", fmtDate(inv.dueDate), true);
    y += 6;

    // ── 03 Amount ─────────────────────────────────────────────────────────────
    checkNewPage(44);
    sectionBar("03  AMOUNT DUE");
    const amtH = 32;
    card(margin, y, (cW - 4) * 0.6, amtH, [238, 242, 255]);
    doc.setFillColor(29, 78, 216);
    doc.roundedRect(margin, y, 3, amtH, 1, 1, "F");
    doc.setTextColor(148, 163, 184); doc.setFontSize(7); doc.setFont("helvetica", "bold");
    doc.text("TOTAL AMOUNT", margin + 6, y + 8);
    doc.setTextColor(29, 78, 216); doc.setFontSize(15); doc.setFont("helvetica", "bold");
    doc.text(`${currency} ${inv.amount.toLocaleString()}`, margin + 6, y + 22);

    const statusW = (cW - 4) * 0.4;
    card(margin + (cW - 4) * 0.6 + 4, y, statusW, amtH);
    doc.setTextColor(148, 163, 184); doc.setFontSize(7); doc.setFont("helvetica", "bold");
    doc.text("PAYMENT STATUS", margin + (cW - 4) * 0.6 + 8, y + 8);
    const sc = s === "Paid" ? [16, 185, 129] as [number,number,number] : s === "Overdue" ? [239, 68, 68] as [number,number,number] : [245, 158, 11] as [number,number,number];
    doc.setTextColor(...sc); doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text(s, margin + (cW - 4) * 0.6 + 8, y + 22);
    y += amtH + 7;

    // ── 04 Notes ──────────────────────────────────────────────────────────────
    if (inv.notes) {
      checkNewPage(30);
      sectionBar("04  NOTES");
      const noteLines = doc.splitTextToSize(inv.notes, cW - 10);
      const noteH = noteLines.length * 5.5 + 12;
      card(margin, y, cW, noteH, [255, 251, 235]);
      doc.setFillColor(234, 179, 8);
      doc.roundedRect(margin, y, 3, noteH, 1, 1, "F");
      doc.setTextColor(120, 80, 0); doc.setFontSize(8.5); doc.setFont("helvetica", "normal");
      let ny = y + 8;
      noteLines.forEach((line: string) => { checkNewPage(8); doc.text(line, margin + 7, ny); ny += 5.5; });
      y = ny + 6;
    }

    // ── Footer on all pages ───────────────────────────────────────────────────
    const total = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= total; i++) { doc.setPage(i); drawFooter(i, total); }

    doc.save(`${inv.invoiceNo}.pdf`);
    toast({ title: "Invoice Downloaded", description: `${inv.invoiceNo} saved as PDF.` });
  };

  const columns: Column<Invoice>[] = [
    {
      key: "invoiceNo", header: "Invoice No.",
      cell: (row) => <span className="font-mono font-semibold text-slate-900 text-xs">{row.invoiceNo}</span>,
    },
    {
      key: "type", header: "Type",
      cell: (row) => <TypeBadge type={row.type} />,
    },
    {
      key: "amount", header: "Amount", headerClassName: "text-right", className: "text-right",
      cell: (row) => <span className="font-bold text-slate-900">{currency} {row.amount.toLocaleString()}</span>,
    },
    {
      key: "generatedDate", header: "Issued",
      cell: (row) => <span className="text-slate-500 text-xs">{new Date(row.generatedDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>,
    },
    {
      key: "dueDate", header: "Due Date",
      cell: (row) => (
        <span className={`text-xs font-medium ${row.status === "Overdue" ? "text-red-600" : "text-slate-500"}`}>
          {new Date(row.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
        </span>
      ),
    },
    {
      key: "status", header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions", header: "", className: "text-right",
      cell: (row) => (
        <div className="flex justify-end gap-1">
          <button onClick={() => setViewInvoice(row)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-colors">
            <Eye className="h-3.5 w-3.5" /> View
          </button>
          <button onClick={() => handleDownload(row)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors">
            <Download className="h-3.5 w-3.5" /> Download
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl p-7 text-white shadow-xl" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0f2044 45%, #1a3a6e 100%)" }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-semibold text-blue-200 uppercase tracking-wider">
            <FileText className="h-3 w-3" /> Billing
          </span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">My Invoices</h1>
          <p className="mt-1 text-sm text-blue-100">View invoices and billing records from your landlord.</p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label="Total Paid" amount={`${currency} ${totalPaid.toLocaleString()}`} count={invoices.filter(i => i.status === "Paid").length} icon={CheckCircle2} iconBg="bg-green-50" iconColor="text-green-600" amountColor="text-green-700" />
        <KpiCard label="Pending"    amount={`${currency} ${totalPending.toLocaleString()}`} count={invoices.filter(i => i.status === "Pending").length} icon={Clock} iconBg="bg-amber-50" iconColor="text-amber-600" amountColor="text-amber-700" />
        <KpiCard label="Overdue"    amount={`${currency} ${totalOverdue.toLocaleString()}`} count={invoices.filter(i => i.status === "Overdue").length} icon={AlertCircle} iconBg="bg-red-50" iconColor="text-red-600" amountColor="text-red-700" />
      </div>

      {/* Table card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1D4ED8]">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Invoice Records</p>
              <p className="text-xs text-slate-400">All billing records for your tenancy</p>
            </div>
          </div>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="bg-white border border-slate-200 h-9 p-1 rounded-xl">
              <TabsTrigger value="all" className="rounded-lg text-xs px-3 data-[state=active]:bg-[#1D4ED8] data-[state=active]:text-white">All ({invoices.length})</TabsTrigger>
              <TabsTrigger value="paid" className="rounded-lg text-xs px-3 data-[state=active]:bg-green-600 data-[state=active]:text-white">Paid</TabsTrigger>
              <TabsTrigger value="pending" className="rounded-lg text-xs px-3 data-[state=active]:bg-amber-500 data-[state=active]:text-white">Pending</TabsTrigger>
              <TabsTrigger value="overdue" className="rounded-lg text-xs px-3 data-[state=active]:bg-red-600 data-[state=active]:text-white">Overdue</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="p-5">
          <DataTable
            data={filtered}
            columns={columns}
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search invoices…"
            label="invoice"
            loading={loading}
            emptyMessage="No invoices found"
            emptyIcon={<FileText className="h-8 w-8" />}
          />
        </div>
      </div>

      {/* Invoice detail modal */}
      {viewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden">

            {/* Modal header — gradient */}
            <div className="relative px-6 pt-6 pb-8 text-white" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0f2044 45%, #1a3a6e 100%)" }}>
              <button
                onClick={() => setViewInvoice(null)}
                className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <X className="h-4 w-4 text-white" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 border border-white/20">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-blue-200 font-medium uppercase tracking-wider">Invoice</p>
                  <p className="text-lg font-bold font-mono">{viewInvoice.invoiceNo}</p>
                </div>
              </div>

              {/* Amount featured */}
              <div className="rounded-2xl bg-white/10 border border-white/20 px-5 py-4">
                <p className="text-xs text-blue-200 mb-1">Amount Due</p>
                <p className="text-3xl font-bold">{currency} {viewInvoice.amount.toLocaleString()}</p>
              </div>

              {/* Status badge in header */}
              <div className="mt-3 flex items-center gap-2">
                {(() => {
                  const cfg = statusConfig[viewInvoice.status];
                  const Icon = cfg?.icon ?? Clock;
                  return (
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${cfg?.badge ?? ""}`}>
                      <Icon className="h-3 w-3" /> {viewInvoice.status}
                    </span>
                  );
                })()}
                <TypeBadge type={viewInvoice.type} />
              </div>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-0">
              {[
                { icon: Hash,       label: "Invoice No.",   value: <span className="font-mono text-sm">{viewInvoice.invoiceNo}</span> },
                ...(propertyName ? [{ icon: Building2, label: "Property", value: propertyName }] : []),
                ...(unitNumber    ? [{ icon: Building2, label: "Unit",     value: unitNumber }]    : []),
                { icon: Calendar,   label: "Date Issued",   value: new Date(viewInvoice.generatedDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) },
                { icon: Calendar,   label: "Due Date",      value: <span className={viewInvoice.status === "Overdue" ? "text-red-600 font-semibold" : ""}>{new Date(viewInvoice.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span> },
                ...(viewInvoice.notes ? [{ icon: StickyNote, label: "Notes", value: viewInvoice.notes }] : []),
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start justify-between gap-4 py-3 border-b border-slate-100 last:border-0">
                  <div className="flex items-center gap-2.5 text-slate-400 shrink-0">
                    <Icon className="h-4 w-4" />
                    <span className="text-sm text-slate-500">{label}</span>
                  </div>
                  <span className="text-sm font-medium text-slate-800 text-right">{value || "—"}</span>
                </div>
              ))}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button
                onClick={() => setViewInvoice(null)}
                className="text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => handleDownload(viewInvoice)}
                className="flex items-center gap-2 rounded-xl bg-[#1D4ED8] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1e40af] transition-colors shadow-sm"
              >
                <Download className="h-4 w-4" /> Download Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantInvoices;
