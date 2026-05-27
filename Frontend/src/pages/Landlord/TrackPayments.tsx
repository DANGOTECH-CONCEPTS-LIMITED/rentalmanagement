import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import jsPDF from "jspdf";
import { useBranding } from "@/context/BrandingContext";
import {
  CircleDollarSign,
  ArrowUp,
  ArrowDown,
  Download,
  DownloadIcon,
  Bell,
  BellRing,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Send,
  Loader2,
  User,
  TrendingUp,
  Banknote,
  FileText,
  Eye,
  Home,
  Calendar,
  CreditCard,
  Clock,
  Phone,
  X,
  Hash,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { DataTable, Column } from "@/components/ui/data-table";

const AUTO_ACK_KEY = "sms_auto_acknowledge";

// ── Unified payment row (normalised from both sources) ────────────────────────
interface UnifiedPayment {
  uid: string;
  source: "payment" | "invoice";
  tenantId: number;
  tenantName: string;
  tenantPhone: string;
  propertyName: string;
  amount: number;
  date: string;
  status: string;
  method: string;
  reference: string;
  vendor?: string;
  notes?: string | null;
}

interface RawPayment {
  id: number;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  vendor: string;
  paymentType: string;
  paymentStatus: string;
  transactionId: string;
  description: string | null;
  propertyTenantId: number;
  propertyTenant: {
    id: number;
    fullName: string;
    phoneNumber: string;
    property: { id: number; name: string; address: string; ownerId: number };
  };
}

interface RawInvoice {
  id: number;
  invoiceNumber: string;
  type: string;
  status: string;
  amount: number;
  invoiceDate: string;
  dueDate: string;
  notes: string | null;
  tenantId: number;
  tenant: { id: number; fullName: string; phoneNumber: string };
  property: { id: number; name: string };
}

const normaliseStatus = (s: string) => {
  const u = s?.toLowerCase();
  if (u === "successful" || u === "paid") return "Paid";
  if (u === "pending") return "Pending";
  if (u === "failed") return "Failed";
  return s;
};

// ── Sub-components ────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const s = status?.toLowerCase();
  if (s === "paid")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="h-3 w-3" /> Paid
      </span>
    );
  if (s === "pending")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
        <Clock className="h-3 w-3" /> Pending
      </span>
    );
  if (s === "failed")
    return (
      <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 border border-red-200">
        <AlertCircle className="h-3 w-3 mr-1" /> Failed
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
      {status}
    </span>
  );
};

