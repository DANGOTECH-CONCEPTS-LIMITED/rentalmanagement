import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import jsPDF from "jspdf";
import {
  Plus,
  Eye,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  User,
  Home,
  Calendar,
  CreditCard,
  X,
  Receipt,
  Download,
} from "lucide-react";
import { useBranding } from "@/context/BrandingContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { DataTable, Column } from "@/components/ui/data-table";
import axios from "axios";

type InvoiceStatus = "Paid" | "Pending" | "Overdue";
type InvoiceType = "Invoice" | "Manual Invoice" | "Manual Payment";

interface Invoice {
  id: number;
  invoiceNumber: string;
  type: string;
  status: string;
  tenantId: number;
  propertyId: number;
  propertyUnitId?: number;
  amount: number;
  invoiceDate: string;
  dueDate: string;
  notes?: string;
  createdByUserId: number;
  createdAt: string;
}

interface Tenant {
  id: number;
  fullName: string;
  propertyId: number;
  propertyUnitId?: number;
}

interface Property {
  id: number;
  name: string;
}

interface PropertyUnit {
  id: number;
  unitNumber: string;
  propertyId: number;
}

const getLoggedInUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};

const selCls =
  "w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 transition-colors";

const StatusBadge = ({ status }: { status: string }) => {
  if (status === "Paid")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle className="h-3 w-3" />
        Paid
      </span>
    );
  if (status === "Overdue")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
        <AlertCircle className="h-3 w-3" />
        Overdue
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
      <Clock className="h-3 w-3" />
      Pending
    </span>
  );
};

const TypeBadge = ({ type }: { type: string }) => {
  if (type === "Manual Payment")
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
        Manual Payment
      </span>
    );
  if (type === "Manual Invoice")
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
        Manual Invoice
      </span>
    );
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200">
      Invoice
    </span>
  );
};

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
      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
        {label}
      </p>
      <div className="text-sm font-medium text-[#0F172A] mt-0.5">{value}</div>
    </div>
  </div>
);

const TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "paid", label: "Paid" },
  { key: "overdue", label: "Overdue" },
  { key: "manual-invoice", label: "Manual Invoice" },
  { key: "payments", label: "Payments" },
];

