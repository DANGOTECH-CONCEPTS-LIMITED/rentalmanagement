import { useEffect, useState } from "react";
import axios from "axios";
import {
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Download,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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

const statusBadge = (s: InvoiceStatus) => {
  const map: Record<InvoiceStatus, string> = {
    Paid: "bg-green-100 text-green-800",
    Pending: "bg-amber-100 text-amber-800",
    Overdue: "bg-red-100 text-red-800",
  };
  const icons: Record<InvoiceStatus, React.ReactNode> = {
    Paid: <CheckCircle className="h-3 w-3" />,
    Pending: <Clock className="h-3 w-3" />,
    Overdue: <AlertCircle className="h-3 w-3" />,
  };
  return (
    <Badge className={`${map[s] ?? "bg-gray-100 text-gray-800"} flex items-center gap-1 w-fit`}>
      {icons[s]}{s}
    </Badge>
  );
};

const typeBadge = (t: string) => {
  const map: Record<string, string> = {
    Invoice: "bg-blue-100 text-blue-800",
    "Manual Invoice": "bg-purple-100 text-purple-800",
    "Manual Payment": "bg-teal-100 text-teal-800",
  };
  return <Badge className={`${map[t] ?? "bg-gray-100 text-gray-800"} w-fit`}>{t}</Badge>;
};

const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between py-2 border-b last:border-0 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-slate-800 text-right max-w-[60%]">{value || "—"}</span>
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

        // Resolve tenant record from user id (same pattern as all tenant pages)
        const tenantRes = await axios.get<TenantInfo>(
          `${apiUrl}/GetTenantById/${userData.id}`
        );
        const tenantData = tenantRes.data;
        setTenant(tenantData);

        // Fetch invoices using the tenant's Tenants.Id
        const invoicesRes = await axios.get<any[]>(
          `${apiUrl}/GetInvoicesByTenantId/${tenantData.id}`
        );

        const mapped: Invoice[] = invoicesRes.data.map((inv) => ({
          id: inv.id,
          invoiceNo: inv.invoiceNumber,
          type: inv.type ?? "Invoice",
          status: inv.status as InvoiceStatus,
          amount: inv.amount,
          dueDate: inv.dueDate,
          generatedDate: inv.invoiceDate ?? inv.createdAt,
          notes: inv.notes,
        }));

        setInvoices(mapped);
      } catch (err) {
        toast({
          title: "Failed to load invoices",
          description: axios.isAxiosError(err)
            ? err.response?.data || err.message
            : "An error occurred",
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

  const filtered = invoices.filter((inv) =>
    tab === "all" || inv.status.toLowerCase() === tab
  );

  const totalPaid = invoices.filter((i) => i.status === "Paid").reduce((s, i) => s + i.amount, 0);
  const totalPending = invoices.filter((i) => i.status === "Pending").reduce((s, i) => s + i.amount, 0);
  const totalOverdue = invoices.filter((i) => i.status === "Overdue").reduce((s, i) => s + i.amount, 0);

  const handleDownload = (inv: Invoice) => {
    const html = `
      <html><head><title>Invoice ${inv.invoiceNo}</title>
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
    a.href = url;
    a.download = `invoice_${inv.invoiceNo}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Invoice Downloaded", description: `${inv.invoiceNo} saved.` });
  };

  const columns: Column<Invoice>[] = [
    {
      key: "invoiceNo",
      header: "Invoice No.",
      cell: (row) => <span className="font-medium text-slate-900">{row.invoiceNo}</span>,
    },
    {
      key: "type",
      header: "Type",
      cell: (row) => typeBadge(row.type),
    },
    {
      key: "amount",
      header: "Amount",
      headerClassName: "text-right",
      className: "text-right",
      cell: (row) => (
        <span className="font-semibold">{currency} {row.amount.toLocaleString()}</span>
      ),
    },
    {
      key: "generatedDate",
      header: "Issued",
      cell: (row) => new Date(row.generatedDate).toLocaleDateString(),
    },
    {
      key: "dueDate",
      header: "Due Date",
      cell: (row) => (
        <span className={row.status === "Overdue" ? "text-red-600 font-medium" : ""}>
          {new Date(row.dueDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => statusBadge(row.status),
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "text-right",
      className: "text-right",
      cell: (row) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-blue-600 hover:text-blue-800"
            onClick={() => setViewInvoice(row)}
          >
            <Eye className="h-4 w-4" />
            <span className="ml-1 hidden sm:inline">View</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-slate-600 hover:text-slate-800"
            onClick={() => handleDownload(row)}
          >
            <Download className="h-4 w-4" />
            <span className="ml-1 hidden sm:inline">Download</span>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <section className="page-hero">
        <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Billing
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 mt-2">My Invoices</h1>
        <p className="mt-1 text-muted-foreground">View invoices and billing records from your landlord.</p>
      </section>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currency} {totalPaid.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {invoices.filter((i) => i.status === "Paid").length} invoices
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currency} {totalPending.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {invoices.filter((i) => i.status === "Pending").length} invoices
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{currency} {totalOverdue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {invoices.filter((i) => i.status === "Overdue").length} invoices
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Invoices table */}
      <Card className="data-surface border-none shadow-none">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardDescription>All invoices and billing records for your tenancy.</CardDescription>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList>
                <TabsTrigger value="all">All ({invoices.length})</TabsTrigger>
                <TabsTrigger value="paid">Paid</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="overdue">Overdue</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filtered}
            columns={columns}
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by invoice number or type..."
            label="invoice"
            emptyMessage={loading ? "Loading invoices…" : "No invoices found"}
            emptyIcon={<FileText className="h-10 w-10" />}
          />
        </CardContent>
      </Card>

      {/* View invoice dialog */}
      <Dialog open={!!viewInvoice} onOpenChange={(o) => !o && setViewInvoice(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {viewInvoice?.invoiceNo}
            </DialogTitle>
            <DialogDescription>Full invoice details</DialogDescription>
          </DialogHeader>
          {viewInvoice && (
            <div className="space-y-1">
              <DetailRow label="Invoice No." value={viewInvoice.invoiceNo} />
              <DetailRow label="Type" value={typeBadge(viewInvoice.type)} />
              {propertyName && <DetailRow label="Property" value={propertyName} />}
              {unitNumber && <DetailRow label="Unit" value={unitNumber} />}
              <DetailRow label="Amount" value={`${currency} ${viewInvoice.amount.toLocaleString()}`} />
              <DetailRow label="Date Issued" value={new Date(viewInvoice.generatedDate).toLocaleDateString()} />
              <DetailRow label="Due Date" value={new Date(viewInvoice.dueDate).toLocaleDateString()} />
              <DetailRow label="Status" value={statusBadge(viewInvoice.status)} />
              {viewInvoice.notes && <DetailRow label="Notes" value={viewInvoice.notes} />}
            </div>
          )}
          <div className="flex justify-end pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => viewInvoice && handleDownload(viewInvoice)}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TenantInvoices;
