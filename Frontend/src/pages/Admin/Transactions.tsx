import { motion } from "framer-motion";
import { CheckCircle, Clock, Download, FileText, X, RefreshCw, Filter, Search, CreditCard } from "lucide-react";
import React, { useEffect, useState } from "react";
import { DataTable, Column } from "@/components/ui/data-table";
import axios from "axios";
import { toast } from "@/components/ui/use-toast";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const inputCls =
  "h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] shadow-sm outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10";
const selCls =
  "h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-sm text-[#0F172A] shadow-sm outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 cursor-pointer";

export interface Payment {
  id: string;
  transactionId: string;
  paymentDate: string;
  amount: number;
  paymentStatus: string;
  paymentType: string;
  paymentMethod: string;
  vendor: string;
  propertyTenant: {
    fullName: string;
    property: {
      name: string;
      type: string;
      currency: string;
      owner: { fullName: string };
    };
  };
}

const Transactions: React.FC = () => {
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMethod, setFilterMethod] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get(`${apiUrl}/GetAllPayments`);
      setPayments(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data || "Failed to load transactions.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const filtered = payments.filter((p) => {
    const search = searchTerm.toLowerCase();
    const matchSearch =
      p.transactionId?.toLowerCase().includes(search) ||
      p.propertyTenant?.fullName?.toLowerCase().includes(search) ||
      p.propertyTenant?.property?.name?.toLowerCase().includes(search);

    const matchStatus =
      filterStatus === "all" || p.paymentStatus?.toLowerCase() === filterStatus.toLowerCase();
    const matchMethod =
      filterMethod === "all" || p.paymentMethod?.toLowerCase() === filterMethod.toLowerCase();

    const payDate = p.paymentDate ? new Date(p.paymentDate) : null;
    const matchFrom = !fromDate || (payDate && payDate >= new Date(fromDate));
    const matchTo = !toDate || (payDate && payDate <= new Date(toDate + "T23:59:59"));

    return matchSearch && matchStatus && matchMethod && matchFrom && matchTo;
  });

  const statusBadge = (status: string) => {
    const s = status?.toUpperCase();
    if (s === "SUCCESSFUL")
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
          <CheckCircle className="h-3 w-3" />
          Successful
        </span>
      );
    if (s === "PENDING")
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
          <Clock className="h-3 w-3" />
          Pending
        </span>
      );
    if (s === "FAILED")
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-red-100 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
          <X className="h-3 w-3" />
          Failed
        </span>
      );
    return (
      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
        {status}
      </span>
    );
  };

  const generateReceipt = (payment: Payment) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setTextColor(40, 53, 147);
    doc.text("PAYMENT RECEIPT", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Transaction Id: ${payment.transactionId}`, 15, 40);
    doc.text(`Transaction Date: ${new Date(payment.paymentDate).toLocaleDateString()}`, 15, 50);
    doc.text(`Status: ${payment.paymentStatus}`, 15, 60);
    doc.setFontSize(14);
    doc.text("Payment Details", 15, 80);
    autoTable(doc, {
      startY: 85,
      head: [["Field", "Value"]],
      body: [
        [
          "Property",
          `${payment.propertyTenant?.property?.name ?? ""} (${payment.propertyTenant?.property?.type ?? ""})`,
        ],
        ["Tenant", payment.propertyTenant?.fullName ?? ""],
        ["Landlord", payment.propertyTenant?.property?.owner?.fullName ?? ""],
        ["Payment Type", payment.paymentType],
        ["Payment Method", payment.paymentMethod],
        [
          "Amount",
          `${payment.propertyTenant?.property?.currency ?? "UGX"} ${payment.amount.toFixed(2)}`,
        ],
        ["Processed By", payment.vendor],
      ],
      theme: "grid",
      headStyles: { fillColor: [40, 53, 147] },
      margin: { left: 15 },
    });
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(
      "Thank you for your payment!",
      105,
      doc.internal.pageSize.height - 20,
      { align: "center" }
    );
    doc.save(`receipt_${payment.transactionId}.pdf`);
  };

  const hasFilters =
    fromDate || toDate || filterStatus !== "all" || filterMethod !== "all";

  const columns: Column<Payment>[] = [
    {
      key: "txId",
      header: "Transaction ID",
      cell: (p) => <span className="font-mono text-xs">{p.transactionId}</span>,
    },
    { key: "date", header: "Date", cell: (p) => new Date(p.paymentDate).toLocaleString() },
    { key: "property", header: "Property", cell: (p) => p.propertyTenant?.property?.name ?? "—" },
    {
      key: "landlord",
      header: "Landlord",
      cell: (p) => p.propertyTenant?.property?.owner?.fullName ?? "—",
    },
    { key: "tenant", header: "Tenant", cell: (p) => p.propertyTenant?.fullName ?? "—" },
    { key: "type", header: "Type", cell: (p) => p.paymentType },
    {
      key: "amount",
      header: "Amount",
      cell: (p) =>
        `${p.propertyTenant?.property?.currency ?? "UGX"} ${p.amount.toFixed(2)}`,
    },
    { key: "method", header: "Method", cell: (p) => p.paymentMethod },
    { key: "vendor", header: "Received By", cell: (p) => p.vendor },
    { key: "status", header: "Status", cell: (p) => statusBadge(p.paymentStatus) },
    {
      key: "receipt",
      header: "Receipt",
      headerClassName: "text-center",
      className: "text-center",
      cell: (p) =>
        p.paymentStatus?.toUpperCase() === "SUCCESSFUL" ? (
          <button
            onClick={() => generateReceipt(p)}
            className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
          >
            <Download className="h-3 w-3" />
            Download
          </button>
        ) : (
          <span className="text-xs text-slate-400">N/A</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#1E3A5F] to-[#1D4ED8] px-8 py-8 text-white shadow-xl">
        <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-8 left-1/3 h-40 w-40 rounded-full bg-white/5" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-200">
              Admin Panel
            </span>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Transactions</h1>
            <p className="text-sm text-blue-200/80">All payment records across the system</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-white/20 bg-white/10 p-3">
              <CreditCard className="h-6 w-6 text-blue-200" />
            </div>
            <button
              onClick={fetchTransactions}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition-colors disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </section>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              From
            </label>
            <input
              type="date"
              className={inputCls}
              style={{ width: 160 }}
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              To
            </label>
            <input
              type="date"
              className={inputCls}
              style={{ width: 160 }}
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Status
            </label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <select
                className={selCls + " pl-9"}
                style={{ width: 160 }}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="successful">Successful</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Method
            </label>
            <select
              className={selCls}
              style={{ width: 176 }}
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
            >
              <option value="all">All Methods</option>
              <option value="mobile money">Mobile Money</option>
              <option value="cash">Cash</option>
              <option value="bank transfer">Bank Transfer</option>
            </select>
          </div>
          {hasFilters && (
            <button
              onClick={() => {
                setFromDate("");
                setToDate("");
                setFilterStatus("all");
                setFilterMethod("all");
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors h-11"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
        <DataTable
          data={filtered}
          columns={columns}
          loading={isLoading}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search by transaction ID or tenant name"
          label="transaction"
          pageSize={10}
          emptyMessage="No transactions found"
          emptyIcon={<FileText className="h-10 w-10" />}
        />
      </div>
    </div>
  );
};

export default Transactions;