const MethodBadge = ({ method }: { method: string }) => {
  const map: Record<string, { label: string; cls: string }> = {
    CASH:             { label: "Cash",          cls: "bg-slate-100 text-slate-700 border-slate-200" },
    MOMO:             { label: "Mobile Money",  cls: "bg-violet-50 text-violet-700 border-violet-100" },
    BANK:             { label: "Bank",          cls: "bg-blue-50 text-blue-700 border-blue-100" },
    CARD:             { label: "Card",          cls: "bg-indigo-50 text-indigo-700 border-indigo-100" },
    "Invoice":        { label: "Invoice",       cls: "bg-cyan-50 text-cyan-700 border-cyan-100" },
    "Manual Payment": { label: "Manual",        cls: "bg-orange-50 text-orange-700 border-orange-100" },
    "Monthly Rent":   { label: "Monthly Rent",  cls: "bg-teal-50 text-teal-700 border-teal-100" },
  };
  const m = map[method] ?? { label: method, cls: "bg-slate-100 text-slate-600 border-slate-200" };
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${m.cls}`}>
      {m.label}
    </span>
  );
};

const SourceBadge = ({ source }: { source: "payment" | "invoice" }) =>
  source === "invoice" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-600">
      <FileText className="h-2.5 w-2.5" /> Invoice
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-500">
      <Banknote className="h-2.5 w-2.5" /> Payment
    </span>
  );

const DetailRow = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) => (
  <div className="flex items-start gap-3 py-3 border-b border-[#E2E8F0] last:border-0">
    <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
      <Icon className="h-4 w-4 text-slate-500" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">{label}</p>
      <div className="text-sm font-medium text-[#0F172A] mt-0.5">{value}</div>
    </div>
  </div>
);

const TABS = [
  { key: "all",     label: "All" },
  { key: "paid",    label: "Paid" },
  { key: "pending", label: "Pending" },
  { key: "failed",  label: "Failed" },
  { key: "invoice", label: "Invoices" },
  { key: "payment", label: "Payments" },
];

// ── Component ─────────────────────────────────────────────────────────────────
const TrackPayments = () => {
  const { toast } = useToast();
  const { branding } = useBranding();
  const [payments, setPayments] = useState<UnifiedPayment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [tab, setTab] = useState("all");
  const [sortField, setSortField] = useState("date");
  const [sortDirection, setSortDirection] = useState("desc");
  const [viewPayment, setViewPayment] = useState<UnifiedPayment | null>(null);

  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [selectedTenantIds, setSelectedTenantIds] = useState<Set<number>>(new Set());
  const [isSendingReminders, setIsSendingReminders] = useState(false);
  const [sendingAckId, setSendingAckId] = useState<string | null>(null);
  const [autoAcknowledge, setAutoAcknowledge] = useState(
    () => localStorage.getItem(AUTO_ACK_KEY) === "true"
  );

  const user = localStorage.getItem("user");
  const userData = JSON.parse(user);
  const token = userData?.token ?? "";
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const [rawPaymentsRes, rawInvoicesRes] = await Promise.allSettled([
        fetch(`${apiUrl}/GetAllPayments`, { headers: { Authorization: `Bearer ${token}`, accept: "*/*" } }),
        fetch(`${apiUrl}/GetInvoicesByLandLordId/${userData.id}`, { headers: { Authorization: `Bearer ${token}`, accept: "*/*" } }),
      ]);

      const unified: UnifiedPayment[] = [];

      if (rawPaymentsRes.status === "fulfilled" && rawPaymentsRes.value.ok) {
        const data: RawPayment[] = await rawPaymentsRes.value.json();
        data
          .filter((p) => p.propertyTenant?.property?.ownerId === userData.id)
          .forEach((p) => unified.push({
            uid: `pay-${p.id}`,
            source: "payment",
            tenantId: p.propertyTenantId,
            tenantName: p.propertyTenant.fullName,
            tenantPhone: p.propertyTenant.phoneNumber,
            propertyName: p.propertyTenant.property.name,
            amount: p.amount,
            date: p.paymentDate,
            status: normaliseStatus(p.paymentStatus),
            method: p.paymentMethod,
            reference: p.transactionId,
            vendor: p.vendor,
            notes: p.description,
          }));
      }

      if (rawInvoicesRes.status === "fulfilled" && rawInvoicesRes.value.ok) {
        const data: RawInvoice[] = await rawInvoicesRes.value.json();
        data.forEach((inv) => unified.push({
          uid: `inv-${inv.id}`,
          source: "invoice",
          tenantId: inv.tenantId,
          tenantName: inv.tenant?.fullName ?? "",
          tenantPhone: inv.tenant?.phoneNumber ?? "",
          propertyName: inv.property?.name ?? "",
          amount: inv.amount,
          date: inv.invoiceDate,
          status: normaliseStatus(inv.status),
          method: inv.type,
          reference: inv.invoiceNumber,
          notes: inv.notes,
        }));
      }

      setPayments(unified);
    } catch {
      toast({ title: "Error loading payments", description: "Could not retrieve payment data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchPayments(); }, []);

  const sendSms = async (phone: string, message: string, reference: string) => {
    const res = await fetch(`${apiUrl}/sendSingleSms`, {
      method: "POST",
      headers: { accept: "*/*", Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ phone, message, reference }),
    });
    if (!res.ok) throw new Error(`SMS failed: ${res.status}`);
  };

  const pendingByTenant = Object.values(
    payments
      .filter((p) => p.status === "Pending")
      .reduce<Record<number, UnifiedPayment>>((acc, p) => {
        if (!acc[p.tenantId]) acc[p.tenantId] = { ...p };
        else acc[p.tenantId].amount += p.amount;
        return acc;
      }, {})
  );

  const handleToggleTenant = (id: number) => {
    setSelectedTenantIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedTenantIds.size === pendingByTenant.length)
      setSelectedTenantIds(new Set());
    else
      setSelectedTenantIds(new Set(pendingByTenant.map((p) => p.tenantId)));
  };

  const handleSendBulkReminders = async () => {
    const targets = pendingByTenant.filter((p) => selectedTenantIds.has(p.tenantId));
    if (targets.length === 0) return;
    setIsSendingReminders(true);
    let sent = 0, failed = 0;
    for (const p of targets) {
      const msg = `Dear ${p.tenantName}, your rent payment of UGX ${p.amount.toLocaleString()} for ${p.propertyName} is currently pending. Please make your payment at your earliest convenience. Thank you.`;
      try { await sendSms(p.tenantPhone, msg, "Rent Payment Reminder"); sent++; }
      catch { failed++; }
    }
    setIsSendingReminders(false);
    setShowReminderDialog(false);
    setSelectedTenantIds(new Set());
    toast({
      title: failed === 0 ? "Reminders Sent" : "Partial Success",
      description: failed === 0 ? `${sent} SMS reminder${sent !== 1 ? "s" : ""} sent.` : `${sent} sent, ${failed} failed.`,
      variant: failed > 0 ? "destructive" : "default",
    });
  };

  const handleSendAcknowledgment = async (p: UnifiedPayment) => {
    setSendingAckId(p.uid);
    const msg = `Dear ${p.tenantName}, your payment of UGX ${p.amount.toLocaleString()} for ${p.propertyName} (Ref: ${p.reference}) was received on ${new Date(p.date).toLocaleDateString()}. Thank you!`;
    try {
      await sendSms(p.tenantPhone, msg, "Payment Acknowledgment");
      toast({ title: "Acknowledgment Sent", description: `SMS sent to ${p.tenantName}.` });
    } catch {
      toast({ title: "SMS Failed", description: "Could not send acknowledgment.", variant: "destructive" });
    } finally {
      setSendingAckId(null);
    }
  };

  const handleAutoAcknowledgeToggle = (checked: boolean) => {
    setAutoAcknowledge(checked);
    localStorage.setItem(AUTO_ACK_KEY, String(checked));
    toast({
      title: checked ? "Auto-Acknowledge Enabled" : "Auto-Acknowledge Disabled",
      description: checked ? "SMS will be sent automatically when a payment is confirmed." : "Automatic acknowledgment SMS is off.",
    });
  };

  const generateReceipt = (p: UnifiedPayment) => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const mg = 16;
    const cW = pageW - mg * 2;

    const fmtDate = (d: string) =>
      d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

    // Header background
    doc.setFillColor(10, 18, 40); doc.rect(0, 0, pageW, 54, "F");
    doc.setFillColor(16, 185, 129); doc.rect(0, 50, pageW, 4, "F");  // emerald bottom stripe
    doc.setFillColor(16, 185, 129); doc.rect(0, 0, 4, 54, "F");      // emerald left stripe

    // Logo / company name
    const logoX = mg + 2, logoY = 9;
    if (branding.logoDataUrl) {
      try { doc.addImage(branding.logoDataUrl, "PNG", logoX, logoY, 26, 26); } catch { /* skip */ }
    } else if (branding.companyName) {
      doc.setFillColor(16, 185, 129); doc.roundedRect(logoX, logoY, 26, 26, 4, 4, "F");
      doc.setTextColor(255, 255, 255); doc.setFontSize(14); doc.setFont("helvetica", "bold");
      const ini = branding.companyName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
      doc.text(ini, logoX + 13, logoY + 17, { align: "center" });
    }
    if (branding.companyName) {
      const hx = logoX + 30;
      doc.setTextColor(16, 185, 129); doc.setFontSize(9); doc.setFont("helvetica", "bold");
      doc.text(branding.companyName.toUpperCase(), hx, 16);
      doc.setTextColor(148, 163, 184); doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
      doc.text("Payment Receipt", hx, 22);
    }

    // RECEIPT title + meta
    doc.setTextColor(255, 255, 255); doc.setFontSize(22); doc.setFont("helvetica", "bold");
    doc.text("RECEIPT", pageW - mg, branding.companyName ? 20 : 22, { align: "right" });
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(148, 163, 184);
    doc.text(`Ref:   ${p.reference}`, pageW - mg, 28, { align: "right" });
    doc.text(`Date:  ${fmtDate(p.date)}`, pageW - mg, 34, { align: "right" });

    // Status pill in header
    const s = p.status;
    if (s === "Paid") doc.setFillColor(16, 185, 129);
    else if (s === "Failed") doc.setFillColor(239, 68, 68);
    else doc.setFillColor(245, 158, 11);
    doc.roundedRect(pageW - mg - 28, 43, 28, 8, 2, 2, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(7.5); doc.setFont("helvetica", "bold");
    doc.text(s.toUpperCase(), pageW - mg - 14, 48.5, { align: "center" });

    let y = 62;

    const sectionBar = (title: string) => {
      doc.setFillColor(15, 23, 42); doc.roundedRect(mg, y, cW, 8.5, 1.5, 1.5, "F");
      doc.setFillColor(16, 185, 129); doc.roundedRect(mg, y, 3, 8.5, 1, 1, "F");
      doc.setTextColor(255, 255, 255); doc.setFontSize(8.5); doc.setFont("helvetica", "bold");
      doc.text(title, mg + 7, y + 6); y += 13;
    };

    const card = (x: number, cy: number, w: number, h: number, fill: [number, number, number] = [248, 250, 252]) => {
      doc.setFillColor(...fill); doc.roundedRect(x, cy, w, h, 2, 2, "F");
      doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.2); doc.roundedRect(x, cy, w, h, 2, 2, "S");
    };

    const fieldRow = (label: string, value: string, last = false) => {
      doc.setFillColor(248, 250, 252); doc.rect(mg, y, cW, 8.5, "F");
      doc.setTextColor(100, 116, 139); doc.setFontSize(8); doc.setFont("helvetica", "normal");
      doc.text(label, mg + 4, y + 5.8);
      doc.setTextColor(15, 23, 42); doc.setFont("helvetica", "bold");
      doc.text(value || "—", mg + 52, y + 5.8);
      if (!last) { doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.15); doc.line(mg, y + 8.5, mg + cW, y + 8.5); }
      y += 8.5;
    };

    // Section 01 – Received From
    sectionBar("01  RECEIVED FROM");
    const halfW = (cW - 4) / 2;
    card(mg, y, halfW, 24, [236, 253, 245]);
    doc.setFillColor(16, 185, 129); doc.roundedRect(mg, y, 3, 24, 1, 1, "F");
    doc.setTextColor(148, 163, 184); doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.text("TENANT", mg + 6, y + 7);
    doc.setTextColor(15, 23, 42); doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text(p.tenantName, mg + 6, y + 16);
    if (p.tenantPhone) { doc.setTextColor(100, 116, 139); doc.setFontSize(7.5); doc.setFont("helvetica", "normal"); doc.text(p.tenantPhone, mg + 6, y + 22); }

    card(mg + halfW + 4, y, halfW, 24);
    doc.setFillColor(29, 78, 216); doc.roundedRect(mg + halfW + 4, y, 3, 24, 1, 1, "F");
    doc.setTextColor(148, 163, 184); doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.text("PROPERTY", mg + halfW + 10, y + 7);
    doc.setTextColor(15, 23, 42); doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.text(p.propertyName, mg + halfW + 10, y + 16);
    y += 24 + 7;

    // Section 02 – Payment Details
    sectionBar("02  PAYMENT DETAILS");
    fieldRow("Reference / Invoice No.", p.reference);
    fieldRow("Payment Method / Type", p.method);
    fieldRow("Date Received", fmtDate(p.date));
    if (p.vendor) fieldRow("Received By", p.vendor);
    fieldRow("Status", s, true);
    y += 6;

    // Section 03 – Amount Paid
    sectionBar("03  AMOUNT PAID");
    const amtH = 32;
    card(mg, y, (cW - 4) * 0.6, amtH, [236, 253, 245]);
    doc.setFillColor(16, 185, 129); doc.roundedRect(mg, y, 3, amtH, 1, 1, "F");
    doc.setTextColor(148, 163, 184); doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.text("TOTAL AMOUNT PAID", mg + 6, y + 8);
    doc.setTextColor(16, 185, 129); doc.setFontSize(15); doc.setFont("helvetica", "bold");
    doc.text(`UGX ${p.amount.toLocaleString()}`, mg + 6, y + 22);

    const statusW = (cW - 4) * 0.4;
    card(mg + (cW - 4) * 0.6 + 4, y, statusW, amtH);
    doc.setTextColor(148, 163, 184); doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.text("PAYMENT STATUS", mg + (cW - 4) * 0.6 + 8, y + 8);
    const sc: [number, number, number] = s === "Paid" ? [16, 185, 129] : s === "Failed" ? [239, 68, 68] : [245, 158, 11];
    doc.setTextColor(...sc); doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text(s, mg + (cW - 4) * 0.6 + 8, y + 22);
    y += amtH + 7;

    // Section 04 – Notes (optional)
    if (p.notes) {
      sectionBar("04  NOTES");
      const noteLines = doc.splitTextToSize(p.notes, cW - 10);
      const noteH = noteLines.length * 5.5 + 12;
      doc.setFillColor(255, 251, 235); doc.roundedRect(mg, y, cW, noteH, 2, 2, "F");
      doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.2); doc.roundedRect(mg, y, cW, noteH, 2, 2, "S");
      doc.setFillColor(234, 179, 8); doc.roundedRect(mg, y, 3, noteH, 1, 1, "F");
      doc.setTextColor(120, 80, 0); doc.setFontSize(8.5); doc.setFont("helvetica", "normal");
      let ny = y + 8;
      noteLines.forEach((line: string) => { doc.text(line, mg + 7, ny); ny += 5.5; });
    }

    // Footer
    doc.setFillColor(10, 18, 40); doc.rect(0, pageH - 11, pageW, 11, "F");
    doc.setFillColor(16, 185, 129); doc.rect(0, pageH - 11, 3, 11, "F");
    doc.setTextColor(148, 163, 184); doc.setFontSize(7); doc.setFont("helvetica", "normal");
    const co = branding.companyName || "Property Management System";
    doc.text(`${p.reference}  ·  ${co}  ·  Generated ${new Date().toLocaleDateString("en-GB")}`, mg, pageH - 4);
    doc.text("Page 1 / 1", pageW - mg, pageH - 4, { align: "right" });

    doc.save(`receipt_${p.reference}.pdf`);
    toast({ title: "Receipt Downloaded", description: `Receipt for ${p.reference} saved as PDF.` });
  };

  const handleExport = () => {
    const headers = ["Reference", "Source", "Tenant", "Property", "Amount (UGX)", "Date", "Type", "Status", "Notes"];
    const csvRows = [
      headers.join(","),
      ...payments.map((p) => [
        `"${p.reference}"`,
        p.source,
        `"${p.tenantName}"`,
        `"${p.propertyName}"`,
        p.amount,
        new Date(p.date).toLocaleDateString(),
        p.method,
        p.status,
        p.notes ? `"${p.notes}"` : "",
      ].join(",")),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "payments_export.csv";
    document.body.appendChild(link); link.click();
    document.body.removeChild(link);
    toast({ title: "Export Successful", description: "Payments exported to CSV." });
  };

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      p.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.propertyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.vendor ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab =
      tab === "all" ||
      (tab === "paid"    && p.status === "Paid") ||
      (tab === "pending" && p.status === "Pending") ||
      (tab === "failed"  && p.status === "Failed") ||
      (tab === "invoice" && p.source === "invoice") ||
      (tab === "payment" && p.source === "payment");
    return matchesSearch && matchesTab;
  });

  const sortedPayments = [...filteredPayments].sort((a, b) => {
    if (sortField === "date")
      return sortDirection === "asc"
        ? new Date(a.date).getTime() - new Date(b.date).getTime()
        : new Date(b.date).getTime() - new Date(a.date).getTime();
    if (sortField === "amount")
      return sortDirection === "asc" ? a.amount - b.amount : b.amount - a.amount;
    if (sortField === "tenant")
      return sortDirection === "asc"
        ? a.tenantName.localeCompare(b.tenantName)
        : b.tenantName.localeCompare(a.tenantName);
    return 0;
  });

  const handleSort = (field: string) => {
    if (sortField === field) setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDirection("asc"); }
  };

  const SortIcon = ({ field }: { field: string }) =>
    sortField === field
      ? sortDirection === "asc"
        ? <ArrowUp className="ml-1 h-3 w-3 inline" />
        : <ArrowDown className="ml-1 h-3 w-3 inline" />
      : null;

  const totalReceived = payments.filter((p) => p.status === "Paid").reduce((s, p) => s + p.amount, 0);
  const totalPending  = payments.filter((p) => p.status === "Pending").reduce((s, p) => s + p.amount, 0);
  const totalFailed   = payments.filter((p) => p.status === "Failed").reduce((s, p) => s + p.amount, 0);
  const totalCash     = payments.filter((p) => p.method === "CASH" && p.status === "Paid").reduce((s, p) => s + p.amount, 0);

  const kpiCards = [
    {
      label: "Total Received",
      value: `UGX ${totalReceived.toLocaleString()}`,
      sub: `${payments.filter((p) => p.status === "Paid").length} completed`,
      Icon: TrendingUp,
      border: "border-l-emerald-500",
      bg: "bg-emerald-50",
      color: "text-emerald-600",
    },
    {
      label: "Pending",
      value: `UGX ${totalPending.toLocaleString()}`,
      sub: `${payments.filter((p) => p.status === "Pending").length} awaiting`,
      Icon: Clock,
      border: "border-l-amber-500",
      bg: "bg-amber-50",
      color: "text-amber-600",
    },
    {
      label: "Failed",
      value: `UGX ${totalFailed.toLocaleString()}`,
      sub: `${payments.filter((p) => p.status === "Failed").length} transactions`,
      Icon: AlertCircle,
      border: "border-l-red-500",
      bg: "bg-red-50",
      color: "text-red-600",
    },
    {
      label: "Cash Collected",
      value: `UGX ${totalCash.toLocaleString()}`,
      sub: `${payments.filter((p) => p.method === "CASH").length} cash payments`,
      Icon: Banknote,
      border: "border-l-slate-400",
      bg: "bg-slate-100",
      color: "text-slate-600",
    },
  ];

  const columns: Column<UnifiedPayment>[] = [
    {
      key: "reference",
      header: "Reference",
      headerClassName: "w-[160px]",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            {row.source === "invoice"
              ? <FileText className="h-4 w-4 text-blue-600" />
              : <Banknote className="h-4 w-4 text-slate-500" />}
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-xs font-semibold text-[#0F172A]">{row.reference}</span>
            <SourceBadge source={row.source} />
          </div>
        </div>
      ),
    },
    {
      key: "tenantName",
      header: "Tenant",
      cell: (row) => (
        <button
          className="flex items-center gap-2 text-left"
          onClick={() => handleSort("tenant")}
        >
          <div className="h-7 w-7 rounded-full bg-[#1D4ED8]/10 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-[#1D4ED8]">{row.tenantName.charAt(0)}</span>
          </div>
          <span className="text-sm text-[#0F172A] hover:text-[#1D4ED8] transition-colors">
            {row.tenantName}
            <SortIcon field="tenant" />
          </span>
        </button>
      ),
    },
    {
      key: "propertyName",
      header: "Property",
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-sm text-[#0F172A]">
          <Home className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
          {row.propertyName}
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      headerClassName: "text-right",
      className: "text-right",
      cell: (row) => (
        <button
          className="text-sm font-semibold text-[#0F172A] hover:text-[#1D4ED8] transition-colors"
          onClick={() => handleSort("amount")}
        >
          UGX {row.amount.toLocaleString()}
          <SortIcon field="amount" />
        </button>
      ),
    },
    {
      key: "date",
      header: "Date",
      cell: (row) => (
        <button
          className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-[#1D4ED8] transition-colors"
          onClick={() => handleSort("date")}
        >
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          {new Date(row.date).toLocaleDateString()}
          <SortIcon field="date" />
        </button>
      ),
    },
    {
      key: "method",
      header: "Type",
      cell: (row) => <MethodBadge method={row.method} />,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "text-right",
      className: "text-right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-[#1D4ED8] transition-colors"
            title="View details"
            onClick={() => setViewPayment(row)}
          >
            <Eye className="h-4 w-4" />
          </button>
          {row.status === "Paid" && (
            <button
              className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 transition-colors disabled:opacity-50"
              title="Send SMS acknowledgment"
              disabled={sendingAckId === row.uid}
              onClick={() => handleSendAcknowledgment(row)}
            >
              {sendingAckId === row.uid
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <MessageSquare className="h-4 w-4" />}
            </button>
          )}
          <button
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-[#1D4ED8] transition-colors"
            title="Download receipt"
            onClick={() => generateReceipt(row)}
          >
            <DownloadIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">

      {/* ── Hero Banner ── */}
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
                <CircleDollarSign className="h-4 w-4 text-white" />
              </div>
              <span className="text-blue-200 text-sm font-medium">Payment Monitoring</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Payment Tracking</h1>
            <p className="text-blue-200 text-sm mt-1">View and manage all payment transactions</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {pendingByTenant.length > 0 && (
              <button
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 text-sm font-medium border border-amber-400/40 transition-colors"
                onClick={() => {
                  setSelectedTenantIds(new Set(pendingByTenant.map((p) => p.tenantId)));
                  setShowReminderDialog(true);
                }}
              >
                <Bell className="h-4 w-4" />
                Send Reminders
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400/30 text-[11px] font-bold">
                  {pendingByTenant.length}
                </span>
              </button>
            )}
            <button
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium border border-white/20 transition-colors"
              onClick={handleExport}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpiCards.map((card, i) => (
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
            <div className="min-w-0">
              <p className="text-xs text-slate-500">{card.label}</p>
              <p className={`text-base font-bold mt-0.5 truncate ${card.color}`}>{card.value}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{card.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Auto-acknowledge toggle ── */}
      <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/60 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
            <BellRing className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0F172A]">Automatic Payment Acknowledgment SMS</p>
            <p className="text-xs text-slate-500">Send an SMS to tenants automatically when their payment is confirmed</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 ml-4 shrink-0">
          <Label htmlFor="auto-ack" className="text-sm font-medium text-slate-600">
            {autoAcknowledge ? "On" : "Off"}
          </Label>
          <Switch id="auto-ack" checked={autoAcknowledge} onCheckedChange={handleAutoAcknowledgeToggle} />
        </div>
      </div>

      {/* ── Table section ── */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
        <div className="flex items-center gap-1 p-4 border-b border-[#E2E8F0] flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t.key
                  ? "bg-[#1D4ED8] text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="p-4">
          <DataTable
            data={sortedPayments}
            columns={columns}
            loading={isLoading}
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search tenant, property, reference…"
            label="payment"
            pageSize={10}
            emptyMessage="No payments found"
            emptyIcon={<CircleDollarSign className="h-10 w-10" />}
            minWidth="900px"
          />
        </div>
      </div>

      {/* ── View Payment Detail Modal ── */}
      {viewPayment && (() => {
        const isPaid    = viewPayment.status === "Paid";
        const isPending = viewPayment.status === "Pending";
        const isFailed  = viewPayment.status === "Failed";
        const statusGradient = isPaid
          ? "from-emerald-700 to-emerald-500"
          : isPending
          ? "from-amber-600 to-amber-400"
          : isFailed
          ? "from-red-700 to-red-500"
          : "from-[#0F172A] to-[#1D4ED8]";
        const amountColor = isPaid ? "text-emerald-100" : isPending ? "text-amber-100" : isFailed ? "text-red-100" : "text-white";

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setViewPayment(null)} />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              {/* ── Status-colored hero header ── */}
              <div className={`bg-gradient-to-br ${statusGradient} px-6 pt-5 pb-6`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-white/60 mb-0.5">Payment Details</p>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-white/90">{viewPayment.reference}</span>
                      <SourceBadge source={viewPayment.source} />
                    </div>
                  </div>
                  <button onClick={() => setViewPayment(null)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Big amount */}
                <div className="mt-1">
                  <p className="text-[11px] font-medium uppercase tracking-widest text-white/50 mb-1">Amount</p>
                  <p className={`text-3xl font-bold tracking-tight ${amountColor}`}>
                    UGX {viewPayment.amount.toLocaleString()}
                  </p>
                </div>

                {/* Status pill at bottom of header */}
                <div className="mt-4">
                  <StatusBadge status={viewPayment.status} />
                </div>
              </div>

              {/* ── Tenant card ── */}
              <div className="mx-5 -mt-4 mb-4 rounded-xl border border-[#E2E8F0] bg-white shadow-sm p-4 flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1D4ED8]/10 text-lg font-bold text-[#1D4ED8]">
                  {viewPayment.tenantName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#0F172A] truncate">{viewPayment.tenantName}</p>
                  <p className="text-xs text-slate-400 truncate">{viewPayment.tenantPhone || "No phone"}</p>
                </div>
                <div className="ml-auto shrink-0 flex items-center gap-1.5 text-xs text-slate-500">
                  <Home className="h-3.5 w-3.5 text-slate-400" />
                  <span className="truncate max-w-[110px]">{viewPayment.propertyName || "—"}</span>
                </div>
              </div>

              {/* ── Payment info grid ── */}
              <div className="px-5 pb-2">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Calendar, label: "Date", value: new Date(viewPayment.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) },
                    { icon: Banknote, label: "Type", value: <MethodBadge method={viewPayment.method} /> },
                    { icon: Hash,     label: "Reference", value: <span className="font-mono text-xs">{viewPayment.reference}</span> },
                    ...(viewPayment.vendor ? [{ icon: User, label: "Received By", value: viewPayment.vendor }] : []),
                  ].map(({ icon: Icon, label, value }, i) => (
                    <div key={i} className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Icon className="h-3 w-3 text-slate-400" />
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
                      </div>
                      <div className="text-sm font-medium text-[#0F172A]">{value}</div>
                    </div>
                  ))}
                </div>

                {/* Notes */}
                {viewPayment.notes && (
                  <div className="mt-3 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-500 mb-1">Notes</p>
                    <p className="text-sm text-amber-900 leading-relaxed">{viewPayment.notes}</p>
                  </div>
                )}
              </div>

              {/* ── Footer actions ── */}
              <div className="flex items-center gap-2 px-5 py-4 border-t border-[#E2E8F0] mt-3">
                <button
                  onClick={() => setViewPayment(null)}
                  className="flex-1 rounded-xl border border-[#E2E8F0] py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
                {isPaid && (
                  <button
                    onClick={() => { handleSendAcknowledgment(viewPayment); setViewPayment(null); }}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                  >
                    <MessageSquare className="h-4 w-4" /> SMS
                  </button>
                )}
                <button
                  onClick={() => { generateReceipt(viewPayment); setViewPayment(null); }}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#1D4ED8] py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  <Download className="h-4 w-4" /> Receipt
                </button>
              </div>
            </motion.div>
          </div>
        );
      })()}

      {/* ── Bulk SMS Reminder Dialog ── */}
      <Dialog open={showReminderDialog} onOpenChange={setShowReminderDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col p-0 overflow-hidden rounded-2xl">
          <div className="bg-gradient-to-r from-[#0F172A] to-amber-600 px-6 py-5 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <Bell className="h-5 w-5" />
                Send Overdue Payment Reminders
              </DialogTitle>
              <DialogDescription className="text-amber-100 mt-1">
                Select tenants to notify via SMS about their pending payments.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-6 pt-4 pb-2 flex items-center justify-between">
            <span className="text-sm text-slate-500">
              {pendingByTenant.length} tenant{pendingByTenant.length !== 1 ? "s" : ""} with pending payments
            </span>
            <button
              className="rounded-lg px-2.5 py-1 text-xs font-semibold text-[#1D4ED8] hover:bg-blue-50 transition-colors"
              onClick={handleSelectAll}
            >
              {selectedTenantIds.size === pendingByTenant.length ? "Deselect All" : "Select All"}
            </button>
          </div>

          <Separator />

          <div className="overflow-y-auto flex-1 space-y-0.5 px-4 py-2">
            {pendingByTenant.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">No pending payments found.</p>
            ) : (
              pendingByTenant.map((p) => (
                <label key={p.tenantId} className="flex cursor-pointer items-start gap-3 rounded-xl px-3 py-3 hover:bg-slate-50 transition-colors">
                  <Checkbox
                    checked={selectedTenantIds.has(p.tenantId)}
                    onCheckedChange={() => handleToggleTenant(p.tenantId)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm text-[#0F172A] truncate">{p.tenantName}</span>
                      <span className="text-sm font-bold text-amber-700 shrink-0">UGX {p.amount.toLocaleString()}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 space-y-0.5">
                      <div>{p.propertyName}</div>
                      <div>{p.tenantPhone}</div>
                    </div>
                  </div>
                </label>
              ))
            )}
          </div>

          <Separator />

          <DialogFooter className="gap-2 px-6 py-4">
            <button
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
              onClick={() => setShowReminderDialog(false)}
              disabled={isSendingReminders}
            >
              Cancel
            </button>
            <button
              className="btn-grid inline-flex items-center gap-2 rounded-xl bg-[#1D4ED8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e40af] transition-colors disabled:opacity-50"
              onClick={handleSendBulkReminders}
              disabled={selectedTenantIds.size === 0 || isSendingReminders}
            >
              {isSendingReminders
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
                : <><Send className="h-4 w-4" /> Send to {selectedTenantIds.size} Selected</>}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default TrackPayments;
