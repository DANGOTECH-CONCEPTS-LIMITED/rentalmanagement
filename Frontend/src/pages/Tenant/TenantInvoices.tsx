import { useEffect, useState } from "react";
import axios from "axios";
import {
  FileText, CheckCircle2, Clock, AlertCircle, Eye, Download,
  Hash, Tag, Building2, DollarSign, Calendar, StickyNote, X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, Column } from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";

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
    const html = `<html><head><title>Invoice ${inv.invoiceNo}</title>
      <style>body{font-family:Arial,sans-serif;margin:24px}.header{text-align:center;margin-bottom:20px}.title{font-size:22px;font-weight:bold}.row{display:flex;margin-bottom:8px}.label{font-weight:bold;width:160px}.divider{border-top:1px dashed #000;margin:16px 0}.footer{text-align:center;font-size:12px;margin-top:32px}</style>
      </head><body>
      <div class="header"><div class="title">INVOICE</div><div>${inv.invoiceNo}</div></div>
      <div class="divider"></div>
      <div class="row"><div class="label">Tenant:</div><div>${tenant?.fullName ?? ""}</div></div>
      <div class="row"><div class="label">Property:</div><div>${propertyName}</div></div>
      <div class="row"><div class="label">Unit:</div><div>${unitNumber || "—"}</div></div>
      <div class="row"><div class="label">Type:</div><div>${inv.type}</div></div>
      <div class="row"><div class="label">Amount:</div><div>${currency} ${inv.amount.toLocaleString()}</div></div>
      <div class="row"><div class="label">Generated:</div><div>${new Date(inv.generatedDate).toLocaleDateString()}</div></div>
      <div class="row"><div class="label">Due Date:</div><div>${new Date(inv.dueDate).toLocaleDateString()}</div></div>
      <div class="row"><div class="label">Status:</div><div>${inv.status}</div></div>
      ${inv.notes ? `<div class="row"><div class="label">Notes:</div><div>${inv.notes}</div></div>` : ""}
      <div class="divider"></div>
      <div class="footer">Generated on ${new Date().toLocaleDateString()}</div>
      </body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `invoice_${inv.invoiceNo}.html`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    toast({ title: "Invoice Downloaded", description: `${inv.invoiceNo} saved.` });
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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#1E3A5F] to-[#1D4ED8] p-7 text-white shadow-xl">
        <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-10 right-20 h-36 w-36 rounded-full bg-white/5" />
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
            <div className="relative bg-gradient-to-br from-[#0F172A] via-[#1E3A5F] to-[#1D4ED8] px-6 pt-6 pb-8 text-white">
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
