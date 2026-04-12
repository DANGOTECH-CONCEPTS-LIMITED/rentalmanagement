import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  CircleDollarSign,
  Clock,
  Download,
  Search,
  TrendingUp,
  XCircle,
  Zap,
  CheckCircle,
} from "lucide-react";
import StatCard from "@/components/common/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCurrencyFormatter } from "@/hooks/use-currency-formatter";
import { useToast } from "@/hooks/use-toast";

interface UtilityMeter {
  id: number;
  meterType?: string | null;
  meterNumber: string;
  nwscAccount?: string | null;
  locationOfNwscMeter?: string | null;
  landLordId: number;
  dateCreated?: string;
  user?: {
    fullName?: string;
    email?: string;
  };
}

interface UtilityPayment {
  id: number;
  description?: string | null;
  transactionID?: string | null;
  reasonAtTelecom?: string | null;
  paymentMethod?: string | null;
  utilityType?: string | null;
  status?: string | null;
  vendorTranId?: string | null;
  amount: number;
  charges: number;
  createdAt?: string;
  phoneNumber?: string | null;
  meterNumber: string;
  isTokenGenerated?: boolean;
  token?: string | null;
  units?: string | null;
  vendor?: string | null;
  vendorPaymentDate?: string;
  utilityAccountNumber?: string | null;
  isSmsSent?: boolean;
}

interface StoredUser {
  token?: string;
}

interface SortConfig {
  key: keyof AdminTransactionRow;
  direction: "asc" | "desc";
}

interface AdminTransactionRow {
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
  token: string;
  units: string;
  vendor: string;
  vendorPaymentDate: string;
  utilityAccountNumber: string;
  isSmsSent: boolean;
  meterType: string;
  nwscAccount: string;
  locationOfNwscMeter: string;
  landlordName: string;
  landlordEmail: string;
}

const STATUS_COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2"];
const METHOD_COLORS = ["#0f766e", "#2563eb", "#f97316", "#7c3aed", "#16a34a", "#e11d48"];

const successfulStatuses = new Set([
  "SUCCESSFUL",
  "SUCCESSFUL AT TELECOM",
  "SUCCESSFUL AT THE BANK",
  "SUCCESSFUL AT TELCOM",
]);

const pendingStatuses = new Set([
  "PENDING",
  "PENDING AT TELCOM",
  "PENDING AT THE BANK",
]);

const failedStatuses = new Set([
  "FAILED",
  "FAILED AT TELECOM",
  "FAILED AT THE BANK",
]);

const rowsPerPage = 10;

