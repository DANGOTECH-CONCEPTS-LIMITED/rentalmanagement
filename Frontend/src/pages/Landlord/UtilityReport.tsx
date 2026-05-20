import React, { useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { DataTable, Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Zap,
  Search,
  FileDown,
  CheckCircle2,
  XCircle,
  Clock,
  Hash,
  Gauge,
  TrendingUp,
  DollarSign,
} from "lucide-react";

type UtilityTransaction = {
  id: number;
  description: string;
  transactionID: string;
  reasonAtTelecom: string;
  paymentMethod: string;
  utilityType: string;
  status: string;
  vendorTranId: string;
  amount: number;
  charges: number;
  createdAt: string;
  phoneNumber: string;
  meterNumber: string;
  isTokenGenerated: boolean;
  token: string | null;
  units: string | null;
};

const StatusBadge = ({ status }: { status: string }) => {
  const failed = status.toUpperCase().includes("FAILED") || status.toUpperCase().includes("ERROR");
  const pending = status.toUpperCase().includes("PENDING");

  if (failed) return (
    <Badge className="bg-red-50 text-red-700 border border-red-200 gap-1 font-medium">
      <XCircle className="h-3 w-3" /> {status}
    </Badge>
  );
  if (pending) return (
    <Badge className="bg-amber-50 text-amber-700 border border-amber-200 gap-1 font-medium">
      <Clock className="h-3 w-3" /> {status}
    </Badge>
  );
  return (
    <Badge className="bg-green-50 text-green-700 border border-green-200 gap-1 font-medium">
      <CheckCircle2 className="h-3 w-3" /> {status}
    </Badge>
  );
};

const StatCard = ({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) => (
  <Card className="border border-slate-200 shadow-none">
    <CardContent className="pt-5 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
          <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color === "text-green-600" ? "bg-green-50" : color === "text-red-500" ? "bg-red-50" : color === "text-blue-600" ? "bg-blue-50" : "bg-amber-50"}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
      </div>
    </CardContent>
  </Card>
);

const UtilityReport: React.FC = () => {
  const [meterNumber, setMeterNumber] = useState("0292000010788");
  const [data, setData] = useState<UtilityTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [search, setSearch] = useState("");

  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const fetchData = async () => {
    if (!meterNumber.trim()) return;
    setIsLoading(true);
    setSearched(false);
    try {
      const response = await axios.get<UtilityTransaction[]>(
        `${apiUrl}/GetUtilityPaymentByMeterNumber/${meterNumber.trim()}`
      );
      setData(response.data);
      setSearched(true);
    } catch (error) {
      console.error("Fetch error:", error);
      setData([]);
      setSearched(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Utility Payment Report", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Meter: ${meterNumber}  |  Generated: ${new Date().toLocaleDateString()}`, 14, 28);

    autoTable(doc, {
      startY: 34,
      head: [["Date", "Status", "Amount", "Meter No.", "Charges", "Token", "Units", "Reason"]],
      body: data.map((item) => [
        new Date(item.createdAt).toLocaleDateString(),
        item.status,
        `UGX ${item.amount.toLocaleString()}`,
        item.meterNumber,
        `UGX ${item.charges.toLocaleString()}`,
        item.isTokenGenerated ? item.token || "N/A" : "N/A",
        item.units || "N/A",
        item.reasonAtTelecom,
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [29, 78, 216] },
    });

    doc.save(`utility-report-${meterNumber}.pdf`);
  };

  // Stats
  const totalAmount = data.reduce((s, d) => s + d.amount, 0);
  const totalCharges = data.reduce((s, d) => s + d.charges, 0);
  const successCount = data.filter((d) => !d.status.toUpperCase().includes("FAILED")).length;
  const failedCount = data.filter((d) => d.status.toUpperCase().includes("FAILED")).length;

  const columns: Column<UtilityTransaction>[] = [
    {
      key: "createdAt",
      header: "Date",
      cell: (item) => (
        <span className="text-slate-600 text-sm whitespace-nowrap">
          {new Date(item.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
        </span>
      ),
    },
    {
      key: "meterNumber",
      header: "Meter No.",
      cell: (item) => (
        <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
          {item.meterNumber}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: "amount",
      header: "Amount",
      headerClassName: "text-right",
      className: "text-right",
      cell: (item) => (
        <span className="font-semibold text-slate-800">UGX {item.amount.toLocaleString()}</span>
      ),
    },
    {
      key: "charges",
      header: "Charges",
      headerClassName: "text-right",
      className: "text-right",
      cell: (item) => (
        <span className="text-slate-500 text-sm">UGX {item.charges.toLocaleString()}</span>
      ),
    },
    {
      key: "token",
      header: "Token",
      cell: (item) =>
        item.isTokenGenerated && item.token ? (
          <span className="font-mono text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
            {item.token}
          </span>
        ) : (
          <span className="text-slate-300 text-xs">—</span>
        ),
    },
    {
      key: "units",
      header: "Units",
      cell: (item) =>
        item.units ? (
          <span className="text-sm font-medium text-slate-700">{item.units} kWh</span>
        ) : (
          <span className="text-slate-300 text-xs">—</span>
        ),
    },
    {
      key: "reasonAtTelecom",
      header: "Reason",
      cell: (item) => (
        <span className="text-xs text-slate-500 max-w-[180px] truncate block" title={item.reasonAtTelecom}>
          {item.reasonAtTelecom || "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page hero */}
      <div className="flex items-start justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-blue-600">
            <Zap className="h-3 w-3" /> Utility
          </span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">Utility Payment Report</h1>
          <p className="mt-1 text-sm text-slate-500">Look up all utility payments by meter number.</p>
        </div>
        {data.length > 0 && (
          <Button onClick={handleExportPDF} variant="outline" className="gap-2 mt-6">
            <FileDown className="h-4 w-4" /> Export PDF
          </Button>
        )}
      </div>

      {/* Search bar */}
      <div className="flex items-end gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex-1 space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Meter Number
          </label>
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={meterNumber}
              onChange={(e) => setMeterNumber(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchData()}
              placeholder="e.g. 0292000010788"
              className="pl-9 h-11 text-sm font-mono"
            />
          </div>
        </div>
        <Button
          onClick={fetchData}
          disabled={isLoading || !meterNumber.trim()}
          className="h-11 px-6 gap-2 bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isLoading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {isLoading ? "Loading…" : "Fetch"}
        </Button>
      </div>

      {/* Stats — shown after fetch */}
      {searched && data.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total Paid" value={`UGX ${totalAmount.toLocaleString()}`} icon={DollarSign} color="text-blue-600" />
          <StatCard label="Total Charges" value={`UGX ${totalCharges.toLocaleString()}`} icon={TrendingUp} color="text-amber-500" />
          <StatCard label="Successful" value={successCount} icon={CheckCircle2} color="text-green-600" />
          <StatCard label="Failed" value={failedCount} icon={XCircle} color="text-red-500" />
        </div>
      )}

      {/* Table */}
      {searched && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-semibold text-slate-700">
                Meter <span className="font-mono text-blue-600">{meterNumber}</span>
              </span>
              <Badge className="bg-slate-100 text-slate-600 font-medium ml-1">{data.length} records</Badge>
            </div>
          </div>
          <div className="p-4">
            <DataTable
              data={data}
              columns={columns}
              loading={isLoading}
              label="transaction"
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Filter by status, token, meter…"
              emptyMessage="No transactions found for this meter."
              emptyIcon={<Zap className="h-10 w-10" />}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default UtilityReport;
