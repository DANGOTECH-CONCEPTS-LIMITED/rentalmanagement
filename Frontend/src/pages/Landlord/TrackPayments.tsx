import { useState, useEffect } from "react";
import {
  CircleDollarSign,
  Calendar,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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

const SMS_ENDPOINT = "http://3.216.182.63:8091/sendSingleSms";
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

const TrackPayments = () => {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMethod, setFilterMethod] = useState("all");
  const [sortField, setSortField] = useState("paymentDate");
  const [sortDirection, setSortDirection] = useState("desc");

  // SMS state
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
        headers: {
          Authorization: `Bearer ${token}`,
          accept: "*/*",
        },
      });

      if (!response.ok) throw new Error("Failed to fetch payments");

      const data = await response.json();
      const filteredData = data.filter(
        (payment: any) => payment.propertyTenant.property.ownerId === userData.id
      );
      setPayments(filteredData);
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
    const res = await fetch(SMS_ENDPOINT, {
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

  // Deduplicate pending payments by tenant (one entry per tenant)
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
    const targets = pendingByTenant.filter((p) =>
      selectedTenantIds.has(p.propertyTenantId)
    );
    if (targets.length === 0) return;

    setIsSendingReminders(true);
    let sent = 0;
    let failed = 0;

    for (const p of targets) {
      const msg =
        `Dear ${p.propertyTenant.fullName}, your rent payment of UGX ${p.amount.toLocaleString()} ` +
        `for ${p.propertyTenant.property.name} is currently pending. Please make your payment at your ` +
        `earliest convenience. Thank you.`;
      try {
        await sendSms(p.propertyTenant.phoneNumber, msg, "Rent Payment Reminder");
        sent++;
      } catch {
        failed++;
      }
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
      await sendSms(
        payment.propertyTenant.phoneNumber,
        msg,
        "Payment Acknowledgment"
      );
      toast({
        title: "Acknowledgment Sent",
        description: `SMS sent to ${payment.propertyTenant.fullName}.`,
      });
    } catch {
      toast({
        title: "SMS Failed",
        description: "Could not send acknowledgment. Check the phone number.",
        variant: "destructive",
      });
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
    toast({
      title: "Receipt Generated",
      description: `Receipt for ${payment.transactionId} downloaded.`,
    });
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
      const dateA = new Date(a.paymentDate).getTime();
      const dateB = new Date(b.paymentDate).getTime();
      return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
    } else if (sortField === "amount") {
      return sortDirection === "asc" ? a.amount - b.amount : b.amount - a.amount;
    } else if (sortField === "tenant") {
      return sortDirection === "asc"
        ? a.propertyTenant.fullName.localeCompare(b.propertyTenant.fullName)
        : b.propertyTenant.fullName.localeCompare(a.propertyTenant.fullName);
    }
    return 0;
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUCCESSFUL":
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case "PENDING":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "FAILED":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case "CASH": return <Badge variant="secondary">Cash</Badge>;
      case "MOMO": return <Badge variant="secondary">Mobile Money</Badge>;
      case "BANK": return <Badge variant="secondary">Bank Transfer</Badge>;
      case "CARD": return <Badge variant="secondary">Credit Card</Badge>;
      default: return <Badge variant="outline">{method}</Badge>;
    }
  };

  const totalReceived = payments
    .filter((p) => p.paymentStatus === "SUCCESSFUL")
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPending = payments
    .filter((p) => p.paymentStatus === "PENDING")
    .reduce((sum, p) => sum + p.amount, 0);

  const SortIcon = ({ field }: { field: string }) =>
    sortField === field ? (
      sortDirection === "asc" ? (
        <ArrowUp className="ml-1 h-3 w-3 inline" />
      ) : (
        <ArrowDown className="ml-1 h-3 w-3 inline" />
      )
    ) : null;

  const columns: Column<Payment>[] = [
    {
      key: "transactionId",
      header: "Transaction ID",
      headerClassName: "w-[120px]",
      cell: (row) => <span className="font-medium">{row.transactionId}</span>,
    },
    {
      key: "tenant",
      header: "Tenant",
      cell: (row) => (
        <button
          className="cursor-pointer text-left flex items-center"
          onClick={() => handleSort("tenant")}
        >
          {row.propertyTenant.fullName}
          <SortIcon field="tenant" />
        </button>
      ),
    },
    {
      key: "property",
      header: "Property",
      cell: (row) => row.propertyTenant.property.name,
    },
    {
      key: "amount",
      header: "Amount",
      headerClassName: "text-right",
      className: "text-right",
      cell: (row) => (
        <button
          className="cursor-pointer w-full text-right flex items-center justify-end"
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
          className="cursor-pointer text-left flex items-center"
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
      cell: (row) => getMethodBadge(row.paymentMethod),
    },
    {
      key: "vendor",
      header: "Received By",
      cell: (row) =>
        row.vendor ? (
          <span className="flex items-center gap-1.5 text-sm">
            <User className="h-3 w-3 text-muted-foreground" />
            {row.vendor}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      key: "paymentStatus",
      header: "Status",
      cell: (row) => getStatusBadge(row.paymentStatus),
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "text-right",
      className: "text-right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          {row.paymentStatus === "SUCCESSFUL" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-emerald-600 hover:text-emerald-800"
              disabled={sendingAckId === row.id}
              onClick={() => handleSendAcknowledgment(row)}
            >
              {sendingAckId === row.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MessageSquare className="h-4 w-4" />
              )}
              <span className="ml-1.5 hidden sm:inline">Acknowledge</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-blue-600 hover:text-blue-800"
            onClick={() => generateReceipt(row)}
          >
            <DownloadIcon className="h-4 w-4" />
            <span className="ml-1.5 hidden sm:inline">Receipt</span>
          </Button>
        </div>
      ),
    },
  ];

  const filterControls = (
    <div className="flex items-center gap-2">
      <Filter className="h-4 w-4 text-muted-foreground" />
      <select
        className="input-field h-9 py-1 text-sm"
        value={filterStatus}
        onChange={(e) => setFilterStatus(e.target.value)}
      >
        <option value="all">All Status</option>
        <option value="SUCCESSFUL">Successful</option>
        <option value="PENDING">Pending</option>
        <option value="FAILED">Failed</option>
      </select>
      <select
        className="input-field h-9 py-1 text-sm"
        value={filterMethod}
        onChange={(e) => setFilterMethod(e.target.value)}
      >
        <option value="all">All Methods</option>
        <option value="CASH">Cash</option>
        <option value="MOMO">Mobile Money</option>
        <option value="BANK">Bank Transfer</option>
        <option value="CARD">Credit Card</option>
      </select>
    </div>
  );

  return (
    <div className="space-y-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Track Payments</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <section className="page-hero">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Payment Monitoring
            </span>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                Payment Tracking
              </h1>
              <p className="mt-2 text-muted-foreground">
                View and manage all payment transactions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pendingByTenant.length > 0 && (
              <Button
                variant="outline"
                className="flex items-center gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
                onClick={() => {
                  setSelectedTenantIds(new Set(pendingByTenant.map((p) => p.propertyTenantId)));
                  setShowReminderDialog(true);
                }}
              >
                <Bell className="h-4 w-4" />
                Send Reminders
                <Badge className="ml-1 bg-amber-100 text-amber-700 text-xs px-1.5">
                  {pendingByTenant.length}
                </Badge>
              </Button>
            )}
            <Button onClick={handleExport} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Received</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">UGX {totalReceived.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {payments.filter((p) => p.paymentStatus === "SUCCESSFUL").length} completed payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">UGX {totalPending.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {payments.filter((p) => p.paymentStatus === "PENDING").length} payments awaiting
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Payments</CardTitle>
            <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              UGX{" "}
              {payments
                .filter((p) => p.paymentMethod === "CASH" && p.paymentStatus === "SUCCESSFUL")
                .reduce((sum, p) => sum + p.amount, 0)
                .toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {payments.filter((p) => p.paymentMethod === "CASH").length} cash transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Auto-acknowledge toggle */}
      <Card className="border border-dashed border-emerald-200 bg-emerald-50/40">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-emerald-100 p-2">
                <BellRing className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">
                  Automatic Payment Acknowledgment SMS
                </p>
                <p className="text-xs text-muted-foreground">
                  Send an SMS to tenants automatically when their payment is confirmed
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="auto-ack" className="text-sm text-muted-foreground">
                {autoAcknowledge ? "On" : "Off"}
              </Label>
              <Switch
                id="auto-ack"
                checked={autoAcknowledge}
                onCheckedChange={handleAutoAcknowledgeToggle}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments table */}
      <Card className="data-surface border-none shadow-none">
        <CardHeader>
          <CardDescription>
            Filter and search all payment transactions. Use the{" "}
            <MessageSquare className="inline h-3 w-3" /> Acknowledge button on successful
            payments to send a receipt SMS to the tenant.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={sortedPayments}
            columns={columns}
            loading={isLoading}
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search by tenant, property, transaction ID, or received by"
            label="payment"
            emptyMessage="No payments found"
            emptyIcon={<CircleDollarSign className="h-12 w-12" />}
            headerRight={filterControls}
          />
        </CardContent>
      </Card>

      {/* Bulk SMS Reminder Dialog */}
      <Dialog open={showReminderDialog} onOpenChange={setShowReminderDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-500" />
              Send Overdue Payment Reminders
            </DialogTitle>
            <DialogDescription>
              Select tenants to notify via SMS about their pending payments.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground">
              {pendingByTenant.length} tenant{pendingByTenant.length !== 1 ? "s" : ""} with pending payments
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={handleSelectAll}
            >
              {selectedTenantIds.size === pendingByTenant.length ? "Deselect All" : "Select All"}
            </Button>
          </div>

          <Separator />

          <div className="overflow-y-auto flex-1 space-y-1 py-2">
            {pendingByTenant.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                No pending payments found.
              </p>
            ) : (
              pendingByTenant.map((p) => (
                <label
                  key={p.propertyTenantId}
                  className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/50 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedTenantIds.has(p.propertyTenantId)}
                    onCheckedChange={() => handleToggleTenant(p.propertyTenantId)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate">
                        {p.propertyTenant.fullName}
                      </span>
                      <span className="text-sm font-semibold text-amber-700 shrink-0">
                        UGX {p.amount.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
                      <div>{p.propertyTenant.property.name}</div>
                      <div>{p.propertyTenant.phoneNumber}</div>
                    </div>
                  </div>
                </label>
              ))
            )}
          </div>

          <Separator />

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowReminderDialog(false)}
              disabled={isSendingReminders}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendBulkReminders}
              disabled={selectedTenantIds.size === 0 || isSendingReminders}
              className="gap-2"
            >
              {isSendingReminders ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send to {selectedTenantIds.size} Selected
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TrackPayments;
