import { useState, useEffect } from "react";
import {
  CircleDollarSign,
  Filter,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

interface Payment {
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
    email: string;
    phoneNumber: string;
    property: {
      id: number;
      name: string;
      address: string;
    };
  };
}

// ── KPI Card ────────────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  accent: string;
}
const KpiCard = ({ label, value, sub, icon: Icon, iconBg, iconColor, accent }: KpiCardProps) => (
  <div className={`rounded-2xl border-l-4 border border-slate-200 bg-white p-5 shadow-sm ${accent}`}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-1.5 text-2xl font-bold text-[#0F172A] leading-none">{value}</p>
        <p className="mt-1.5 text-xs text-slate-500">{sub}</p>
      </div>
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
    </div>
  </div>
);

// ── Status & Method badges ───────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  if (status === "SUCCESSFUL")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-100">
        <CheckCircle2 className="h-3 w-3" /> Paid
      </span>
    );
  if (status === "PENDING")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-100">
        <AlertCircle className="h-3 w-3" /> Pending
      </span>
    );
  if (status === "FAILED")
    return (
      <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 border border-red-100">
        Failed
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
    CASH: { label: "Cash", cls: "bg-slate-100 text-slate-700 border-slate-200" },
    MOMO: { label: "Mobile Money", cls: "bg-violet-50 text-violet-700 border-violet-100" },
    BANK: { label: "Bank", cls: "bg-blue-50 text-blue-700 border-blue-100" },
    CARD: { label: "Card", cls: "bg-indigo-50 text-indigo-700 border-indigo-100" },
  };
  const m = map[method] ?? { label: method, cls: "bg-slate-100 text-slate-600 border-slate-200" };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${m.cls}`}>
      {m.label}
    </span>
  );
};

// ── Component ────────────────────────────────────────────────────────────────
const TrackPayments = () => {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMethod, setFilterMethod] = useState("all");
  const [sortField, setSortField] = useState("paymentDate");
  const [sortDirection, setSortDirection] = useState("desc");

  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [selectedTenantIds, setSelectedTenantIds] = useState<Set<number>>(new Set());
  const [isSendingReminders, setIsSendingReminders] = useState(false);
  const [sendingAckId, setSendingAckId] = useState<number | null>(null);
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
      const response = await fetch(`${apiUrl}/GetAllPayments`, {
        headers: { Authorization: `Bearer ${token}`, accept: "*/*" },
      });
      if (!response.ok) throw new Error("Failed to fetch payments");
      const data = await response.json();
      setPayments(data.filter((p: any) => p.propertyTenant.property.ownerId === userData.id));
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast({
        title: "Error loading payments",
        description: "Could not retrieve payments. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const sendSms = async (phone: string, message: string, reference: string) => {
    const res = await fetch(`${apiUrl}/sendSingleSms`, {
      method: "POST",
      headers: {
        accept: "*/*",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phone, message, reference }),
    });
    if (!res.ok) throw new Error(`SMS failed: ${res.status}`);
  };

  const pendingByTenant = Object.values(
    payments
      .filter((p) => p.paymentStatus === "PENDING")
      .reduce<Record<number, Payment>>((acc, p) => {
        if (!acc[p.propertyTenantId]) acc[p.propertyTenantId] = p;
        else acc[p.propertyTenantId].amount += p.amount;
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
    if (selectedTenantIds.size === pendingByTenant.length) {
      setSelectedTenantIds(new Set());
    } else {
      setSelectedTenantIds(new Set(pendingByTenant.map((p) => p.propertyTenantId)));
    }
  };

  const handleSendBulkReminders = async () => {
    const targets = pendingByTenant.filter((p) => selectedTenantIds.has(p.propertyTenantId));
    if (targets.length === 0) return;
    setIsSendingReminders(true);
    let sent = 0, failed = 0;
    for (const p of targets) {
      const msg =
        `Dear ${p.propertyTenant.fullName}, your rent payment of UGX ${p.amount.toLocaleString()} ` +
        `for ${p.propertyTenant.property.name} is currently pending. Please make your payment at your ` +
        `earliest convenience. Thank you.`;
      try {
        await sendSms(p.propertyTenant.phoneNumber, msg, "Rent Payment Reminder");
        sent++;
      } catch { failed++; }
    }
    setIsSendingReminders(false);
    setShowReminderDialog(false);
    setSelectedTenantIds(new Set());
    toast({
      title: failed === 0 ? "Reminders Sent" : "Partial Success",
      description:
        failed === 0
          ? `${sent} SMS reminder${sent !== 1 ? "s" : ""} sent successfully.`
          : `${sent} sent, ${failed} failed.`,
      variant: failed > 0 ? "destructive" : "default",
    });
  };

  const handleSendAcknowledgment = async (payment: Payment) => {
    setSendingAckId(payment.id);
    const msg =
      `Dear ${payment.propertyTenant.fullName}, your payment of UGX ${payment.amount.toLocaleString()} ` +
      `for ${payment.propertyTenant.property.name} (Ref: ${payment.transactionId}) was received on ` +
      `${new Date(payment.paymentDate).toLocaleDateString()}. Thank you!`;
    try {
      await sendSms(payment.propertyTenant.phoneNumber, msg, "Payment Acknowledgment");
      toast({ title: "Acknowledgment Sent", description: `SMS sent to ${payment.propertyTenant.fullName}.` });
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
      description: checked
        ? "SMS will be sent automatically when a payment is confirmed."
        : "Automatic payment acknowledgment SMS is off.",
    });
  };

  const generateReceipt = (payment: Payment) => {
    const receiptHTML = `
      <html>
        <head>
          <title>Receipt for Payment ${payment.transactionId}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .receipt-title { font-size: 24px; font-weight: bold; }
            .receipt-details { margin-top: 30px; }
            .detail-row { display: flex; margin-bottom: 10px; }
            .detail-label { font-weight: bold; width: 150px; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; }
            .divider { border-top: 1px dashed #000; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="receipt-title">PAYMENT RECEIPT</div>
            <div>Transaction ID: ${payment.transactionId}</div>
          </div>
          <div class="divider"></div>
          <div class="receipt-details">
            <div class="detail-row"><div class="detail-label">Tenant:</div><div>${payment.propertyTenant.fullName}</div></div>
            <div class="detail-row"><div class="detail-label">Property:</div><div>${payment.propertyTenant.property.name}</div></div>
            <div class="detail-row"><div class="detail-label">Address:</div><div>${payment.propertyTenant.property.address}</div></div>
            <div class="detail-row"><div class="detail-label">Payment Date:</div><div>${new Date(payment.paymentDate).toLocaleDateString()}</div></div>
            <div class="detail-row"><div class="detail-label">Payment Method:</div><div>${payment.paymentMethod}</div></div>
            <div class="detail-row"><div class="detail-label">Payment Type:</div><div>${payment.paymentType}</div></div>
            <div class="detail-row"><div class="detail-label">Amount:</div><div>UGX ${payment.amount.toLocaleString()}</div></div>
            ${payment.vendor ? `<div class="detail-row"><div class="detail-label">Received By:</div><div>${payment.vendor}</div></div>` : ""}
            ${payment.description ? `<div class="detail-row"><div class="detail-label">Description:</div><div>${payment.description}</div></div>` : ""}
          </div>
          <div class="divider"></div>
          <div class="footer">
            <div>Thank you for your payment!</div>
            <div>Generated on ${new Date().toLocaleDateString()}</div>
          </div>
        </body>
      </html>
    `;
    const blob = new Blob([receiptHTML], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt_${payment.transactionId}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Receipt Generated", description: `Receipt for ${payment.transactionId} downloaded.` });
  };

  const handleExport = () => {
    const headers = [
      "Transaction ID", "Tenant", "Property", "Amount (UGX)",
      "Payment Date", "Payment Method", "Payment Type", "Status",
      "Received By", "Description",
    ];
    const csvRows = [
      headers.join(","),
      ...payments.map((p) =>
        [
          `"${p.transactionId}"`,
          `"${p.propertyTenant.fullName}"`,
          `"${p.propertyTenant.property.name}"`,
          p.amount,
          new Date(p.paymentDate).toLocaleDateString(),
          p.paymentMethod,
          p.paymentType,
          p.paymentStatus,
          p.vendor ? `"${p.vendor}"` : "",
          p.description ? `"${p.description}"` : "",
        ].join(",")
      ),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "payments_export.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export Successful", description: "Payments exported to CSV." });
  };

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.propertyTenant.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.propertyTenant.property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.transactionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (payment.vendor ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || payment.paymentStatus === filterStatus;
    const matchesMethod = filterMethod === "all" || payment.paymentMethod === filterMethod;
    return matchesSearch && matchesStatus && matchesMethod;
  });

  const sortedPayments = [...filteredPayments].sort((a, b) => {
    if (sortField === "paymentDate") {
      const dA = new Date(a.paymentDate).getTime();
      const dB = new Date(b.paymentDate).getTime();
      return sortDirection === "asc" ? dA - dB : dB - dA;
    }
    if (sortField === "amount")
      return sortDirection === "asc" ? a.amount - b.amount : b.amount - a.amount;
    if (sortField === "tenant")
      return sortDirection === "asc"
        ? a.propertyTenant.fullName.localeCompare(b.propertyTenant.fullName)
        : b.propertyTenant.fullName.localeCompare(a.propertyTenant.fullName);
    return 0;
  });

  const handleSort = (field: string) => {
    if (sortField === field) setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDirection("asc"); }
  };

  const SortIcon = ({ field }: { field: string }) =>
    sortField === field ? (
      sortDirection === "asc"
        ? <ArrowUp className="ml-1 h-3 w-3 inline" />
        : <ArrowDown className="ml-1 h-3 w-3 inline" />
    ) : null;

  const totalReceived = payments.filter((p) => p.paymentStatus === "SUCCESSFUL").reduce((s, p) => s + p.amount, 0);
  const totalPending  = payments.filter((p) => p.paymentStatus === "PENDING").reduce((s, p) => s + p.amount, 0);
  const totalCash     = payments.filter((p) => p.paymentMethod === "CASH" && p.paymentStatus === "SUCCESSFUL").reduce((s, p) => s + p.amount, 0);

  const selectCls =
    "h-9 rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm text-[#0F172A] shadow-sm " +
    "outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 cursor-pointer";

  const columns: Column<Payment>[] = [
    {
      key: "transactionId",
      header: "Transaction ID",
      headerClassName: "w-[130px]",
      cell: (row) => (
        <span className="font-mono text-xs font-semibold text-[#0F172A]">{row.transactionId}</span>
      ),
    },
    {
      key: "tenant",
      header: "Tenant",
      cell: (row) => (
        <button
          className="flex items-center gap-1.5 text-left text-sm font-medium text-[#0F172A] hover:text-[#1D4ED8] transition-colors"
          onClick={() => handleSort("tenant")}
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1D4ED8]/10 text-[10px] font-bold text-[#1D4ED8]">
            {row.propertyTenant.fullName.charAt(0)}
          </span>
          {row.propertyTenant.fullName}
          <SortIcon field="tenant" />
        </button>
      ),
    },
    {
      key: "property",
      header: "Property",
      cell: (row) => (
        <span className="text-sm text-slate-600">{row.propertyTenant.property.name}</span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      headerClassName: "text-right",
      className: "text-right",
      cell: (row) => (
        <button
          className="flex w-full items-center justify-end gap-1 text-sm font-semibold text-[#0F172A] hover:text-[#1D4ED8] transition-colors"
          onClick={() => handleSort("amount")}
        >
          UGX {row.amount.toLocaleString()}
          <SortIcon field="amount" />
        </button>
      ),
    },
    {
      key: "paymentDate",
      header: "Date",
      cell: (row) => (
        <button
          className="flex items-center gap-1 text-sm text-slate-600 hover:text-[#1D4ED8] transition-colors"
          onClick={() => handleSort("paymentDate")}
        >
          {new Date(row.paymentDate).toLocaleDateString()}
          <SortIcon field="paymentDate" />
        </button>
      ),
    },
    {
      key: "paymentMethod",
      header: "Method",
      cell: (row) => <MethodBadge method={row.paymentMethod} />,
    },
    {
      key: "vendor",
      header: "Received By",
      cell: (row) =>
        row.vendor ? (
          <span className="flex items-center gap-1.5 text-sm text-slate-600">
            <User className="h-3 w-3 text-slate-400" />
            {row.vendor}
          </span>
        ) : (
          <span className="text-slate-300 text-sm">—</span>
        ),
    },
    {
      key: "paymentStatus",
      header: "Status",
      cell: (row) => <StatusBadge status={row.paymentStatus} />,
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "text-right",
      className: "text-right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          {row.paymentStatus === "SUCCESSFUL" && (
            <button
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-50"
              disabled={sendingAckId === row.id}
              onClick={() => handleSendAcknowledgment(row)}
            >
              {sendingAckId === row.id
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <MessageSquare className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">SMS</span>
            </button>
          )}
          <button
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#1D4ED8] hover:bg-blue-50 transition-colors"
            onClick={() => generateReceipt(row)}
          >
            <DownloadIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Receipt</span>
          </button>
        </div>
      ),
    },
  ];

  const filterControls = (
    <div className="flex items-center gap-2">
      <Filter className="h-3.5 w-3.5 text-slate-400" />
      <select className={selectCls} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
        <option value="all">All Status</option>
        <option value="SUCCESSFUL">Successful</option>
        <option value="PENDING">Pending</option>
        <option value="FAILED">Failed</option>
      </select>
      <select className={selectCls} value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)}>
        <option value="all">All Methods</option>
        <option value="CASH">Cash</option>
        <option value="MOMO">Mobile Money</option>
        <option value="BANK">Bank Transfer</option>
        <option value="CARD">Credit Card</option>
      </select>
    </div>
  );

  return (
    <div className="space-y-6">

      {/* ── Hero banner ── */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#1E3A5F] to-[#1D4ED8] px-8 py-8 text-white shadow-xl">
        <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-8 left-1/3 h-40 w-40 rounded-full bg-white/5" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-200">
              Payment Monitoring
            </span>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Payment Tracking</h1>
            <p className="text-sm text-blue-200">View and manage all payment transactions</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {pendingByTenant.length > 0 && (
              <button
                className="inline-flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-300 transition-colors hover:bg-amber-400/20"
                onClick={() => {
                  setSelectedTenantIds(new Set(pendingByTenant.map((p) => p.propertyTenantId)));
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
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20"
              onClick={handleExport}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>
      </section>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Total Received"
          value={`UGX ${totalReceived.toLocaleString()}`}
          sub={`${payments.filter((p) => p.paymentStatus === "SUCCESSFUL").length} completed payments`}
          icon={TrendingUp}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          accent="border-l-emerald-500"
        />
        <KpiCard
          label="Pending Payments"
          value={`UGX ${totalPending.toLocaleString()}`}
          sub={`${payments.filter((p) => p.paymentStatus === "PENDING").length} payments awaiting`}
          icon={AlertCircle}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          accent="border-l-amber-500"
        />
        <KpiCard
          label="Cash Payments"
          value={`UGX ${totalCash.toLocaleString()}`}
          sub={`${payments.filter((p) => p.paymentMethod === "CASH").length} cash transactions`}
          icon={Banknote}
          iconBg="bg-slate-100"
          iconColor="text-slate-600"
          accent="border-l-slate-400"
        />
      </div>

      {/* ── Auto-acknowledge toggle ── */}
      <div className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50/60 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
            <BellRing className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0F172A]">Automatic Payment Acknowledgment SMS</p>
            <p className="text-xs text-slate-500">
              Send an SMS to tenants automatically when their payment is confirmed
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 ml-4 shrink-0">
          <Label htmlFor="auto-ack" className="text-sm font-medium text-slate-600">
            {autoAcknowledge ? "On" : "Off"}
          </Label>
          <Switch id="auto-ack" checked={autoAcknowledge} onCheckedChange={handleAutoAcknowledgeToggle} />
        </div>
      </div>

      {/* ── Payments table ── */}
      <div className="space-y-1">
        <div className="px-0.5">
          <p className="text-xs text-slate-400">
            Use the{" "}
            <MessageSquare className="inline h-3 w-3" />{" "}
            SMS button on successful payments to send an acknowledgment to the tenant.
          </p>
        </div>
        <DataTable
          data={sortedPayments}
          columns={columns}
          loading={isLoading}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search tenant, property, transaction ID…"
          label="payment"
          emptyMessage="No payments found"
          emptyIcon={<CircleDollarSign className="h-6 w-6 text-slate-300" />}
          headerRight={filterControls}
          minWidth="820px"
        />
      </div>

      {/* ── Bulk SMS Reminder Dialog ── */}
      <Dialog open={showReminderDialog} onOpenChange={setShowReminderDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col p-0 overflow-hidden rounded-2xl">
          {/* Dialog header */}
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-5 text-white">
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
                <label
                  key={p.propertyTenantId}
                  className="flex cursor-pointer items-start gap-3 rounded-xl px-3 py-3 hover:bg-slate-50 transition-colors"
                >
                  <Checkbox
                    checked={selectedTenantIds.has(p.propertyTenantId)}
                    onCheckedChange={() => handleToggleTenant(p.propertyTenantId)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm text-[#0F172A] truncate">
                        {p.propertyTenant.fullName}
                      </span>
                      <span className="text-sm font-bold text-amber-700 shrink-0">
                        UGX {p.amount.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 space-y-0.5">
                      <div>{p.propertyTenant.property.name}</div>
                      <div>{p.propertyTenant.phoneNumber}</div>
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
              className="inline-flex items-center gap-2 rounded-xl bg-[#1D4ED8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e40af] transition-colors disabled:opacity-50"
              onClick={handleSendBulkReminders}
              disabled={selectedTenantIds.size === 0 || isSendingReminders}
            >
              {isSendingReminders ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
              ) : (
                <><Send className="h-4 w-4" /> Send to {selectedTenantIds.size} Selected</>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default TrackPayments;
