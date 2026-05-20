import { motion } from "framer-motion";
import { CheckCircle, Clock, Download, FileText, X, RefreshCw, Filter } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import axios from "axios";
import { toast } from "@/components/ui/use-toast";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

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
      toast({ title: "Error", description: error.response?.data || "Failed to load transactions.", variant: "destructive" });
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

    const matchStatus = filterStatus === "all" || p.paymentStatus?.toLowerCase() === filterStatus.toLowerCase();
    const matchMethod = filterMethod === "all" || p.paymentMethod?.toLowerCase() === filterMethod.toLowerCase();

    const payDate = p.paymentDate ? new Date(p.paymentDate) : null;
    const matchFrom = !fromDate || (payDate && payDate >= new Date(fromDate));
    const matchTo = !toDate || (payDate && payDate <= new Date(toDate + "T23:59:59"));

    return matchSearch && matchStatus && matchMethod && matchFrom && matchTo;
  });

  const statusBadge = (status: string) => {
    const s = status?.toUpperCase();
    if (s === "SUCCESSFUL") return <Badge className="bg-green-100 text-green-800 border-green-200 border" variant="outline"><CheckCircle className="h-3 w-3 mr-1" />Successful</Badge>;
    if (s === "PENDING") return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 border" variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    if (s === "FAILED") return <Badge className="bg-red-100 text-red-800 border-red-200 border" variant="outline"><X className="h-3 w-3 mr-1" />Failed</Badge>;
    return <Badge variant="outline">{status}</Badge>;
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
        ["Property", `${payment.propertyTenant?.property?.name ?? ""} (${payment.propertyTenant?.property?.type ?? ""})`],
        ["Tenant", payment.propertyTenant?.fullName ?? ""],
        ["Landlord", payment.propertyTenant?.property?.owner?.fullName ?? ""],
        ["Payment Type", payment.paymentType],
        ["Payment Method", payment.paymentMethod],
        ["Amount", `${payment.propertyTenant?.property?.currency ?? "UGX"} ${payment.amount.toFixed(2)}`],
        ["Processed By", payment.vendor],
      ],
      theme: "grid",
      headStyles: { fillColor: [40, 53, 147] },
      margin: { left: 15 },
    });
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Thank you for your payment!", 105, doc.internal.pageSize.height - 20, { align: "center" });
    doc.save(`receipt_${payment.transactionId}.pdf`);
  };

  const columns: Column<Payment>[] = [
    { key: "txId", header: "Transaction ID", cell: (p) => <span className="font-mono text-xs">{p.transactionId}</span> },
    { key: "date", header: "Date", cell: (p) => new Date(p.paymentDate).toLocaleString() },
    { key: "property", header: "Property", cell: (p) => p.propertyTenant?.property?.name ?? "—" },
    { key: "landlord", header: "Landlord", cell: (p) => p.propertyTenant?.property?.owner?.fullName ?? "—" },
    { key: "tenant", header: "Tenant", cell: (p) => p.propertyTenant?.fullName ?? "—" },
    { key: "type", header: "Type", cell: (p) => p.paymentType },
    { key: "amount", header: "Amount", cell: (p) => `${p.propertyTenant?.property?.currency ?? "UGX"} ${p.amount.toFixed(2)}` },
    { key: "method", header: "Method", cell: (p) => p.paymentMethod },
    { key: "vendor", header: "Received By", cell: (p) => p.vendor },
    { key: "status", header: "Status", cell: (p) => statusBadge(p.paymentStatus) },
    {
      key: "receipt", header: "Receipt", headerClassName: "text-center", className: "text-center",
      cell: (p) =>
        p.paymentStatus?.toUpperCase() === "SUCCESSFUL" ? (
          <Button variant="ghost" size="sm" className="text-blue-600" onClick={() => generateReceipt(p)}>
            <Download className="h-4 w-4 mr-1" />Download
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">N/A</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Transactions</h1>
          <p className="text-sm text-muted-foreground mt-1">All payment records across the system</p>
        </div>
        <Button variant="outline" onClick={fetchTransactions} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="data-surface p-4 flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">From</p>
          <Input type="date" className="w-40" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">To</p>
          <Input type="date" className="w-40" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Status</p>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-1 text-muted-foreground" />
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="successful">Successful</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Method</p>
          <Select value={filterMethod} onValueChange={setFilterMethod}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Methods" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="mobile money">Mobile Money</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="bank transfer">Bank Transfer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(fromDate || toDate || filterStatus !== "all" || filterMethod !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setFromDate(""); setToDate(""); setFilterStatus("all"); setFilterMethod("all"); }}
          >
            <X className="h-4 w-4 mr-1" />Clear
          </Button>
        )}
      </div>

      <div className="data-surface p-0 overflow-hidden">
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