const InvoiceManagement = () => {
  const { toast } = useToast();
  const { branding } = useBranding();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const userData = getLoggedInUser();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<PropertyUnit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [updateStatusInvoice, setUpdateStatusInvoice] =
    useState<Invoice | null>(null);
  const [newStatus, setNewStatus] = useState<InvoiceStatus>("Pending");
  const [form, setForm] = useState({
    type: "Invoice" as InvoiceType,
    status: "Pending" as InvoiceStatus,
    tenantId: "",
    propertyId: "",
    propertyUnitId: "",
    amount: "",
    invoiceDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    notes: "",
    paymentMethod: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingInvoices, setPendingInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(
    null,
  );
  const [isLoadingPendingInvoices, setIsLoadingPendingInvoices] =
    useState(false);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get<Invoice[]>(
        `${apiUrl}/GetInvoicesByLandLordId/${userData.id}`,
      );
      setInvoices(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data || "Failed to load invoices.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();

    const fetchTenants = async () => {
      try {
        const { data } = await axios.get<Tenant[]>(`${apiUrl}/GetAllTenants`);
        setTenants(
          data.filter((t: any) => t?.property?.ownerId === userData.id),
        );
      } catch {
        // silent
      }
    };

    const fetchProperties = async () => {
      try {
        const { data } = await axios.get<Property[]>(
          `${apiUrl}/GetPropertiesByLandLordId/${userData.id}`,
        );
        setProperties(data);
      } catch {
        // silent
      }
    };

    const fetchUnits = async () => {
      try {
        const { data } = await axios.get<PropertyUnit[]>(
          `${apiUrl}/GetPropertyUnitsByLandLordId/${userData.id}`,
        );
        setUnits(data);
      } catch {
        // silent
      }
    };

    fetchTenants();
    fetchProperties();
    fetchUnits();
  }, []);

  useEffect(() => {
    if (!addOpen || !form.tenantId || form.type !== "Manual Payment") {
      setPendingInvoices([]);
      setSelectedInvoiceId(null);
      return;
    }
    setIsLoadingPendingInvoices(true);
    axios
      .get<Invoice[]>(`${apiUrl}/GetInvoicesByTenantId/${form.tenantId}`)
      .then(({ data }) =>
        setPendingInvoices(
          data.filter(
            (inv) =>
              (inv.status === "Pending" || inv.status === "Overdue") &&
              !inv.type?.toLowerCase().includes("payment"),
          ),
        ),
      )
      .catch(() => {})
      .finally(() => setIsLoadingPendingInvoices(false));
  }, [form.tenantId, form.type, addOpen]);

  const tenantName = (id: number) =>
    tenants.find((t) => t.id === id)?.fullName ?? `Tenant #${id}`;
  const propertyName = (id: number) =>
    properties.find((p) => p.id === id)?.name ?? `Property #${id}`;
  const unitName = (id?: number) =>
    id ? (units.find((u) => u.id === id)?.unitNumber ?? `Unit #${id}`) : "—";

  const unitsForProperty = (propertyId: string) =>
    units.filter((u) => u.propertyId === Number(propertyId));

  const isPaymentType = (type?: string) =>
    type?.toLowerCase().includes("payment") ?? false;

  const filtered = invoices.filter((inv) => {
    const matchSearch =
      tenantName(inv.tenantId).toLowerCase().includes(search.toLowerCase()) ||
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      propertyName(inv.propertyId).toLowerCase().includes(search.toLowerCase());
    const matchTab =
      // "All" shows only charge invoices — payment records live in "Payments" tab
      (tab === "all" && !isPaymentType(inv.type)) ||
      // Status tabs also exclude payment-type records
      (["pending", "paid", "overdue"].includes(tab) &&
        inv.status.toLowerCase() === tab &&
        !isPaymentType(inv.type)) ||
      // Manual Invoice tab: manual charges only
      (tab === "manual-invoice" && inv.type === "Manual Invoice") ||
      // Payments tab: payment records only
      (tab === "payments" && isPaymentType(inv.type));
    return matchSearch && matchTab;
  });

  const openAdd = (type: InvoiceType = "Invoice") => {
    setForm({
      type,
      status: "Pending",
      tenantId: "",
      propertyId: "",
      propertyUnitId: "",
      amount: "",
      invoiceDate: new Date().toISOString().split("T")[0],
      dueDate: "",
      notes: "",
      paymentMethod: type === "Manual Payment" ? "Cash" : "",
    });
    setPendingInvoices([]);
    setSelectedInvoiceId(null);
    setAddOpen(true);
  };

  const handleCreate = async () => {
    if (!form.tenantId || !form.propertyId || !form.amount || !form.dueDate) {
      toast({
        title: "Validation Error",
        description: "Tenant, property, amount and due date are required.",
        variant: "destructive",
      });
      return;
    }
    // For Manual Payment: require a linked invoice to be selected
    if (
      form.type === "Manual Payment" &&
      pendingInvoices.length > 0 &&
      !selectedInvoiceId
    ) {
      toast({
        title: "Select an Invoice",
        description: "Please select the pending invoice this payment is for.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const paymentAmount = Number(form.amount.replace(/,/g, ""));
      const body = {
        Type: form.type,
        // Payment records are settled immediately; charge invoices use the form's chosen status
        Status: form.type === "Manual Payment" ? "Paid" : form.status,
        TenantId: Number(form.tenantId),
        PropertyId: Number(form.propertyId),
        PropertyUnitId: form.propertyUnitId
          ? Number(form.propertyUnitId)
          : null,
        Amount: paymentAmount,
        InvoiceDate: new Date(form.invoiceDate).toISOString(),
        DueDate: new Date(form.dueDate).toISOString(),
        Notes: form.notes || null,
        PaymentMethod: form.paymentMethod || null,
        CreatedByUserId: userData.id,
        CreatedByName: userData.fullName || "",
      };
      await axios.post(`${apiUrl}/CreateTenantInvoice`, body);

      if (selectedInvoiceId) {
        const linked = pendingInvoices.find((i) => i.id === selectedInvoiceId);
        const invoiceAmount = linked?.amount ?? 0;

        // Subtract the payment from the invoice amount.
        // If fully paid the backend marks it Paid; if partial it stays Pending with reduced amount.
        await axios.put(
          `${apiUrl}/ApplyPaymentToInvoice/${selectedInvoiceId}`,
          { paymentAmount },
        );

        const remaining = Math.max(0, invoiceAmount - paymentAmount);
        if (remaining > 0) {
          toast({
            title: "Partial Payment Recorded",
            description: `${formatUGX(paymentAmount)} applied. Remaining balance on invoice: ${formatUGX(remaining)}.`,
          });
        } else {
          toast({
            title: "Fully Settled",
            description: "Invoice has been fully paid and marked Paid.",
          });
        }
      } else {
        toast({
          title: "Invoice Created",
          description: "Invoice created successfully.",
        });
      }

      setAddOpen(false);
      fetchInvoices();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data || "Failed to create invoice.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!updateStatusInvoice) return;
    setIsSubmitting(true);
    try {
      await axios.put(
        `${apiUrl}/UpdateInvoiceStatus/${updateStatusInvoice.id}`,
        { Status: newStatus },
      );
      toast({
        title: "Status Updated",
        description: `Invoice marked as ${newStatus}.`,
      });
      setUpdateStatusInvoice(null);
      fetchInvoices();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data || "Failed to update status.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatUGX = (n: number) => `UGX ${n.toLocaleString()}`;

  const handleDownloadPDF = (inv: Invoice) => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const mg = 16;
    const cW = pageW - mg * 2;
    let y = 0;

    const fmtDate = (d: string) =>
      d
        ? new Date(d).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "—";

    const tName = tenantName(inv.tenantId);
    const pName = propertyName(inv.propertyId);
    const uName = inv.propertyUnitId ? unitName(inv.propertyUnitId) : "";

    const drawFooter = (pageNum: number, totalPages: number) => {
      doc.setFillColor(10, 18, 40);
      doc.rect(0, pageH - 11, pageW, 11, "F");
      doc.setFillColor(29, 78, 216);
      doc.rect(0, pageH - 11, 3, 11, "F");
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      const co = branding.companyName || "Property Management System";
      doc.text(
        `${inv.invoiceNumber}  ·  ${co}  ·  Generated ${new Date().toLocaleDateString("en-GB")}`,
        mg,
        pageH - 4,
      );
      doc.text(`Page ${pageNum} / ${totalPages}`, pageW - mg, pageH - 4, {
        align: "right",
      });
    };

    const checkNewPage = (need = 20) => {
      if (y + need > pageH - 18) {
        doc.addPage();
        y = 20;
      }
    };

    // Header
    doc.setFillColor(10, 18, 40);
    doc.rect(0, 0, pageW, 54, "F");
    doc.setFillColor(29, 78, 216);
    doc.rect(0, 50, pageW, 4, "F");
    doc.setFillColor(234, 179, 8);
    doc.rect(0, 0, 4, 54, "F");

    const logoX = mg + 2,
      logoY = 9;
    if (branding.logoDataUrl) {
      try {
        doc.addImage(branding.logoDataUrl, "PNG", logoX, logoY, 26, 26);
      } catch {
        /* skip */
      }
    } else if (branding.companyName) {
      doc.setFillColor(29, 78, 216);
      doc.roundedRect(logoX, logoY, 26, 26, 4, 4, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      const ini = branding.companyName
        .split(" ")
        .map((w: string) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
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
    doc.text("INVOICE", pageW - mg, branding.companyName ? 20 : 22, {
      align: "right",
    });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text(`Invoice:  ${inv.invoiceNumber}`, pageW - mg, 28, {
      align: "right",
    });
    doc.text(`Issued:   ${fmtDate(inv.invoiceDate)}`, pageW - mg, 34, {
      align: "right",
    });
    doc.text(`Due:      ${fmtDate(inv.dueDate)}`, pageW - mg, 40, {
      align: "right",
    });

    const s = inv.status;
    if (s === "Paid") doc.setFillColor(16, 185, 129);
    else if (s === "Overdue") doc.setFillColor(239, 68, 68);
    else doc.setFillColor(245, 158, 11);
    doc.roundedRect(pageW - mg - 28, 43, 28, 8, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text(s.toUpperCase(), pageW - mg - 14, 48.5, { align: "center" });

    y = 62;

    const sectionBar = (title: string) => {
      checkNewPage(16);
      doc.setFillColor(15, 23, 42);
      doc.roundedRect(mg, y, cW, 8.5, 1.5, 1.5, "F");
      doc.setFillColor(234, 179, 8);
      doc.roundedRect(mg, y, 3, 8.5, 1, 1, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.text(title, mg + 7, y + 6);
      y += 13;
    };

    const card = (
      x: number,
      cy: number,
      w: number,
      h: number,
      fill: [number, number, number] = [248, 250, 252],
    ) => {
      doc.setFillColor(...fill);
      doc.roundedRect(x, cy, w, h, 2, 2, "F");
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.roundedRect(x, cy, w, h, 2, 2, "S");
    };

    const fieldRow = (label: string, value: string, last = false) => {
      checkNewPage(9);
      doc.setFillColor(248, 250, 252);
      doc.rect(mg, y, cW, 8.5, "F");
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(label, mg + 4, y + 5.8);
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.text(value || "—", mg + 52, y + 5.8);
      if (!last) {
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.15);
        doc.line(mg, y + 8.5, mg + cW, y + 8.5);
      }
      y += 8.5;
    };

    // 01 Bill To
    sectionBar("01  BILL TO");
    const halfW = (cW - 4) / 2;
    const partyH = uName ? 32 : 24;
    card(mg, y, halfW, partyH, [238, 242, 255]);
    doc.setFillColor(29, 78, 216);
    doc.roundedRect(mg, y, 3, partyH, 1, 1, "F");
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("TENANT", mg + 6, y + 7);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(tName, mg + 6, y + 16);

    card(mg + halfW + 4, y, halfW, partyH);
    doc.setFillColor(234, 179, 8);
    doc.roundedRect(mg + halfW + 4, y, 3, partyH, 1, 1, "F");
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("PROPERTY / UNIT", mg + halfW + 10, y + 7);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(pName, mg + halfW + 10, y + 16);
    if (uName) {
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.text(`Unit: ${uName}`, mg + halfW + 10, y + 24);
    }
    y += partyH + 7;

    // 02 Invoice Details
    checkNewPage(50);
    sectionBar("02  INVOICE DETAILS");
    fieldRow("Invoice Number", inv.invoiceNumber);
    fieldRow("Type", inv.type);
    fieldRow("Date Issued", fmtDate(inv.invoiceDate));
    fieldRow("Due Date", fmtDate(inv.dueDate), true);
    y += 6;

    // 03 Amount Due
    checkNewPage(44);
    sectionBar("03  AMOUNT DUE");
    const amtH = 32;
    card(mg, y, (cW - 4) * 0.6, amtH, [238, 242, 255]);
    doc.setFillColor(29, 78, 216);
    doc.roundedRect(mg, y, 3, amtH, 1, 1, "F");
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL AMOUNT", mg + 6, y + 8);
    doc.setTextColor(29, 78, 216);
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.text(formatUGX(inv.amount), mg + 6, y + 22);

    const statusW = (cW - 4) * 0.4;
    card(mg + (cW - 4) * 0.6 + 4, y, statusW, amtH);
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("PAYMENT STATUS", mg + (cW - 4) * 0.6 + 8, y + 8);
    const sc: [number, number, number] =
      s === "Paid"
        ? [16, 185, 129]
        : s === "Overdue"
          ? [239, 68, 68]
          : [245, 158, 11];
    doc.setTextColor(...sc);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(s, mg + (cW - 4) * 0.6 + 8, y + 22);
    y += amtH + 7;

    // 04 Notes
    if (inv.notes) {
      checkNewPage(30);
      sectionBar("04  NOTES");
      const noteLines = doc.splitTextToSize(inv.notes, cW - 10);
      const noteH = noteLines.length * 5.5 + 12;
      card(mg, y, cW, noteH, [255, 251, 235]);
      doc.setFillColor(234, 179, 8);
      doc.roundedRect(mg, y, 3, noteH, 1, 1, "F");
      doc.setTextColor(120, 80, 0);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      let ny = y + 8;
      noteLines.forEach((line: string) => {
        checkNewPage(8);
        doc.text(line, mg + 7, ny);
        ny += 5.5;
      });
      y = ny + 6;
    }

    const total = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      drawFooter(i, total);
    }
    doc.save(`${inv.invoiceNumber}.pdf`);
    toast({
      title: "Invoice Downloaded",
      description: `${inv.invoiceNumber} saved as PDF.`,
    });
  };
  // Charge invoices only — excludes payment records from KPI totals.
  const chargeInvoices = invoices.filter((i) => !isPaymentType(i.type));

  // Collected = sum of payment records (Manual Payment type).
  // These are created at the exact amount paid, so they're always accurate —
  // even for partial payments where the original invoice is marked Paid at full value.
  const totalPaid = invoices
    .filter((i) => isPaymentType(i.type))
    .reduce((s, i) => s + i.amount, 0);
  const totalPending = chargeInvoices
    .filter((i) => i.status === "Pending")
    .reduce((s, i) => s + i.amount, 0);
  const totalOverdue = chargeInvoices
    .filter((i) => i.status === "Overdue")
    .reduce((s, i) => s + i.amount, 0);

  const kpiCards = [
    {
      label: "Total Invoices",
      value: chargeInvoices.length,
      Icon: FileText,
      border: "border-l-blue-500",
      bg: "bg-blue-50",
      color: "text-blue-600",
    },
    {
      label: "Collected",
      value: formatUGX(totalPaid),
      Icon: CheckCircle,
      border: "border-l-emerald-500",
      bg: "bg-emerald-50",
      color: "text-emerald-600",
    },
    {
      label: "Pending",
      value: formatUGX(totalPending),
      Icon: Clock,
      border: "border-l-amber-500",
      bg: "bg-amber-50",
      color: "text-amber-600",
    },
    {
      label: "Overdue",
      value: formatUGX(totalOverdue),
      Icon: AlertCircle,
      border: "border-l-red-500",
      bg: "bg-red-50",
      color: "text-red-600",
    },
  ];

  const invoiceCols: Column<Invoice>[] = [
    {
      key: "no",
      header: "Invoice No.",
      cell: (i) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <FileText className="h-4 w-4 text-blue-600" />
          </div>
          <span className="font-mono text-sm font-semibold text-[#0F172A]">
            {i.invoiceNumber}
          </span>
        </div>
      ),
    },
    { key: "type", header: "Type", cell: (i) => <TypeBadge type={i.type} /> },
    {
      key: "tenant",
      header: "Tenant",
      cell: (i) => (
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-[#1D4ED8]/10 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-[#1D4ED8]">
              {tenantName(i.tenantId).charAt(0)}
            </span>
          </div>
          <span className="text-sm text-[#0F172A]">
            {tenantName(i.tenantId)}
          </span>
        </div>
      ),
    },
    {
      key: "property",
      header: "Property / Unit",
      cell: (i) => (
        <div className="flex items-center gap-1.5 text-sm text-[#0F172A]">
          <Home className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
          <span>
            {propertyName(i.propertyId)}
            {i.propertyUnitId ? ` — ${unitName(i.propertyUnitId)}` : ""}
          </span>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      headerClassName: "text-right",
      className: "text-right",
      cell: (i) => (
        <span className="font-semibold text-[#0F172A]">
          {formatUGX(i.amount)}
        </span>
      ),
    },
    {
      key: "due",
      header: "Due Date",
      cell: (i) => (
        <div className="flex items-center gap-1.5 text-sm text-slate-600">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          {new Date(i.dueDate).toLocaleDateString()}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (i) => <StatusBadge status={i.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "text-right",
      className: "text-right",
      cell: (i) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setViewInvoice(i)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-[#1D4ED8] transition-colors"
            title="View"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDownloadPDF(i)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-[#1D4ED8] transition-colors"
            title="Download PDF"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setUpdateStatusInvoice(i);
              setNewStatus(i.status as InvoiceStatus);
            }}
            className="px-2.5 py-1 rounded-lg text-xs font-medium border border-[#E2E8F0] hover:border-[#1D4ED8] text-slate-600 hover:text-[#1D4ED8] transition-colors"
          >
            Update Status
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div
        className="relative rounded-2xl overflow-hidden p-6 md:p-8"
        style={{
          background:
            "linear-gradient(135deg, #0a0f1e 0%, #0f2044 45%, #1a3a6e 100%)",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-4 right-32 h-24 w-24 rounded-full bg-blue-300/10 blur-xl" />
        </div>
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
                <FileText className="h-4 w-4 text-white" />
              </div>
              <span className="text-blue-200 text-sm font-medium">
                Invoice Management
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              Invoices
            </h1>
            <p className="text-blue-200 text-sm mt-1">
              Create, view and manage tenant invoices
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => openAdd("Manual Payment")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium border border-white/20 transition-colors"
            >
              <CreditCard className="h-4 w-4" />
              Create Payment
            </button>
            <button
              onClick={() => openAdd("Manual Invoice")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium border border-white/20 transition-colors"
            >
              <FileText className="h-4 w-4" />
              Manual Invoice
            </button>
            <button
              onClick={() => openAdd("Invoice")}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-white text-[#1D4ED8] text-sm font-semibold hover:bg-blue-50 transition-colors shadow-lg"
            >
              <Plus className="h-4 w-4" />
              New Invoice
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpiCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`bg-white rounded-xl border border-[#E2E8F0] border-l-4 ${card.border} p-4 flex items-center gap-3`}
          >
            <div
              className={`h-10 w-10 rounded-lg ${card.bg} flex items-center justify-center flex-shrink-0`}
            >
              <card.Icon className={`h-5 w-5 ${card.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500">{card.label}</p>
              <p
                className={`text-base font-bold mt-0.5 truncate ${card.color}`}
              >
                {card.value}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Table Section */}
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
            data={filtered}
            columns={invoiceCols}
            loading={isLoading}
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search invoice, tenant..."
            label="invoice"
            pageSize={10}
            emptyIcon={<FileText className="h-10 w-10" />}
            emptyMessage="No invoices found"
          />
        </div>
      </div>

      {/* Create Invoice Modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setAddOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
          >
            <div className="bg-gradient-to-r from-[#0F172A] to-[#1D4ED8] px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {form.type === "Manual Payment"
                    ? "Create Payment"
                    : `New ${form.type}`}
                </h2>
                <p className="text-blue-200 text-xs mt-0.5">
                  Fill in the details below
                </p>
              </div>
              <button
                onClick={() => setAddOpen(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                    Type
                  </label>
                  <select
                    className={selCls}
                    value={form.type}
                    onChange={(e) => {
                      const t = e.target.value as InvoiceType;
                      setForm({
                        ...form,
                        type: t,
                        paymentMethod: t === "Manual Payment" ? "Cash" : "",
                      });
                    }}
                  >
                    <option value="Invoice">Invoice</option>
                    <option value="Manual Invoice">Manual Invoice</option>
                    <option value="Manual Payment">Create Payment</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                    Status
                  </label>
                  <select
                    className={selCls}
                    value={form.status}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        status: e.target.value as InvoiceStatus,
                      })
                    }
                  >
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
              </div>
              {form.type === "Manual Payment" && (
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                    Mode of Payment *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { value: "Cash", label: "Cash", icon: "💵" },
                      {
                        value: "Mobile Money",
                        label: "Mobile Money",
                        icon: "📱",
                      },
                      { value: "Bank Transfer", label: "Bank", icon: "🏦" },
                      { value: "Cheque", label: "Cheque", icon: "📄" },
                    ].map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() =>
                          setForm({ ...form, paymentMethod: m.value })
                        }
                        className={`flex flex-col items-center gap-1 rounded-xl border-2 px-3 py-2.5 text-xs font-semibold transition-all ${
                          form.paymentMethod === m.value
                            ? "border-[#1D4ED8] bg-blue-50 text-[#1D4ED8]"
                            : "border-[#E2E8F0] bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        <span className="text-base">{m.icon}</span>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                    Tenant *
                  </label>
                  <select
                    className={selCls}
                    value={form.tenantId}
                    onChange={(e) => {
                      const t = tenants.find(
                        (t) => t.id === Number(e.target.value),
                      );
                      setSelectedInvoiceId(null);
                      setForm({
                        ...form,
                        tenantId: e.target.value,
                        propertyId: t ? String(t.propertyId) : "",
                        propertyUnitId: t?.propertyUnitId
                          ? String(t.propertyUnitId)
                          : "",
                      });
                    }}
                  >
                    <option value="">Select tenant</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={String(t.id)}>
                        {t.fullName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                    Property *
                  </label>
                  {form.tenantId ? (
                    <input
                      readOnly
                      value={propertyName(Number(form.propertyId))}
                      className="w-full rounded-lg border border-[#E2E8F0] bg-slate-50 px-3 py-2 text-sm text-[#0F172A] cursor-not-allowed"
                    />
                  ) : (
                    <select
                      className={selCls}
                      value={form.propertyId}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          propertyId: e.target.value,
                          propertyUnitId: "",
                        })
                      }
                    >
                      <option value="">Select property</option>
                      {properties.map((p) => (
                        <option key={p.id} value={String(p.id)}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              {form.propertyId && (
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                    Unit (optional)
                  </label>
                  {form.tenantId ? (
                    <input
                      readOnly
                      value={
                        form.propertyUnitId
                          ? unitName(Number(form.propertyUnitId))
                          : "No unit assigned"
                      }
                      className="w-full rounded-lg border border-[#E2E8F0] bg-slate-50 px-3 py-2 text-sm text-[#0F172A] cursor-not-allowed"
                    />
                  ) : (
                    <select
                      className={selCls}
                      value={form.propertyUnitId}
                      onChange={(e) =>
                        setForm({ ...form, propertyUnitId: e.target.value })
                      }
                    >
                      <option value="">Select unit</option>
                      {unitsForProperty(form.propertyId).map((u) => (
                        <option key={u.id} value={String(u.id)}>
                          {u.unitNumber}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Pending invoices — shown only for Manual Payment */}
              {form.type === "Manual Payment" && form.tenantId && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs uppercase tracking-wider text-slate-400 font-medium flex items-center gap-1.5">
                      <Receipt className="h-3.5 w-3.5" />
                      Which invoice is this payment for? *
                    </label>
                    {isLoadingPendingInvoices && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                    )}
                  </div>
                  {!isLoadingPendingInvoices &&
                    pendingInvoices.length === 0 && (
                      <p className="text-xs text-slate-400 italic py-2 text-center border border-dashed border-slate-200 rounded-lg">
                        No pending invoices for this tenant
                      </p>
                    )}
                  {pendingInvoices.length > 0 && (
                    <div className="space-y-2 max-h-44 overflow-y-auto pr-0.5">
                      {pendingInvoices.map((inv) => {
                        const isSelected = selectedInvoiceId === inv.id;
                        return (
                          <button
                            key={inv.id}
                            type="button"
                            onClick={() => {
                              const next = isSelected ? null : inv.id;
                              setSelectedInvoiceId(next);
                              setForm((f) => ({
                                ...f,
                                status: next ? "Paid" : "Pending",
                              }));
                            }}
                            className={`w-full text-left rounded-lg border px-3 py-2.5 transition-all ${
                              isSelected
                                ? "border-[#1D4ED8] bg-blue-50 ring-1 ring-[#1D4ED8]/30"
                                : "border-[#E2E8F0] hover:border-slate-300 bg-white"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div
                                  className={`h-5 w-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${isSelected ? "border-[#1D4ED8] bg-[#1D4ED8]" : "border-slate-300"}`}
                                >
                                  {isSelected && (
                                    <div className="h-2 w-2 rounded-full bg-white" />
                                  )}
                                </div>
                                <span className="font-mono text-xs font-semibold text-[#0F172A]">
                                  {inv.invoiceNumber}
                                </span>
                                {inv.status === "Overdue" ? (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 font-medium">
                                    Overdue
                                  </span>
                                ) : (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 font-medium">
                                    Pending
                                  </span>
                                )}
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-sm font-bold text-[#0F172A]">
                                  {formatUGX(inv.amount)}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  Due{" "}
                                  {new Date(inv.dueDate).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {selectedInvoiceId &&
                    (() => {
                      const linked = pendingInvoices.find(
                        (i) => i.id === selectedInvoiceId,
                      );
                      const paid = Number(form.amount.replace(/,/g, "")) || 0;
                      const owed = linked?.amount ?? 0;
                      const balance = owed - paid;
                      if (paid > 0 && balance > 0) {
                        return (
                          <p className="text-xs text-amber-600 flex items-center gap-1 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
                            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                            Partial payment — invoice balance will be reduced to{" "}
                            {formatUGX(balance)}.
                          </p>
                        );
                      }
                      return (
                        <p className="text-xs text-emerald-600 flex items-center gap-1">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Invoice will be fully settled on submit.
                        </p>
                      );
                    })()}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                    Amount (UGX) *
                  </label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g. 300,000"
                    value={form.amount}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/[^0-9]/g, "");
                      const formatted = digits
                        ? Number(digits).toLocaleString("en-US")
                        : "";
                      setForm({ ...form, amount: formatted });
                    }}
                    className="border-[#E2E8F0] focus:border-[#1D4ED8] focus-visible:ring-[#1D4ED8]/10"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                    {form.type === "Manual Payment"
                      ? "Payment Date"
                      : "Invoice Date"}
                  </label>
                  <Input
                    type="date"
                    value={form.invoiceDate}
                    onChange={(e) =>
                      setForm({ ...form, invoiceDate: e.target.value })
                    }
                    className="border-[#E2E8F0] focus:border-[#1D4ED8] focus-visible:ring-[#1D4ED8]/10"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                  Due Date *
                </label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) =>
                    setForm({ ...form, dueDate: e.target.value })
                  }
                  className="border-[#E2E8F0] focus:border-[#1D4ED8] focus-visible:ring-[#1D4ED8]/10"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                  Notes (optional)
                </label>
                <Textarea
                  placeholder="Additional notes..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="border-[#E2E8F0] focus:border-[#1D4ED8] focus-visible:ring-[#1D4ED8]/10 resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#E2E8F0] flex justify-end gap-3">
              <button
                onClick={() => setAddOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-[#E2E8F0] text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={isSubmitting}
                className="btn-grid inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#1D4ED8] text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {form.type === "Manual Payment"
                  ? "Create Payment"
                  : "Create Invoice"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Update Status Modal */}
      {updateStatusInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setUpdateStatusInvoice(null)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
          >
            <div className="bg-gradient-to-r from-[#0F172A] to-[#1D4ED8] px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Update Status</h2>
                <p className="text-blue-200 text-xs mt-0.5 font-mono">
                  {updateStatusInvoice.invoiceNumber}
                </p>
              </div>
              <button
                onClick={() => setUpdateStatusInvoice(null)}
                className="text-white/60 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between text-sm border-b border-[#E2E8F0] pb-3">
                <span className="text-slate-500">Amount</span>
                <span className="font-semibold text-[#0F172A]">
                  {formatUGX(updateStatusInvoice.amount)}
                </span>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                  New Status
                </label>
                <select
                  className={selCls}
                  value={newStatus}
                  onChange={(e) =>
                    setNewStatus(e.target.value as InvoiceStatus)
                  }
                >
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#E2E8F0] flex justify-end gap-3">
              <button
                onClick={() => setUpdateStatusInvoice(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-[#E2E8F0] text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStatus}
                disabled={isSubmitting}
                className="btn-grid inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#1D4ED8] text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Update
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* View Invoice Modal */}
      {viewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setViewInvoice(null)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
          >
            <div className="bg-gradient-to-r from-[#0F172A] to-[#1D4ED8] px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Invoice Details
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-blue-200 text-xs">
                    {viewInvoice.invoiceNumber}
                  </span>
                  <StatusBadge status={viewInvoice.status} />
                </div>
              </div>
              <button
                onClick={() => setViewInvoice(null)}
                className="text-white/60 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <DetailRow
                icon={FileText}
                label="Type"
                value={<TypeBadge type={viewInvoice.type} />}
              />
              <DetailRow
                icon={User}
                label="Tenant"
                value={tenantName(viewInvoice.tenantId)}
              />
              <DetailRow
                icon={Home}
                label="Property"
                value={`${propertyName(viewInvoice.propertyId)}${viewInvoice.propertyUnitId ? ` — ${unitName(viewInvoice.propertyUnitId)}` : ""}`}
              />
              <DetailRow
                icon={CreditCard}
                label="Amount"
                value={
                  <span className="text-[#1D4ED8] font-bold">
                    {formatUGX(viewInvoice.amount)}
                  </span>
                }
              />
              <DetailRow
                icon={Calendar}
                label="Invoice Date"
                value={new Date(viewInvoice.invoiceDate).toLocaleDateString()}
              />
              <DetailRow
                icon={Calendar}
                label="Due Date"
                value={new Date(viewInvoice.dueDate).toLocaleDateString()}
              />
              {viewInvoice.notes && (
                <div className="mt-3 p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-1">
                    Notes
                  </p>
                  {viewInvoice.notes}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-[#E2E8F0] flex justify-end gap-3">
              <button
                onClick={() => setViewInvoice(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-[#E2E8F0] text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => handleDownloadPDF(viewInvoice)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-[#1D4ED8] text-[#1D4ED8] hover:bg-blue-50 transition-colors"
              >
                <Download className="h-4 w-4" /> Download PDF
              </button>
              <button
                onClick={() => {
                  setUpdateStatusInvoice(viewInvoice);
                  setNewStatus(viewInvoice.status as InvoiceStatus);
                  setViewInvoice(null);
                }}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#1D4ED8] text-white hover:bg-blue-700 transition-colors"
              >
                Update Status
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default InvoiceManagement;
