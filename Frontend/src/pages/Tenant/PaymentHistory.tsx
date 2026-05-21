import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Download,
  CheckCircle2,
  Clock,
  XCircle,
  CreditCard,
  Home,
  Calendar,
  User,
  Hash,
  Receipt,
  Search,
  AlertCircle,
  X,
} from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";

interface Payment {
  id: number;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  vendor: string;
  paymentType: string;
  paymentStatus: "SUCCESSFUL" | "PENDING" | "FAILED";
  transactionId: string;
  propertyTenant: {
    fullName: string;
    property: {
      name: string;
      id: number;
      price: number;
      currency: string;
    };
  };
}

const inputCls =
  "w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 transition-colors";

const selCls =
  "w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 transition-colors";

const StatusBadge = ({ status }: { status: string }) => {
  const cfg: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
    SUCCESSFUL: {
      cls: "bg-emerald-50 text-emerald-700 border border-emerald-200",
      icon: <CheckCircle2 className="h-3 w-3" />,
      label: "Paid",
    },
    PENDING: {
      cls: "bg-amber-50 text-amber-700 border border-amber-200",
      icon: <Clock className="h-3 w-3" />,
      label: "Pending",
    },
    FAILED: {
      cls: "bg-red-50 text-red-700 border border-red-200",
      icon: <XCircle className="h-3 w-3" />,
      label: "Failed",
    },
  };
  const { cls, icon, label } = cfg[status] ?? {
    cls: "bg-slate-100 text-slate-600 border border-slate-200",
    icon: null,
    label: status,
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {icon}
      {label}
    </span>
  );
};

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const formatDateTime = (dateString: string) =>
  new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const ReceiptModal = ({
  payment,
  onClose,
}: {
  payment: Payment;
  onClose: () => void;
}) => {
  const downloadReceipt = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor("#1D4ED8");
    doc.setFont("helvetica", "bold");
    doc.text("Payment Receipt", 105, 20, { align: "center" });

    const startX = 20;
    let currentY = 40;
    const labelWidth = 50;
    const valueX = startX + labelWidth + 10;
    const rowHeight = 10;

    const drawRow = (label: string, value: string, valueColor = "#111827") => {
      doc.setFontSize(11);
      doc.setTextColor("#6B7280");
      doc.setFont("helvetica", "normal");
      doc.text(label, startX, currentY);
      doc.setTextColor(valueColor);
      doc.setFont("helvetica", "bold");
      doc.text(value, valueX, currentY);
      currentY += rowHeight;
    };

    drawRow("Transaction ID", payment.transactionId);
    drawRow("Date", formatDateTime(payment.paymentDate));
    drawRow("Tenant", payment.propertyTenant.fullName);
    drawRow("Property", payment.propertyTenant.property.name);
    drawRow("Amount", `${payment.amount} ${payment.propertyTenant.property.currency}`);
    drawRow("Payment Method", payment.paymentMethod);
    drawRow("Payment Type", payment.paymentType);
    if (payment.vendor) drawRow("Received By", payment.vendor);
    const statusLabel =
      payment.paymentStatus === "SUCCESSFUL"
        ? "Paid"
        : payment.paymentStatus === "PENDING"
        ? "Pending"
        : "Failed";
    const statusColor =
      payment.paymentStatus === "SUCCESSFUL"
        ? "#16A34A"
        : payment.paymentStatus === "PENDING"
        ? "#F59E0B"
        : "#DC2626";
    drawRow("Status", statusLabel, statusColor);

    doc.setDrawColor("#E5E7EB");
    doc.line(startX, currentY + 5, 190, currentY + 5);
    currentY += 20;
    doc.setFontSize(9);
    doc.setTextColor("#6B7280");
    doc.setFont("helvetica", "normal");
    doc.text("Thank you for your payment!", 105, currentY, { align: "center" });
    doc.text("This is an automated receipt. No signature required.", 105, currentY + 5, {
      align: "center",
    });
    doc.save(`receipt_${payment.transactionId}.pdf`);
  };

  const Row = ({
    label,
    value,
    mono,
  }: {
    label: string;
    value: React.ReactNode;
    mono?: boolean;
  }) => (
    <div className="flex items-start justify-between py-2.5 border-b border-[#F1F5F9] last:border-0">
      <span className="text-xs uppercase tracking-wider text-[#94A3B8] font-medium min-w-[120px]">
        {label}
      </span>
      <span
        className={`text-sm font-medium text-[#0F172A] text-right max-w-[60%] ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md rounded-2xl overflow-hidden shadow-[0_30px_90px_-36px_rgba(15,23,42,0.45)] bg-white"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0F172A] to-[#1D4ED8] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
              <Receipt className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Payment Receipt</h3>
              <p className="text-[11px] text-blue-200/80 font-mono">{payment.transactionId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadReceipt}
              className="flex items-center gap-1.5 rounded-lg bg-white/15 hover:bg-white/25 px-3 py-1.5 text-xs font-medium text-white transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </button>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Amount banner */}
        <div className="bg-slate-50 border-b border-[#E2E8F0] px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-[#94A3B8] uppercase tracking-wider">Amount Paid</p>
            <p className="text-2xl font-bold text-[#0F172A] mt-0.5">
              {payment.amount.toLocaleString()}{" "}
              <span className="text-base font-medium text-[#64748B]">
                {payment.propertyTenant.property.currency}
              </span>
            </p>
          </div>
          <StatusBadge status={payment.paymentStatus} />
        </div>

        {/* Details */}
        <div className="px-5 py-4">
          <Row label="Date" value={formatDateTime(payment.paymentDate)} />
          <Row label="Tenant" value={payment.propertyTenant.fullName} />
          <Row label="Property" value={payment.propertyTenant.property.name} />
          <Row label="Method" value={payment.paymentMethod} />
          <Row label="Type" value={payment.paymentType} />
          {payment.vendor && <Row label="Received By" value={payment.vendor} />}
          <Row label="Transaction ID" value={payment.transactionId} mono />
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-[#E2E8F0] px-5 py-3 text-center">
          <p className="text-xs text-[#64748B]">Thank you for your payment!</p>
          <p className="text-[11px] text-[#94A3B8] mt-0.5">
            This is an automated receipt. No signature required.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

const PaymentHistory = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const user = localStorage.getItem("user");
  const token = (() => {
    try {
      return user ? JSON.parse(user).token : null;
    } catch {
      return null;
    }
  })();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const userData = JSON.parse(user!);
      const response = await fetch(`${apiUrl}/GetPaymentsByTenantId/${userData.id}`, {
        headers: { accept: "*/*", Authorization: "Bearer " + token },
      });
      if (!response.ok) throw new Error("Failed to fetch payments");
      const data = await response.json();
      setPayments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = payments.filter((p) => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      p.transactionId.toLowerCase().includes(q) ||
      p.propertyTenant.property.name.toLowerCase().includes(q) ||
      p.propertyTenant.fullName.toLowerCase().includes(q) ||
      (p.vendor ?? "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || p.paymentStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  const total = payments.length;
  const paid = payments.filter((p) => p.paymentStatus === "SUCCESSFUL").length;
  const pending = payments.filter((p) => p.paymentStatus === "PENDING").length;
  const failed = payments.filter((p) => p.paymentStatus === "FAILED").length;
  const totalAmount = payments
    .filter((p) => p.paymentStatus === "SUCCESSFUL")
    .reduce((s, p) => s + p.amount, 0);

  const kpis = [
    {
      label: "Total Payments",
      value: total,
      icon: <CreditCard className="h-5 w-5 text-blue-600" />,
      bg: "bg-blue-50",
      border: "border-l-blue-500",
    },
    {
      label: "Paid",
      value: paid,
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
      bg: "bg-emerald-50",
      border: "border-l-emerald-500",
    },
    {
      label: "Pending",
      value: pending,
      icon: <Clock className="h-5 w-5 text-amber-600" />,
      bg: "bg-amber-50",
      border: "border-l-amber-500",
    },
    {
      label: "Failed",
      value: failed,
      icon: <XCircle className="h-5 w-5 text-red-500" />,
      bg: "bg-red-50",
      border: "border-l-red-500",
    },
  ];

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <AlertCircle className="h-8 w-8 text-red-400" />
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={fetchPayments}
          className="text-xs text-[#1D4ED8] hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl px-6 py-8 md:px-10" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0f2044 45%, #1a3a6e 100%)" }}>
        <div className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute bottom-0 -left-10 h-40 w-40 rounded-full bg-white/5" />
        <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                <Receipt className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest text-blue-200">
                Tenant Payments
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white md:text-3xl">Payment History</h1>
            <p className="max-w-md text-sm text-blue-200/80">
              Review your completed and pending rent payments and open a receipt when needed.
            </p>
          </div>

          {/* Stat chips */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Total", val: total, color: "bg-white/15 text-white" },
              { label: "Paid", val: paid, color: "bg-emerald-500/25 text-emerald-200" },
              { label: "Pending", val: pending, color: "bg-amber-500/25 text-amber-200" },
              {
                label: `${payments[0]?.propertyTenant.property.currency ?? "UGX"} ${totalAmount.toLocaleString()}`,
                val: null,
                color: "bg-blue-500/25 text-blue-100",
              },
            ].map(({ label, val, color }) => (
              <div
                key={label}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${color}`}
              >
                {val !== null && <span className="font-bold">{val}</span>}
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {kpis.map(({ label, value, icon, bg, border }) => (
          <div
            key={label}
            className={`rounded-xl border border-[#E2E8F0] bg-white p-4 border-l-4 ${border} shadow-sm`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#64748B] font-medium">{label}</p>
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${bg}`}>
                {icon}
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-[#0F172A]">{value}</p>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
        {/* Card Header */}
        <div className="flex flex-col gap-3 border-b border-[#E2E8F0] px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#0F172A]">Transaction Records</h2>
            <p className="text-xs text-[#64748B] mt-0.5">Your payment history and receipts.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search by ID, property…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`${inputCls} pl-8 h-9 py-0 w-48 md:w-60`}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`${selCls} h-9 py-0 w-36`}
            >
              <option value="all">All Status</option>
              <option value="SUCCESSFUL">Paid</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex flex-col gap-3 p-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
              <FileText className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-[#64748B]">No payment records found</p>
            {searchTerm || statusFilter !== "all" ? (
              <button
                onClick={() => { setSearchTerm(""); setStatusFilter("all"); }}
                className="text-xs text-[#1D4ED8] hover:underline"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px]">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-slate-50/60">
                  {[
                    "Transaction ID",
                    "Date",
                    "Property",
                    "Amount",
                    "Method",
                    "Type",
                    "Received By",
                    "Status",
                    "Receipt",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Transaction ID */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Hash className="h-3.5 w-3.5 text-[#94A3B8] shrink-0" />
                        <span className="font-mono text-xs text-[#0F172A]">
                          {p.transactionId}
                        </span>
                      </div>
                    </td>
                    {/* Date */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-sm text-[#64748B]">
                        <Calendar className="h-3.5 w-3.5 text-[#94A3B8]" />
                        {formatDate(p.paymentDate)}
                      </div>
                    </td>
                    {/* Property */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-sm text-[#0F172A]">
                        <Home className="h-3.5 w-3.5 text-[#94A3B8]" />
                        <span className="max-w-[140px] truncate">
                          {p.propertyTenant.property.name}
                        </span>
                      </div>
                    </td>
                    {/* Amount */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-semibold text-[#0F172A]">
                        {p.amount.toLocaleString()}
                      </span>
                      <span className="ml-1 text-xs text-[#64748B]">
                        {p.propertyTenant.property.currency}
                      </span>
                    </td>
                    {/* Method */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <CreditCard className="h-3.5 w-3.5 text-[#94A3B8]" />
                        <span className="text-sm text-[#64748B]">{p.paymentMethod}</span>
                      </div>
                    </td>
                    {/* Type */}
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-[#64748B]">
                        {p.paymentType}
                      </span>
                    </td>
                    {/* Received By */}
                    <td className="px-4 py-3">
                      {p.vendor ? (
                        <div className="flex items-center gap-1.5 text-sm text-[#64748B]">
                          <User className="h-3.5 w-3.5 text-[#94A3B8]" />
                          {p.vendor}
                        </div>
                      ) : (
                        <span className="text-[#94A3B8] text-xs">—</span>
                      )}
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={p.paymentStatus} />
                    </td>
                    {/* Receipt */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedPayment(p)}
                        className="flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-xs font-medium text-[#1D4ED8] hover:bg-blue-50 hover:border-blue-200 transition-colors"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t border-[#E2E8F0] px-5 py-3">
              <p className="text-xs text-[#94A3B8]">
                Showing {filtered.length} of {total} payment{total !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      <AnimatePresence>
        {selectedPayment && (
          <ReceiptModal payment={selectedPayment} onClose={() => setSelectedPayment(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default PaymentHistory;
