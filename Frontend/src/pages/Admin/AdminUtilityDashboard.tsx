import { useEffect, useMemo, useRef, useState } from "react";
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
  AlertTriangle,
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Clock,
  Download,
  Loader2,
  Search,
  TrendingUp,
  XCircle,
  Zap,
  CheckCircle,
} from "lucide-react";
import DashboardExportToolbar from "@/components/common/DashboardExportToolbar";
import { DataTable } from "@/components/ui/data-table";
import { useCurrencyFormatter } from "@/hooks/use-currency-formatter";
import { useToast } from "@/hooks/use-toast";
import { formatDateDmy, formatDateTimeDmy } from "@/lib/date-time";
import {
  exportDashboardPdf,
  exportDashboardWorkbook,
} from "@/lib/dashboard-export";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const inputCls =
  "h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] shadow-sm outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10";
const selCls =
  "h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-sm text-[#0F172A] shadow-sm outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 cursor-pointer";

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

interface SystemRole {
  id: number;
  name?: string;
}

interface ApiUser {
  id: string;
  fullName: string;
  email: string;
  systemRoleId: number;
  systemRole?: SystemRole;
}

type DetailViewKey =
  | "totalMeters"
  | "activeMeters"
  | "inactiveMeters"
  | "overdueMeters"
  | "totalPayments"
  | "successfulPayments"
  | "pendingPayments"
  | "failedPayments"
  | "totalAmount"
  | "totalCharges"
  | "meterPayments"
  | null;

interface SortConfig {
  key: keyof AdminTransactionRow;
  direction: "asc" | "desc";
}