const AdminUtilityDashboard = () => {
  const [utilityMeters, setUtilityMeters] = useState<UtilityMeter[]>([]);
  const [utilityPayments, setUtilityPayments] = useState<UtilityPayment[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [meterFilter, setMeterFilter] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [transactionIdFilter, setTransactionIdFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({
    key: "createdAt",
    direction: "desc",
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const formatCurrency = useCurrencyFormatter();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const getStoredUser = (): StoredUser | null => {
    const user = localStorage.getItem("user");
    if (!user) {
      return null;
    }

    try {
      return JSON.parse(user);
    } catch {
      return null;
    }
  };

  const normalizeStatus = (value?: string | null) => (value ?? "").trim().toUpperCase();

  const formatDate = (value?: string | null) => {
    if (!value) {
      return "-";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const escapeCsvCell = (value: string | number | boolean) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

  const isWithinRange = (value?: string | null) => {
    if (!startDate && !endDate) {
      return true;
    }

    if (!value) {
      return false;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return false;
    }

    const startBoundary = startDate ? new Date(`${startDate}T00:00:00`) : null;
    const endBoundary = endDate ? new Date(`${endDate}T23:59:59.999`) : null;

    if (startBoundary && date < startBoundary) {
      return false;
    }

    if (endBoundary && date > endBoundary) {
      return false;
    }

    return true;
  };

  useEffect(() => {
    const user = getStoredUser();

    if (!user?.token) {
      toast({
        title: "Error",
        description: "Admin session not found.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const [metersResponse, paymentsResponse] = await Promise.all([
          axios.get<UtilityMeter[]>(`${apiUrl}/GetAllUtilityMeters`, {
            headers: {
              Authorization: `Bearer ${user.token}`,
              accept: "*/*",
            },
          }),
          axios.get<UtilityPayment[]>(`${apiUrl}/GetAllUtilityPayments`, {
            headers: {
              Authorization: `Bearer ${user.token}`,
              accept: "*/*",
            },
          }),
        ]);

        setUtilityMeters(metersResponse.data ?? []);
        setUtilityPayments(paymentsResponse.data ?? []);
      } catch (error) {
        console.error("Failed to load admin utility dashboard data", error);
        toast({
          title: "Error",
          description: "Failed to load utility statistics for admin.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [apiUrl, toast]);

  const filteredMeters = useMemo(
    () => utilityMeters.filter((meter) => isWithinRange(meter.dateCreated)),
    [endDate, startDate, utilityMeters]
  );

  const filteredPayments = useMemo(
    () => utilityPayments.filter((payment) => isWithinRange(payment.createdAt)),
    [endDate, startDate, utilityPayments]
  );

  const meterLookup = useMemo(() => {
    const lookup = new Map<string, UtilityMeter>();
    filteredMeters.forEach((meter) => {
      if (meter.meterNumber) {
        lookup.set(meter.meterNumber, meter);
      }
    });
    return lookup;
  }, [filteredMeters]);

  const successfulPayments = useMemo(
    () => filteredPayments.filter((payment) => successfulStatuses.has(normalizeStatus(payment.status))),
    [filteredPayments]
  );

  const pendingPayments = useMemo(
    () => filteredPayments.filter((payment) => pendingStatuses.has(normalizeStatus(payment.status))),
    [filteredPayments]
  );

  const failedPayments = useMemo(
    () => filteredPayments.filter((payment) => failedStatuses.has(normalizeStatus(payment.status))),
    [filteredPayments]
  );

  const activeMeterNumbers = useMemo(
    () => new Set(filteredPayments.map((payment) => payment.meterNumber).filter(Boolean)),
    [filteredPayments]
  );

  const activeMeters = useMemo(
    () => filteredMeters.filter((meter) => activeMeterNumbers.has(meter.meterNumber)),
    [activeMeterNumbers, filteredMeters]
  );

  const stats = useMemo(
    () => ({
      totalMeters: filteredMeters.length,
      activeMeters: activeMeters.length,
      inactiveMeters: Math.max(filteredMeters.length - activeMeters.length, 0),
      totalPayments: filteredPayments.length,
      successfulPayments: successfulPayments.length,
      pendingPayments: pendingPayments.length,
      failedPayments: failedPayments.length,
      totalAmount: successfulPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0),
      totalCharges: successfulPayments.reduce((sum, payment) => sum + (payment.charges || 0), 0),
    }),
    [activeMeters.length, failedPayments.length, filteredMeters.length, filteredPayments.length, pendingPayments.length, successfulPayments]
  );

  const monthlyTrendData = useMemo(() => {
    const grouped = new Map<string, { label: string; payments: number; amount: number; charges: number }>();

    filteredPayments.forEach((payment) => {
      const date = payment.createdAt ? new Date(payment.createdAt) : null;
      if (!date || Number.isNaN(date.getTime())) {
        return;
      }

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      const current = grouped.get(key) ?? { label, payments: 0, amount: 0, charges: 0 };
      current.payments += 1;
      current.amount += payment.amount || 0;
      current.charges += payment.charges || 0;
      grouped.set(key, current);
    });

    return [...grouped.entries()]
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(([, value]) => value);
  }, [filteredPayments]);

  const statusChartData = useMemo(
    () => [
      { name: "Successful", value: successfulPayments.length },
      { name: "Pending", value: pendingPayments.length },
      { name: "Failed", value: failedPayments.length },
    ].filter((entry) => entry.value > 0),
    [failedPayments.length, pendingPayments.length, successfulPayments.length]
  );

  const paymentMethodChartData = useMemo(() => {
    const counts = new Map<string, number>();

    filteredPayments.forEach((payment) => {
      const method = payment.paymentMethod?.trim() || "Unknown";
      counts.set(method, (counts.get(method) ?? 0) + 1);
    });

    return [...counts.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((left, right) => right.value - left.value);
  }, [filteredPayments]);

  const statusOptions = useMemo(
    () =>
      Array.from(
        new Set(
          utilityPayments
            .map((payment) => payment.status?.trim())
            .filter((value): value is string => Boolean(value))
        )
      ).sort((left, right) => left.localeCompare(right)),
    [utilityPayments]
  );

  const paymentMethodOptions = useMemo(
    () =>
      Array.from(
        new Set(
          utilityPayments
            .map((payment) => payment.paymentMethod?.trim())
            .filter((value): value is string => Boolean(value))
        )
      ).sort((left, right) => left.localeCompare(right)),
    [utilityPayments]
  );

  const vendorOptions = useMemo(
    () =>
      Array.from(
        new Set(
          utilityPayments
            .map((payment) => payment.vendor?.trim())
            .filter((value): value is string => Boolean(value))
        )
      ).sort((left, right) => left.localeCompare(right)),
    [utilityPayments]
  );

  const topMetersData = useMemo(() => {
    const counts = new Map<string, { meterNumber: string; payments: number; amount: number }>();

    filteredPayments.forEach((payment) => {
      const key = payment.meterNumber || "Unknown";
      const current = counts.get(key) ?? { meterNumber: key, payments: 0, amount: 0 };
      current.payments += 1;
      current.amount += payment.amount || 0;
      counts.set(key, current);
    });

    return [...counts.values()]
      .sort((left, right) => right.payments - left.payments)
      .slice(0, 8);
  }, [filteredPayments]);

  const transactionRows = useMemo<AdminTransactionRow[]>(() => {
    return filteredPayments.map((payment) => {
      const meter = meterLookup.get(payment.meterNumber);

      return {
        id: payment.id,
        description: payment.description ?? "",
        transactionID: payment.transactionID ?? "",
        reasonAtTelecom: payment.reasonAtTelecom ?? "",
        paymentMethod: payment.paymentMethod ?? "",
        utilityType: payment.utilityType ?? "",
        status: payment.status ?? "",
        vendorTranId: payment.vendorTranId ?? "",
        amount: payment.amount ?? 0,
        charges: payment.charges ?? 0,
        createdAt: payment.createdAt ?? "",
        phoneNumber: payment.phoneNumber ?? "",
        meterNumber: payment.meterNumber ?? "",
        isTokenGenerated: Boolean(payment.isTokenGenerated),
        token: payment.token ?? "",
        units: payment.units ?? "",
        vendor: payment.vendor ?? "",
        vendorPaymentDate: payment.vendorPaymentDate ?? "",
        utilityAccountNumber: payment.utilityAccountNumber ?? "",
        isSmsSent: Boolean(payment.isSmsSent),
        meterType: meter?.meterType ?? "",
        nwscAccount: meter?.nwscAccount ?? "",
        locationOfNwscMeter: meter?.locationOfNwscMeter ?? "",
        landlordName: meter?.user?.fullName ?? "",
        landlordEmail: meter?.user?.email ?? "",
      };
    });
  }, [filteredPayments, meterLookup]);

  const filteredTransactionRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const normalizedPhone = phoneFilter.trim().toLowerCase();
    const normalizedMeter = meterFilter.trim().toLowerCase();
    const normalizedTransactionId = transactionIdFilter.trim().toLowerCase();

    return transactionRows.filter((row) => {
      if (statusFilter !== "all" && normalizeStatus(row.status) !== normalizeStatus(statusFilter)) {
        return false;
      }

      if (paymentMethodFilter !== "all" && row.paymentMethod !== paymentMethodFilter) {
        return false;
      }

      if (vendorFilter !== "all" && row.vendor !== vendorFilter) {
        return false;
      }

      if (normalizedPhone && !row.phoneNumber.toLowerCase().includes(normalizedPhone)) {
        return false;
      }

      if (normalizedMeter && !row.meterNumber.toLowerCase().includes(normalizedMeter)) {
        return false;
      }

      if (normalizedTransactionId && !row.transactionID.toLowerCase().includes(normalizedTransactionId)) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return Object.values(row).some((value) =>
        String(value ?? "").toLowerCase().includes(normalizedSearch)
      );
    });
  }, [
    meterFilter,
    paymentMethodFilter,
    phoneFilter,
    searchTerm,
    statusFilter,
    transactionIdFilter,
    transactionRows,
    vendorFilter,
  ]);

  const getSortValue = (row: AdminTransactionRow, key: keyof AdminTransactionRow) => {
    const value = row[key];

    if (typeof value === "number") {
      return value;
    }

    if (typeof value === "boolean") {
      return value ? 1 : 0;
    }

    if (key === "createdAt" || key === "vendorPaymentDate") {
      const time = value ? new Date(String(value)).getTime() : 0;
      return Number.isNaN(time) ? 0 : time;
    }

    return String(value ?? "").toLowerCase();
  };

  const sortedTransactionRows = useMemo(() => {
    if (!sortConfig) {
      return filteredTransactionRows;
    }

    return [...filteredTransactionRows].sort((left, right) => {
      const leftValue = getSortValue(left, sortConfig.key);
      const rightValue = getSortValue(right, sortConfig.key);

      if (leftValue < rightValue) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }

      if (leftValue > rightValue) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }

      return 0;
    });
  }, [filteredTransactionRows, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedTransactionRows.length / rowsPerPage));

  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return sortedTransactionRows.slice(startIndex, startIndex + rowsPerPage);
  }, [currentPage, sortedTransactionRows]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    endDate,
    meterFilter,
    paymentMethodFilter,
    phoneFilter,
    searchTerm,
    startDate,
    statusFilter,
    transactionIdFilter,
    vendorFilter,
  ]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const toggleSort = (key: keyof AdminTransactionRow) => {
    setSortConfig((current) => {
      if (!current || current.key !== key) {
        return { key, direction: "asc" };
      }

      if (current.direction === "asc") {
        return { key, direction: "desc" };
      }

      return null;
    });
  };

  const renderSortIcon = (key: keyof AdminTransactionRow) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="h-4 w-4" />;
    }

    return sortConfig.direction === "asc" ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setSearchTerm("");
    setStatusFilter("all");
    setPhoneFilter("");
    setMeterFilter("");
    setPaymentMethodFilter("all");
    setVendorFilter("all");
    setTransactionIdFilter("");
  };

  const exportTransactions = () => {
    if (sortedTransactionRows.length === 0) {
      return;
    }

    const headers = [
      "Id",
      "Description",
      "Transaction ID",
      "Reason At Telecom",
      "Payment Method",
      "Utility Type",
      "Status",
      "Vendor Transaction ID",
      "Amount",
      "Charges",
      "Created At",
      "Phone Number",
      "Meter Number",
      "Is Token Generated",
      "Token",
      "Units",
      "Vendor",
      "Vendor Payment Date",
      "Utility Account Number",
      "Is SMS Sent",
      "Meter Type",
      "NWSC Account",
      "Meter Location",
      "Landlord Name",
      "Landlord Email",
    ];

    const csvRows = [
      headers.map(escapeCsvCell).join(","),
      ...sortedTransactionRows.map((row) =>
        [
          row.id,
          row.description,
          row.transactionID,
          row.reasonAtTelecom,
          row.paymentMethod,
          row.utilityType,
          row.status,
          row.vendorTranId,
          row.amount,
          row.charges,
          formatDate(row.createdAt),
          row.phoneNumber,
          row.meterNumber,
          row.isTokenGenerated,
          row.token,
          row.units,
          row.vendor,
          formatDate(row.vendorPaymentDate),
          row.utilityAccountNumber,
          row.isSmsSent,
          row.meterType,
          row.nwscAccount,
          row.locationOfNwscMeter,
          row.landlordName,
          row.landlordEmail,
        ]
          .map(escapeCsvCell)
          .join(",")
      ),
    ];

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "admin-utility-transactions.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const cards = [
    { title: "Total Meters", value: stats.totalMeters, icon: <Zap className="h-6 w-6" /> },
    { title: "Active Meters", value: stats.activeMeters, icon: <CheckCircle className="h-6 w-6" /> },
    { title: "Inactive Meters", value: stats.inactiveMeters, icon: <Clock className="h-6 w-6" /> },
    { title: "Total Payments", value: stats.totalPayments, icon: <CircleDollarSign className="h-6 w-6" /> },
    { title: "Successful Payments", value: stats.successfulPayments, icon: <CheckCircle className="h-6 w-6" /> },
    { title: "Pending Payments", value: stats.pendingPayments, icon: <Clock className="h-6 w-6" /> },
    { title: "Failed Payments", value: stats.failedPayments, icon: <XCircle className="h-6 w-6" /> },
    { title: "Total Amount", value: formatCurrency(stats.totalAmount), icon: <TrendingUp className="h-6 w-6" /> },
  ];

  return (
    <div className="space-y-8">
      <section className="page-hero">
        <div className="space-y-3">
          <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Admin Utility Analytics
          </span>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Utility Dashboard</h1>
            <p className="mt-2 text-sm text-muted-foreground md:text-base">
              Monitor all utility payments across every meter, analyze payment patterns, and search the full transaction ledger from one admin-only view.
            </p>
          </div>
        </div>
      </section>

      <Card className="data-surface border-none shadow-none">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Limit analytics and transaction results to a specific period.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 xl:grid-cols-[repeat(2,minmax(0,0.8fr))_minmax(0,1.2fr)_auto]">
            <div className="space-y-2">
              <Label htmlFor="admin-utility-start-date">Start date</Label>
              <Input
                id="admin-utility-start-date"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                max={endDate || undefined}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-utility-end-date">End date</Label>
              <Input
                id="admin-utility-end-date"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                min={startDate || undefined}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-utility-search">Global search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="admin-utility-search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search any transaction field, meter, vendor, token, phone, or landlord"
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={clearFilters} className="w-full">
                Clear Filters
              </Button>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <div className="space-y-2">
              <Label htmlFor="admin-utility-status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="admin-utility-status-filter">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-utility-phone-filter">Phone number</Label>
              <Input
                id="admin-utility-phone-filter"
                value={phoneFilter}
                onChange={(event) => setPhoneFilter(event.target.value)}
                placeholder="Filter by phone number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-utility-meter-filter">Meter number</Label>
              <Input
                id="admin-utility-meter-filter"
                value={meterFilter}
                onChange={(event) => setMeterFilter(event.target.value)}
                placeholder="Filter by meter number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-utility-method-filter">Payment method</Label>
              <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                <SelectTrigger id="admin-utility-method-filter">
                  <SelectValue placeholder="All methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All methods</SelectItem>
                  {paymentMethodOptions.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-utility-vendor-filter">Vendor</Label>
              <Select value={vendorFilter} onValueChange={setVendorFilter}>
                <SelectTrigger id="admin-utility-vendor-filter">
                  <SelectValue placeholder="All vendors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All vendors</SelectItem>
                  {vendorOptions.map((vendor) => (
                    <SelectItem key={vendor} value={vendor}>
                      {vendor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-utility-transaction-filter">Transaction ID</Label>
              <Input
                id="admin-utility-transaction-filter"
                value={transactionIdFilter}
                onChange={(event) => setTransactionIdFilter(event.target.value)}
                placeholder="Filter by transaction ID"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="secondary">
              Period: {startDate || endDate ? `${startDate || "..."} to ${endDate || "..."}` : "All time"}
            </Badge>
            <Badge variant="outline">Meters: {filteredMeters.length}</Badge>
            <Badge variant="outline">Transactions: {filteredPayments.length}</Badge>
            <Badge variant="outline">Filtered rows: {filteredTransactionRows.length}</Badge>
            {statusFilter !== "all" && <Badge variant="outline">Status: {statusFilter}</Badge>}
            {phoneFilter && <Badge variant="outline">Phone: {phoneFilter}</Badge>}
            {meterFilter && <Badge variant="outline">Meter: {meterFilter}</Badge>}
            {paymentMethodFilter !== "all" && <Badge variant="outline">Method: {paymentMethodFilter}</Badge>}
            {vendorFilter !== "all" && <Badge variant="outline">Vendor: {vendorFilter}</Badge>}
            {transactionIdFilter && <Badge variant="outline">Transaction: {transactionIdFilter}</Badge>}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card className="data-surface border-none shadow-none">
          <CardContent className="py-10 text-sm text-muted-foreground">Loading admin utility dashboard...</CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <StatCard key={card.title} title={card.title} value={card.value} icon={card.icon} />
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="data-surface border-none shadow-none">
              <CardHeader>
                <CardTitle>Payment Trend</CardTitle>
                <CardDescription>Monthly transaction volume and successful amount collected.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis yAxisId="left" allowDecimals={false} />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="payments" fill="#2563eb" radius={[8, 8, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="amount" stroke="#0f766e" strokeWidth={3} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="data-surface border-none shadow-none">
              <CardHeader>
                <CardTitle>Status Breakdown</CardTitle>
                <CardDescription>Distribution of payment states in the active period.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        cx="50%"
                        cy="50%"
                        outerRadius={110}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell key={entry.name} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="data-surface border-none shadow-none">
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>Share of transactions by payment method.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentMethodChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={105}
                        dataKey="value"
                        nameKey="name"
                      >
                        {paymentMethodChartData.map((entry, index) => (
                          <Cell key={entry.name} fill={METHOD_COLORS[index % METHOD_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="data-surface border-none shadow-none">
              <CardHeader>
                <CardTitle>Top Meter Activity</CardTitle>
                <CardDescription>Most active meters by transaction count.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topMetersData} layout="vertical" margin={{ left: 12, right: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis type="category" dataKey="meterNumber" width={110} />
                      <Tooltip />
                      <Bar dataKey="payments" fill="#7c3aed" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="data-surface border-none shadow-none">
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <CardTitle>All Meter Transactions</CardTitle>
                  <CardDescription>
                    Search across every utility payment and inspect every transaction column in one place.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">Rows: {sortedTransactionRows.length}</Badge>
                  <Badge variant="outline">Page: {currentPage} / {totalPages}</Badge>
                  <Button variant="outline" onClick={exportTransactions} disabled={sortedTransactionRows.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {[
                        ["id", "ID"],
                        ["status", "Status"],
                        ["amount", "Amount"],
                        ["charges", "Charges"],
                        ["meterNumber", "Meter Number"],
                        ["meterType", "Meter Type"],
                        ["nwscAccount", "NWSC Account"],
                        ["locationOfNwscMeter", "Location"],
                        ["phoneNumber", "Phone Number"],
                        ["paymentMethod", "Payment Method"],
                        ["utilityType", "Utility Type"],
                        ["transactionID", "Transaction ID"],
                        ["vendorTranId", "Vendor Ref"],
                        ["vendor", "Vendor"],
                        ["description", "Description"],
                        ["reasonAtTelecom", "Reason At Telecom"],
                        ["units", "Units"],
                        ["token", "Token"],
                        ["utilityAccountNumber", "Utility Account Number"],
                        ["isTokenGenerated", "Token Generated"],
                        ["isSmsSent", "SMS Sent"],
                        ["createdAt", "Created"],
                        ["vendorPaymentDate", "Vendor Payment Date"],
                        ["landlordName", "Landlord"],
                        ["landlordEmail", "Landlord Email"],
                      ].map(([key, label]) => (
                        <TableHead key={key}>
                          <button
                            type="button"
                            className="flex items-center gap-1 whitespace-nowrap"
                            onClick={() => toggleSort(key as keyof AdminTransactionRow)}
                          >
                            {label}
                            {renderSortIcon(key as keyof AdminTransactionRow)}
                          </button>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedTransactionRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={25} className="py-10 text-center text-muted-foreground">
                          No utility transactions matched the current filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedRows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{row.id}</TableCell>
                          <TableCell>{row.status || "-"}</TableCell>
                          <TableCell>{formatCurrency(row.amount || 0)}</TableCell>
                          <TableCell>{formatCurrency(row.charges || 0)}</TableCell>
                          <TableCell className="font-medium">{row.meterNumber || "-"}</TableCell>
                          <TableCell>{row.meterType || "-"}</TableCell>
                          <TableCell>{row.nwscAccount || "-"}</TableCell>
                          <TableCell>{row.locationOfNwscMeter || "-"}</TableCell>
                          <TableCell>{row.phoneNumber || "-"}</TableCell>
                          <TableCell>{row.paymentMethod || "-"}</TableCell>
                          <TableCell>{row.utilityType || "-"}</TableCell>
                          <TableCell>{row.transactionID || "-"}</TableCell>
                          <TableCell>{row.vendorTranId || "-"}</TableCell>
                          <TableCell>{row.vendor || "-"}</TableCell>
                          <TableCell>{row.description || "-"}</TableCell>
                          <TableCell>{row.reasonAtTelecom || "-"}</TableCell>
                          <TableCell>{row.units || "-"}</TableCell>
                          <TableCell>{row.token || "-"}</TableCell>
                          <TableCell>{row.utilityAccountNumber || "-"}</TableCell>
                          <TableCell>{row.isTokenGenerated ? "Yes" : "No"}</TableCell>
                          <TableCell>{row.isSmsSent ? "Yes" : "No"}</TableCell>
                          <TableCell>{formatDate(row.createdAt)}</TableCell>
                          <TableCell>{formatDate(row.vendorPaymentDate)}</TableCell>
                          <TableCell>{row.landlordName || "-"}</TableCell>
                          <TableCell>{row.landlordEmail || "-"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {sortedTransactionRows.length > rowsPerPage && (
                <div className="mt-4 flex justify-end">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default AdminUtilityDashboard;