interface DetailSortConfig {
  key: string;
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

const ALL_ACCOUNT_VALUE = "__all_accounts__";
const rowsPerPage = 10;
const detailRowsPerPage = 10;

const AdminUtilityDashboard = () => {
  const dashboardRef = useRef<HTMLDivElement>(null);
  const paymentTrendChartRef = useRef<HTMLDivElement>(null);
  const statusBreakdownChartRef = useRef<HTMLDivElement>(null);
  const paymentMethodsChartRef = useRef<HTMLDivElement>(null);
  const topMeterActivityChartRef = useRef<HTMLDivElement>(null);
  const [selectableUsers, setSelectableUsers] = useState<ApiUser[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState(ALL_ACCOUNT_VALUE);
  const [accountPickerOpen, setAccountPickerOpen] = useState(false);
  const [accountPickerSearch, setAccountPickerSearch] = useState("");
  const [utilityMeters, setUtilityMeters] = useState<UtilityMeter[]>([]);
  const [utilityPayments, setUtilityPayments] = useState<UtilityPayment[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [meterFilter, setMeterFilter] = useState("");
  const [activeDetailView, setActiveDetailView] = useState<DetailViewKey>(null);
  const [detailSearchTerm, setDetailSearchTerm] = useState("");
  const [currentDetailPage, setCurrentDetailPage] = useState(1);
  const [detailSort, setDetailSort] = useState<DetailSortConfig | null>(null);
  const [selectedMeterNumber, setSelectedMeterNumber] = useState("");
  const [previousDetailView, setPreviousDetailView] = useState<DetailViewKey>(null);
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

  const normalizeRoleName = (value?: string | null) =>
    (value ?? "").trim().toLowerCase();

  const isSelectableUser = (user: ApiUser) => {
    const normalizedRole = normalizeRoleName(user.systemRole?.name);
    return (
      user.systemRoleId === 2 ||
      user.systemRoleId === 4 ||
      normalizedRole === "landlord" ||
      normalizedRole === "utility payment" ||
      normalizedRole === "utililty payment"
    );
  };

  const getRoleLabel = (user: ApiUser) => {
    if (user.systemRoleId === 2) {
      return "Landlord";
    }

    if (user.systemRoleId === 4) {
      return "Utility";
    }

    const normalizedRole = normalizeRoleName(user.systemRole?.name);
    if (normalizedRole === "utility payment" || normalizedRole === "utililty payment") {
      return "Utility";
    }

    if (normalizedRole === "landlord") {
      return "Landlord";
    }

    return "User";
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

  const selectedAccount = useMemo(
    () =>
      selectedAccountId === ALL_ACCOUNT_VALUE
        ? null
        : selectableUsers.find((user) => String(user.id) === selectedAccountId) ?? null,
    [selectableUsers, selectedAccountId]
  );

  const selectedScopeLabel = selectedAccount
    ? `${selectedAccount.fullName} (${getRoleLabel(selectedAccount)})`
    : "All landlord and utility accounts";

  const fetchSelectableUsers = async (token: string) => {
    setIsLoadingUsers(true);

    try {
      const response = await axios.get<ApiUser[]>(`${apiUrl}/GetAllUsers`, {
        headers: {
          Authorization: `Bearer ${token}`,
          accept: "*/*",
        },
      });

      const users = (response.data ?? [])
        .filter(isSelectableUser)
        .sort((left, right) => left.fullName.localeCompare(right.fullName));

      setSelectableUsers(users);
      setSelectedAccountId((currentSelection) => {
        if (currentSelection === ALL_ACCOUNT_VALUE) {
          return currentSelection;
        }

        const hasCurrentSelection = users.some(
          (user) => String(user.id) === currentSelection
        );

        return hasCurrentSelection ? currentSelection : ALL_ACCOUNT_VALUE;
      });
    } catch (error) {
      console.error("Failed to load selectable utility dashboard users", error);
      toast({
        title: "Error",
        description: "Failed to load landlords and utility users.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchDashboardData = async (token: string, accountId: string) => {
    setIsLoading(true);

    const loadAllRecords = accountId === ALL_ACCOUNT_VALUE;
    const metersUrl = loadAllRecords
      ? `${apiUrl}/GetAllUtilityMeters`
      : `${apiUrl}/GetUtilityMetersByLandLordId/${accountId}`;
    const paymentsUrl = loadAllRecords
      ? `${apiUrl}/GetAllUtilityPayments`
      : `${apiUrl}/GetUtilityPaymentsByLandlordIdAsync/${accountId}`;

    try {
      const [metersResponse, paymentsResponse] = await Promise.all([
        axios.get<UtilityMeter[]>(metersUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
            accept: "*/*",
          },
        }),
        axios.get<UtilityPayment[]>(paymentsUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
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
        description: loadAllRecords
          ? "Failed to load utility statistics for admin."
          : "Failed to load utility statistics for the selected account.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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

    fetchSelectableUsers(user.token);
  }, [apiUrl, toast]);

  useEffect(() => {
    const user = getStoredUser();

    if (!user?.token) {
      return;
    }

    fetchDashboardData(user.token, selectedAccountId);
  }, [apiUrl, selectedAccountId, toast]);

  useEffect(() => {
    setActiveDetailView(null);
    setDetailSearchTerm("");
    setCurrentDetailPage(1);
    setDetailSort(null);
    setSelectedMeterNumber("");
    setPreviousDetailView(null);
    setAccountPickerOpen(false);
  }, [selectedAccountId]);

  useEffect(() => {
    setDetailSearchTerm("");
    setCurrentDetailPage(1);
    setDetailSort(null);
  }, [activeDetailView]);

  useEffect(() => {
    setCurrentDetailPage(1);
  }, [detailSearchTerm]);

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

  const inactiveMeters = useMemo(
    () => filteredMeters.filter((meter) => !activeMeterNumbers.has(meter.meterNumber)),
    [activeMeterNumbers, filteredMeters]
  );

  const overdueMeters = useMemo(() => {
    const latestSuccessfulPaymentByMeter = new Map<string, number>();

    utilityPayments.forEach((payment) => {
      if (!payment.meterNumber || !successfulStatuses.has(normalizeStatus(payment.status))) {
        return;
      }

      const timestamp = payment.createdAt ? new Date(payment.createdAt).getTime() : Number.NaN;
      if (Number.isNaN(timestamp)) {
        return;
      }

      const currentLatest = latestSuccessfulPaymentByMeter.get(payment.meterNumber) ?? 0;
      if (timestamp > currentLatest) {
        latestSuccessfulPaymentByMeter.set(payment.meterNumber, timestamp);
      }
    });

    const overdueThreshold = Date.now() - 30 * 24 * 60 * 60 * 1000;

    return filteredMeters.filter((meter) => {
      const latestPaymentTimestamp = latestSuccessfulPaymentByMeter.get(meter.meterNumber);
      return !latestPaymentTimestamp || latestPaymentTimestamp < overdueThreshold;
    });
  }, [filteredMeters, utilityPayments]);

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

  const sortedPayments = useMemo(
    () =>
      [...filteredPayments].sort(
        (left, right) =>
          new Date(right.createdAt ?? 0).getTime() -
          new Date(left.createdAt ?? 0).getTime()
      ),
    [filteredPayments]
  );

  const selectedMeterPayments = useMemo(
    () =>
      sortedPayments.filter(
        (payment) => payment.meterNumber === selectedMeterNumber
      ),
    [selectedMeterNumber, sortedPayments]
  );

  const openMeterPayments = (meterNumber: string) => {
    setPreviousDetailView(activeDetailView);
    setSelectedMeterNumber(meterNumber);
    setActiveDetailView("meterPayments");
  };

  const returnToPreviousView = () => {
    setActiveDetailView(previousDetailView);
    setSelectedMeterNumber("");
    setPreviousDetailView(null);
  };

  const detailContent = useMemo(() => {
    switch (activeDetailView) {
      case "totalMeters":
        return {
          title: "All Meters",
          description: "All utility meters in the selected scope and period.",
          type: "meters" as const,
          rows: filteredMeters,
        };
      case "activeMeters":
        return {
          title: "Active Meters",
          description: "Meters that have at least one payment in the selected scope and period.",
          type: "meters" as const,
          rows: activeMeters,
        };
      case "inactiveMeters":
        return {
          title: "Inactive Meters",
          description: "Meters with no payments in the selected scope and period.",
          type: "meters" as const,
          rows: inactiveMeters,
        };
      case "overdueMeters":
        return {
          title: "Meters Over 30 Days Without Payment",
          description: "Meters with no successful payment recorded in the last 30 days.",
          type: "meters" as const,
          rows: overdueMeters,
        };
      case "totalPayments":
        return {
          title: "All Payments",
          description: "All utility payment transactions in the selected scope and period.",
          type: "payments" as const,
          rows: sortedPayments,
        };
      case "successfulPayments":
        return {
          title: "Successful Payments",
          description: "Transactions counted toward total amount and charges.",
          type: "payments" as const,
          rows: successfulPayments,
        };
      case "pendingPayments":
        return {
          title: "Pending Payments",
          description: "Transactions still waiting for final confirmation.",
          type: "payments" as const,
          rows: pendingPayments,
        };
      case "failedPayments":
        return {
          title: "Failed Payments",
          description: "Transactions that failed in the selected scope and period.",
          type: "payments" as const,
          rows: failedPayments,
        };
      case "totalAmount":
        return {
          title: "Payments Contributing to Total Amount",
          description: "Successful transactions included in the total amount figure.",
          type: "payments" as const,
          rows: successfulPayments,
        };
      case "totalCharges":
        return {
          title: "Payments Contributing to Total Charges",
          description: "Successful transactions included in the total charges figure.",
          type: "payments" as const,
          rows: successfulPayments,
        };
      case "meterPayments":
        return {
          title: `Payments for Meter ${selectedMeterNumber}`,
          description: "All transactions related to the selected meter in the active scope and period.",
          type: "payments" as const,
          rows: selectedMeterPayments,
        };
      default:
        return null;
    }
  }, [
    activeDetailView,
    activeMeters,
    failedPayments,
    filteredMeters,
    inactiveMeters,
    overdueMeters,
    pendingPayments,
    selectedMeterNumber,
    selectedMeterPayments,
    sortedPayments,
    successfulPayments,
  ]);

  const detailGetSortValue = (row: UtilityMeter | UtilityPayment, key: string) => {
    const value = row[key as keyof typeof row];

    if (typeof value === "number") {
      return value;
    }

    if (key === "createdAt" || key === "dateCreated" || key === "vendorPaymentDate") {
      if (!value) {
        return 0;
      }

      const time = new Date(String(value)).getTime();
      return Number.isNaN(time) ? 0 : time;
    }

    return String(value ?? "").toLowerCase();
  };

  const toggleDetailSort = (key: string) => {
    setCurrentDetailPage(1);
    setDetailSort((currentSort) => {
      if (!currentSort || currentSort.key !== key) {
        return { key, direction: "asc" };
      }

      if (currentSort.direction === "asc") {
        return { key, direction: "desc" };
      }

      return null;
    });
  };

  const renderDetailSortIcon = (key: string) => {
    if (!detailSort || detailSort.key !== key) {
      return <ArrowUpDown className="h-4 w-4" />;
    }

    return detailSort.direction === "asc" ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  const filteredDetailRows = useMemo(() => {
    if (!detailContent) {
      return [];
    }

    const normalizedSearch = detailSearchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return detailContent.rows;
    }

    if (detailContent.type === "meters") {
      return detailContent.rows.filter((meter) =>
        [
          meter.meterNumber,
          meter.meterType,
          meter.nwscAccount,
          meter.locationOfNwscMeter,
          meter.user?.fullName,
          formatDateDmy(meter.dateCreated),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch))
      );
    }

    return detailContent.rows.filter((payment) =>
      [
        payment.status,
        payment.meterNumber,
        payment.phoneNumber,
        payment.transactionID,
        payment.vendorTranId,
        payment.vendor,
        payment.utilityType,
        payment.description,
        formatDateTimeDmy(payment.createdAt),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch))
    );
  }, [detailContent, detailSearchTerm]);

  const sortedDetailRows = useMemo(() => {
    if (!detailSort) {
      return filteredDetailRows;
    }

    return [...filteredDetailRows].sort((left, right) => {
      const leftValue = detailGetSortValue(left, detailSort.key);
      const rightValue = detailGetSortValue(right, detailSort.key);

      if (leftValue < rightValue) {
        return detailSort.direction === "asc" ? -1 : 1;
      }

      if (leftValue > rightValue) {
        return detailSort.direction === "asc" ? 1 : -1;
      }

      return 0;
    });
  }, [detailSort, filteredDetailRows]);

  const totalDetailPages = Math.max(
    1,
    Math.ceil(sortedDetailRows.length / detailRowsPerPage)
  );

  const paginatedDetailRows = useMemo(() => {
    const startIndex = (currentDetailPage - 1) * detailRowsPerPage;
    return sortedDetailRows.slice(startIndex, startIndex + detailRowsPerPage);
  }, [currentDetailPage, sortedDetailRows]);

  const paginatedMeterRows =
    detailContent?.type === "meters"
      ? (paginatedDetailRows as UtilityMeter[])
      : [];

  const paginatedPaymentRows =
    detailContent?.type === "payments"
      ? (paginatedDetailRows as UtilityPayment[])
      : [];

  useEffect(() => {
    if (currentDetailPage > totalDetailPages) {
      setCurrentDetailPage(totalDetailPages);
    }
  }, [currentDetailPage, totalDetailPages]);

  const exportDetailRows = () => {
    if (!detailContent || filteredDetailRows.length === 0) {
      return;
    }

    const fileName = `${detailContent.title.toLowerCase().replace(/\s+/g, "-")}.csv`;
    let csvRows: string[] = [];

    if (detailContent.type === "meters") {
      csvRows = [
        [
          "Meter Number",
          "Type",
          "NWSC Account",
          "Location",
          "User",
          "Created",
        ].map(escapeCsvCell).join(","),
        ...filteredDetailRows.map((meter) =>
          [
            meter.meterNumber,
            meter.meterType || "",
            meter.nwscAccount || "",
            meter.locationOfNwscMeter || "",
            meter.user?.fullName || "",
            formatDateDmy(meter.dateCreated),
          ]
            .map(escapeCsvCell)
            .join(",")
        ),
      ];
    } else {
      csvRows = [
        [
          "Status",
          "Amount",
          "Charges",
          "Meter",
          "Phone",
          "Transaction ID",
          "Vendor Ref",
          "Created",
        ].map(escapeCsvCell).join(","),
        ...filteredDetailRows.map((payment) =>
          [
            payment.status || "",
            payment.amount || 0,
            payment.charges || 0,
            payment.meterNumber || "",
            payment.phoneNumber || "",
            payment.transactionID || "",
            payment.vendorTranId || "",
            formatDateTimeDmy(payment.createdAt),
          ]
            .map(escapeCsvCell)
            .join(",")
        ),
      ];
    }

    const blob = new Blob([csvRows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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
    selectedAccountId,
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
          formatDateTimeDmy(row.createdAt),
          row.phoneNumber,
          row.meterNumber,
          row.isTokenGenerated,
          row.token,
          row.units,
          row.vendor,
          formatDateTimeDmy(row.vendorPaymentDate),
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
    { key: "totalMeters" as const, title: "Total Meters", value: stats.totalMeters, icon: <Zap className="h-5 w-5" />, color: "blue" },
    { key: "activeMeters" as const, title: "Active Meters", value: stats.activeMeters, icon: <CheckCircle className="h-5 w-5" />, color: "emerald" },
    { key: "inactiveMeters" as const, title: "Inactive Meters", value: stats.inactiveMeters, icon: <Clock className="h-5 w-5" />, color: "amber" },
    { key: "overdueMeters" as const, title: "30+ Days Without Payment", value: overdueMeters.length, icon: <AlertTriangle className="h-5 w-5" />, color: "red" },
    { key: "totalPayments" as const, title: "Total Payments", value: stats.totalPayments, icon: <CircleDollarSign className="h-5 w-5" />, color: "blue" },
    { key: "successfulPayments" as const, title: "Successful Payments", value: stats.successfulPayments, icon: <CheckCircle className="h-5 w-5" />, color: "emerald" },
    { key: "pendingPayments" as const, title: "Pending Payments", value: stats.pendingPayments, icon: <Clock className="h-5 w-5" />, color: "amber" },
    { key: "failedPayments" as const, title: "Failed Payments", value: stats.failedPayments, icon: <XCircle className="h-5 w-5" />, color: "red" },
    { key: "totalAmount" as const, title: "Total Amount", value: formatCurrency(stats.totalAmount), icon: <TrendingUp className="h-5 w-5" />, color: "violet" },
    { key: "totalCharges" as const, title: "Total Charges", value: formatCurrency(stats.totalCharges), icon: <CircleDollarSign className="h-5 w-5" />, color: "indigo" },
  ];

  const cardColorMap: Record<string, { border: string; bg: string; text: string }> = {
    blue:    { border: "border-l-blue-500",    bg: "bg-blue-50",    text: "text-blue-600" },
    emerald: { border: "border-l-emerald-500", bg: "bg-emerald-50", text: "text-emerald-600" },
    amber:   { border: "border-l-amber-500",   bg: "bg-amber-50",   text: "text-amber-600" },
    red:     { border: "border-l-red-500",     bg: "bg-red-50",     text: "text-red-600" },
    violet:  { border: "border-l-violet-500",  bg: "bg-violet-50",  text: "text-violet-600" },
    indigo:  { border: "border-l-indigo-500",  bg: "bg-indigo-50",  text: "text-indigo-600" },
  };

  const statusBadge = (status: string | undefined | null) => {
    const s = (status ?? "").trim().toUpperCase();
    if (successfulStatuses.has(s))
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
          <CheckCircle className="h-3 w-3" /> {status}
        </span>
      );
    if (pendingStatuses.has(s))
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
          <Clock className="h-3 w-3" /> {status}
        </span>
      );
    if (failedStatuses.has(s))
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
          <XCircle className="h-3 w-3" /> {status}
        </span>
      );
    return (
      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
        {status || "—"}
      </span>
    );
  };

  const handleExportPdf = async () => {
    if (!dashboardRef.current) {
      return;
    }

    try {
      await exportDashboardPdf(dashboardRef.current, {
        fileNamePrefix: "admin-utility-dashboard",
      });

      toast({
        title: "Export Successful",
        description: "Dashboard exported to PDF.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export dashboard to PDF.",
        variant: "destructive",
      });
    }
  };

  const handleExportExcel = async () => {
    try {
      const detailSection = detailContent
        ? {
            sheetName: detailContent.title,
            columns:
              detailContent.type === "meters"
                ? ["Meter Number", "Type", "NWSC Account", "Location", "Landlord", "Created"]
                : ["Status", "Amount", "Charges", "Meter", "Phone", "Transaction ID", "Vendor Ref", "Created"],
            rows:
              detailContent.type === "meters"
                ? filteredDetailRows.map((meter) => [
                    meter.meterNumber,
                    meter.meterType || "",
                    meter.nwscAccount || "",
                    meter.locationOfNwscMeter || "",
                    meter.user?.fullName || "",
                    formatDateDmy(meter.dateCreated),
                  ])
                : filteredDetailRows.map((payment) => [
                    payment.status || "",
                    payment.amount || 0,
                    payment.charges || 0,
                    payment.meterNumber || "",
                    payment.phoneNumber || "",
                    payment.transactionID || "",
                    payment.vendorTranId || "",
                    formatDateTimeDmy(payment.createdAt),
                  ]),
          }
        : null;

      await exportDashboardWorkbook({
        title: "Admin Utility Dashboard",
        fileNamePrefix: "admin-utility-dashboard",
        metadata: [
          { label: "Scope", value: selectedScopeLabel },
          { label: "Date Range", value: startDate || endDate ? `${startDate || "..."} to ${endDate || "..."}` : "All time" },
          { label: "Status Filter", value: statusFilter },
          { label: "Payment Method Filter", value: paymentMethodFilter },
          { label: "Vendor Filter", value: vendorFilter },
        ],
        summary: [
          { label: "Total Meters", value: stats.totalMeters },
          { label: "Active Meters", value: stats.activeMeters },
          { label: "Inactive Meters", value: stats.inactiveMeters },
          { label: "Overdue Meters", value: overdueMeters.length },
          { label: "Total Payments", value: stats.totalPayments },
          { label: "Successful Payments", value: stats.successfulPayments },
          { label: "Pending Payments", value: stats.pendingPayments },
          { label: "Failed Payments", value: stats.failedPayments },
          { label: "Total Amount", value: stats.totalAmount },
          { label: "Total Charges", value: stats.totalCharges },
        ],
        sections: [
          {
            sheetName: "Trend",
            columns: ["Month", "Payments", "Amount", "Charges"],
            rows: monthlyTrendData.map((item) => [item.label, item.payments, item.amount, item.charges]),
          },
          {
            sheetName: "Status Breakdown",
            columns: ["Status", "Count"],
            rows: statusChartData.map((item) => [item.name, item.value]),
          },
          {
            sheetName: "Payment Methods",
            columns: ["Payment Method", "Count"],
            rows: paymentMethodChartData.map((item) => [item.name, item.value]),
          },
          {
            sheetName: "Top Meters",
            columns: ["Meter Number", "Payments", "Amount"],
            rows: topMetersData.map((item) => [item.meterNumber, item.payments, item.amount]),
          },
          {
            sheetName: "Meters",
            columns: ["Meter Number", "Type", "NWSC Account", "Location", "Landlord", "Email", "Created"],
            rows: filteredMeters.map((meter) => [
              meter.meterNumber,
              meter.meterType || "",
              meter.nwscAccount || "",
              meter.locationOfNwscMeter || "",
              meter.user?.fullName || "",
              meter.user?.email || "",
              formatDateDmy(meter.dateCreated),
            ]),
          },
          {
            sheetName: "Transactions",
            columns: [
              "ID",
              "Status",
              "Amount",
              "Charges",
              "Meter Number",
              "Meter Type",
              "NWSC Account",
              "Phone Number",
              "Payment Method",
              "Utility Type",
              "Transaction ID",
              "Vendor Ref",
              "Vendor",
              "Description",
              "Created",
              "Landlord",
              "Landlord Email",
            ],
            rows: sortedTransactionRows.map((row) => [
              row.id,
              row.status,
              row.amount,
              row.charges,
              row.meterNumber,
              row.meterType,
              row.nwscAccount,
              row.phoneNumber,
              row.paymentMethod,
              row.utilityType,
              row.transactionID,
              row.vendorTranId,
              row.vendor,
              row.description,
              formatDateTimeDmy(row.createdAt),
              row.landlordName,
              row.landlordEmail,
            ]),
          },
          ...(detailSection ? [detailSection] : []),
        ],
        images: [
          paymentTrendChartRef.current
            ? {
                title: "Payment Trend",
                element: paymentTrendChartRef.current,
                sheetName: "Graphs",
              }
            : null,
          statusBreakdownChartRef.current
            ? {
                title: "Status Breakdown",
                element: statusBreakdownChartRef.current,
                sheetName: "Graphs",
              }
            : null,
          paymentMethodsChartRef.current
            ? {
                title: "Payment Methods",
                element: paymentMethodsChartRef.current,
                sheetName: "Graphs",
              }
            : null,
          topMeterActivityChartRef.current
            ? {
                title: "Top Meter Activity",
                element: topMeterActivityChartRef.current,
                sheetName: "Graphs",
              }
            : null,
        ].filter((image): image is NonNullable<typeof image> => Boolean(image)),
      });

      toast({
        title: "Export Successful",
        description: "Dashboard exported to Excel.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export dashboard to Excel.",
        variant: "destructive",
      });
    }
  };

  const filteredAccountPickerUsers = useMemo(() => {
    const s = accountPickerSearch.trim().toLowerCase();
    if (!s) return selectableUsers;
    return selectableUsers.filter((u) =>
      [u.fullName, u.email, getRoleLabel(u)].join(" ").toLowerCase().includes(s)
    );
  }, [accountPickerSearch, selectableUsers]);

  return (
    <div ref={dashboardRef} className="space-y-6">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl px-8 py-8 text-white shadow-xl" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0f2044 45%, #1a3a6e 100%)" }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-200">
              Admin
            </span>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Utility Statistics Dashboard</h1>
            <p className="text-sm text-blue-200/80">
              Review utility analytics across all landlord and utility accounts, or narrow to a single account for targeted inspection.
            </p>
          </div>
          <DashboardExportToolbar
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
          />
        </div>
      </section>

      {/* Filters Panel */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="text-base font-bold text-[#0F172A]">Filters</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Select an account scope, then limit analytics and transaction results to a specific period.
          </p>
        </div>
        <div className="p-6 space-y-4">
          {/* Primary filter row */}
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_repeat(2,minmax(0,0.8fr))_minmax(0,1.2fr)_auto]">
            {/* Account Picker */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Landlord or Utility User</label>
              <div className="relative">
                <button
                  type="button"
                  disabled={isLoadingUsers}
                  onClick={() => setAccountPickerOpen((o) => !o)}
                  className={cn(
                    "h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-sm shadow-sm outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 flex items-center justify-between cursor-pointer disabled:opacity-50",
                    !selectedAccountId && "text-[#94A3B8]"
                  )}
                >
                  <span className="truncate text-left text-[#0F172A]">
                    {isLoadingUsers ? "Loading..." : selectedScopeLabel}
                  </span>
                  <Search className="h-4 w-4 shrink-0 text-slate-400 ml-2" />
                </button>
                <AnimatePresence>
                  {accountPickerOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg"
                    >
                      <div className="p-2">
                        <input
                          className={inputCls}
                          placeholder="Search by name, email, or role"
                          value={accountPickerSearch}
                          onChange={(e) => setAccountPickerSearch(e.target.value)}
                          autoFocus
                        />
                      </div>
                      <div className="max-h-64 overflow-y-auto px-2 pb-2">
                        {/* All accounts option */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAccountId(ALL_ACCOUNT_VALUE);
                            setAccountPickerOpen(false);
                            setAccountPickerSearch("");
                          }}
                          className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
                        >
                          <Check
                            className={cn(
                              "mt-0.5 h-4 w-4 shrink-0 text-[#1D4ED8]",
                              selectedAccountId === ALL_ACCOUNT_VALUE ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-[#0F172A]">All landlord and utility accounts</p>
                            <p className="text-xs text-slate-500">Show statistics across the full admin scope</p>
                          </div>
                        </button>
                        {filteredAccountPickerUsers.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => {
                              setSelectedAccountId(String(user.id));
                              setAccountPickerOpen(false);
                              setAccountPickerSearch("");
                            }}
                            className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
                          >
                            <Check
                              className={cn(
                                "mt-0.5 h-4 w-4 shrink-0 text-[#1D4ED8]",
                                selectedAccountId === String(user.id) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-[#0F172A]">{user.fullName}</p>
                              <p className="truncate text-xs text-slate-500">{user.email}</p>
                              <p className="text-xs text-slate-400">{getRoleLabel(user)}</p>
                            </div>
                          </button>
                        ))}
                        {filteredAccountPickerUsers.length === 0 && accountPickerSearch && (
                          <p className="py-4 text-center text-sm text-slate-400">No landlord or utility user found.</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Start Date</label>
              <input
                type="date"
                className={inputCls}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate || undefined}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">End Date</label>
              <input
                type="date"
                className={inputCls}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || undefined}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Global Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className={cn(inputCls, "pl-9")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search any field, meter, vendor, phone..."
                />
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Secondary filter row */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Status</label>
              <select className={selCls} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All statuses</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Phone Number</label>
              <input
                className={inputCls}
                value={phoneFilter}
                onChange={(e) => setPhoneFilter(e.target.value)}
                placeholder="Filter by phone number"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Meter Number</label>
              <input
                className={inputCls}
                value={meterFilter}
                onChange={(e) => setMeterFilter(e.target.value)}
                placeholder="Filter by meter number"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Payment Method</label>
              <select className={selCls} value={paymentMethodFilter} onChange={(e) => setPaymentMethodFilter(e.target.value)}>
                <option value="all">All methods</option>
                {paymentMethodOptions.map((method) => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Vendor</label>
              <select className={selCls} value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)}>
                <option value="all">All vendors</option>
                {vendorOptions.map((vendor) => (
                  <option key={vendor} value={vendor}>{vendor}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Transaction ID</label>
              <input
                className={inputCls}
                value={transactionIdFilter}
                onChange={(e) => setTransactionIdFilter(e.target.value)}
                placeholder="Filter by transaction ID"
              />
            </div>
          </div>

          {/* Active filter badges */}
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
              Scope: {selectedScopeLabel}
            </span>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
              Period: {startDate || endDate ? `${startDate || "..."} to ${endDate || "..."}` : "All time"}
            </span>
            <span className="inline-flex items-center rounded-full border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              Meters: {filteredMeters.length}
            </span>
            <span className="inline-flex items-center rounded-full border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              Transactions: {filteredPayments.length}
            </span>
            <span className="inline-flex items-center rounded-full border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              Filtered rows: {filteredTransactionRows.length}
            </span>
            {!isLoadingUsers && selectableUsers.length === 0 && (
              <span className="inline-flex items-center rounded-full border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                No landlord or utility users found
              </span>
            )}
            {statusFilter !== "all" && (
              <span className="inline-flex items-center rounded-full border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                Status: {statusFilter}
              </span>
            )}
            {phoneFilter && (
              <span className="inline-flex items-center rounded-full border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                Phone: {phoneFilter}
              </span>
            )}
            {meterFilter && (
              <span className="inline-flex items-center rounded-full border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                Meter: {meterFilter}
              </span>
            )}
            {paymentMethodFilter !== "all" && (
              <span className="inline-flex items-center rounded-full border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                Method: {paymentMethodFilter}
              </span>
            )}
            {vendorFilter !== "all" && (
              <span className="inline-flex items-center rounded-full border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                Vendor: {vendorFilter}
              </span>
            )}
            {transactionIdFilter && (
              <span className="inline-flex items-center rounded-full border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                Transaction: {transactionIdFilter}
              </span>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm p-16 flex flex-col items-center justify-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1D4ED8]/10">
            <Loader2 className="h-7 w-7 animate-spin text-[#1D4ED8]" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-[#0F172A]">Loading Dashboard</p>
            <p className="text-xs text-slate-400 mt-0.5">Fetching utility meters and payment data…</p>
          </div>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {cards.map((card) => {
              const colors = cardColorMap[card.color] ?? cardColorMap.blue;
              const isActive = activeDetailView === card.key;
              return (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => {
                    setSelectedMeterNumber("");
                    setPreviousDetailView(null);
                    setActiveDetailView(card.key);
                  }}
                  className={cn(
                    "w-full text-left rounded-2xl border border-slate-200 border-l-4 bg-white p-5 shadow-sm transition-all hover:shadow-md",
                    colors.border,
                    isActive && "ring-2 ring-[#1D4ED8] shadow-md"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 truncate">{card.title}</p>
                      <p className="mt-1.5 text-2xl font-bold text-[#0F172A]">{card.value}</p>
                    </div>
                    <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", colors.bg)}>
                      <span className={colors.text}>{card.icon}</span>
                    </div>
                  </div>
                  {isActive && (
                    <p className="mt-2 text-[11px] font-semibold text-[#1D4ED8]">Viewing details ↓</p>
                  )}
                </button>
              );
            })}
          </div>

          {/* Detail View Panel */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="p-6">
              {detailContent ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-base font-bold text-[#0F172A]">{detailContent.title}</h2>
                      <p className="mt-0.5 text-sm text-slate-500">{detailContent.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {activeDetailView === "meterPayments" && previousDetailView && (
                        <button
                          onClick={returnToPreviousView}
                          className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                        >
                          Back to meters
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setActiveDetailView(null);
                          setSelectedMeterNumber("");
                          setPreviousDetailView(null);
                        }}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                      >
                        Close
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="relative md:max-w-md">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        className={cn(inputCls, "pl-9")}
                        value={detailSearchTerm}
                        onChange={(e) => setDetailSearchTerm(e.target.value)}
                        placeholder={
                          detailContent.type === "meters"
                            ? "Search meters by number, type, location, or landlord"
                            : "Search transactions by status, meter, phone, or reference"
                        }
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                        Results: {sortedDetailRows.length}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                        Page: {currentDetailPage} / {totalDetailPages}
                      </span>
                      <button
                        onClick={exportDetailRows}
                        disabled={filteredDetailRows.length === 0}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                      >
                        <Download className="h-4 w-4" />
                        Export CSV
                      </button>
                    </div>
                  </div>

                  {detailContent.type === "meters" ? (
                    <DataTable
                      data={sortedDetailRows as any[]}
                      columns={[
                        {
                          key: "meterNumber", header: "Meter Number", cell: (m: any) => (
                            <button
                              type="button"
                              onClick={() => openMeterPayments(m.meterNumber)}
                              className="text-[#1D4ED8] underline-offset-4 hover:underline font-semibold"
                            >
                              {m.meterNumber}
                            </button>
                          )
                        },
                        { key: "meterType", header: "Type", cell: (m: any) => m.meterType || "-" },
                        { key: "nwscAccount", header: "NWSC Account", cell: (m: any) => m.nwscAccount || "-" },
                        { key: "location", header: "Location", cell: (m: any) => m.locationOfNwscMeter || "-" },
                        { key: "landlord", header: "Landlord", cell: (m: any) => m.user?.fullName || "-" },
                        { key: "created", header: "Created", cell: (m: any) => formatDateDmy(m.dateCreated) },
                      ]}
                      loading={isLoading}
                      searchValue={detailSearchTerm}
                      onSearchChange={setDetailSearchTerm}
                      searchPlaceholder="Search meters by number, type, location"
                      label="meter"
                      emptyMessage="No meters found for this selection"
                      minWidth="700px"
                    />
                  ) : (
                    <DataTable
                      data={sortedDetailRows as any[]}
                      columns={[
                        { key: "status", header: "Status", cell: (p: any) => statusBadge(p.status) },
                        { key: "amount", header: "Amount", cell: (p: any) => formatCurrency(p.amount || 0) },
                        { key: "charges", header: "Charges", cell: (p: any) => formatCurrency(p.charges || 0) },
                        { key: "meter", header: "Meter", cell: (p: any) => p.meterNumber || "-" },
                        { key: "phone", header: "Phone", cell: (p: any) => p.phoneNumber || "-" },
                        { key: "txId", header: "Transaction ID", cell: (p: any) => p.transactionID || "-" },
                        { key: "vendor", header: "Vendor Ref", cell: (p: any) => p.vendorTranId || "-" },
                        { key: "created", header: "Created", cell: (p: any) => formatDateTimeDmy(p.createdAt) },
                      ]}
                      loading={isLoading}
                      searchValue={detailSearchTerm}
                      onSearchChange={setDetailSearchTerm}
                      searchPlaceholder="Search transactions by status, meter, phone"
                      label="transaction"
                      emptyMessage="No transactions found for this selection"
                      minWidth="900px"
                    />
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-14 gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                    <Zap className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-500">Click a stat card above to inspect its records</p>
                  <p className="text-xs text-slate-400">Meter and payment details will appear here</p>
                </div>
              )}
            </div>
          </div>

          {/* Charts */}
          <div className="grid gap-6 xl:grid-cols-2">
            <div ref={paymentTrendChartRef} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5">
                <h2 className="text-base font-bold text-[#0F172A]">Payment Trend</h2>
                <p className="mt-0.5 text-sm text-slate-500">Monthly transaction volume and successful amount collected.</p>
              </div>
              <div className="p-6">
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="payments" fill="#2563eb" radius={[6, 6, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="amount" stroke="#0f766e" strokeWidth={2.5} dot={{ r: 3, fill: "#0f766e" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div ref={statusBreakdownChartRef} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5">
                <h2 className="text-base font-bold text-[#0F172A]">Status Breakdown</h2>
                <p className="mt-0.5 text-sm text-slate-500">Distribution of payment states in the active period.</p>
              </div>
              <div className="p-6">
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
              </div>
            </div>

            <div ref={paymentMethodsChartRef} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5">
                <h2 className="text-base font-bold text-[#0F172A]">Payment Methods</h2>
                <p className="mt-0.5 text-sm text-slate-500">Share of transactions by payment method.</p>
              </div>
              <div className="p-6">
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
              </div>
            </div>

            <div ref={topMeterActivityChartRef} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5">
                <h2 className="text-base font-bold text-[#0F172A]">Top Meter Activity</h2>
                <p className="mt-0.5 text-sm text-slate-500">Most active meters by transaction count.</p>
              </div>
              <div className="p-6">
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
              </div>
            </div>
          </div>

          {/* All Transactions Table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#0F172A]">All Meter Transactions</h2>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Search across the current account scope and inspect every transaction column in one place.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                    Rows: {sortedTransactionRows.length}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                    Page: {currentPage} / {totalPages}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                    Charges: {formatCurrency(stats.totalCharges)}
                  </span>
                  <button
                    onClick={exportTransactions}
                    disabled={sortedTransactionRows.length === 0}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </button>
                </div>
              </div>
            </div>
            <div className="p-4">
              <DataTable
                data={sortedTransactionRows}
                columns={[
                  { key: "id", header: "ID", cell: (r) => r.id },
                  { key: "status", header: "Status", cell: (r) => statusBadge(r.status) },
                  { key: "amount", header: "Amount", cell: (r) => formatCurrency(r.amount || 0) },
                  { key: "charges", header: "Charges", cell: (r) => formatCurrency(r.charges || 0) },
                  { key: "meterNumber", header: "Meter Number", className: "font-medium", cell: (r) => r.meterNumber || "-" },
                  { key: "meterType", header: "Meter Type", cell: (r) => r.meterType || "-" },
                  { key: "nwscAccount", header: "NWSC Account", cell: (r) => r.nwscAccount || "-" },
                  { key: "location", header: "Location", cell: (r) => r.locationOfNwscMeter || "-" },
                  { key: "phone", header: "Phone Number", cell: (r) => r.phoneNumber || "-" },
                  { key: "paymentMethod", header: "Payment Method", cell: (r) => r.paymentMethod || "-" },
                  { key: "utilityType", header: "Utility Type", cell: (r) => r.utilityType || "-" },
                  { key: "txId", header: "Transaction ID", cell: (r) => r.transactionID || "-" },
                  { key: "vendor", header: "Vendor Ref", cell: (r) => r.vendorTranId || "-" },
                  { key: "vendorName", header: "Vendor", cell: (r) => r.vendor || "-" },
                  { key: "units", header: "Units", cell: (r) => r.units || "-" },
                  { key: "token", header: "Token", cell: (r) => r.token || "-" },
                  { key: "isTokenGenerated", header: "Token Generated", cell: (r) => r.isTokenGenerated ? "Yes" : "No" },
                  { key: "isSmsSent", header: "SMS Sent", cell: (r) => r.isSmsSent ? "Yes" : "No" },
                  { key: "createdAt", header: "Created", cell: (r) => formatDateTimeDmy(r.createdAt) },
                  { key: "landlordName", header: "Landlord", cell: (r) => r.landlordName || "-" },
                  { key: "landlordEmail", header: "Landlord Email", cell: (r) => r.landlordEmail || "-" },
                ]}
                loading={isLoading}
                label="transaction"
                emptyMessage="No utility transactions matched the current filters"
                minWidth="2200px"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminUtilityDashboard;
