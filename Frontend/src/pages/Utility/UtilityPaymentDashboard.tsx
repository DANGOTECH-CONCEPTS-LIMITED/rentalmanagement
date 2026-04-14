import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import StatCard from "../../components/common/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { formatDateDmy, formatDateTimeDmy } from "@/lib/date-time";
import {
  Zap,
  CheckCircle,
  Clock,
  XCircle,
  CircleDollarSign,
  TrendingUp,
  AlertTriangle,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

interface SystemRole {
  id: number;
  name: string;
}

interface ApiUser {
  id: string;
  fullName: string;
  email: string;
  systemRoleId: number;
  systemRole?: SystemRole;
}

interface StoredUser {
  id: string | number;
  token?: string;
  systemRoleId?: number;
}

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
  };
}

interface UtilityPayment {
  id: number;
  status?: string | null;
  amount: number;
  charges: number;
  createdAt?: string;
  phoneNumber?: string | null;
  meterNumber: string;
  transactionID?: string | null;
  vendorTranId?: string | null;
  vendor?: string | null;
  vendorPaymentDate?: string;
  utilityType?: string | null;
  description?: string | null;
  units?: string | null;
}

interface UtilityStats {
  totalMeters: number;
  activeMeters: number;
  inactiveMeters: number;
  totalUtilityPayments: number;
  totalUtilityAmount: number;
  totalUtilityCharges: number;
  successfulPayments: number;
  pendingPayments: number;
  failedPayments: number;
}

type DetailViewKey =
  | "totalMeters"
  | "activeMeters"
  | "overdueMeters"
  | "totalPayments"
  | "successfulPayments"
  | "pendingPayments"
  | "failedPayments"
  | "totalAmount"
  | "totalCharges"
  | "meterPayments"
  | null;

type SortDirection = "asc" | "desc";

interface SortConfig {
  key: string;
  direction: SortDirection;
}

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

const UtilityPaymentDashboard = () => {
  const [utilityUsers, setUtilityUsers] = useState<ApiUser[]>([]);
  const [selectedUtilityUserId, setSelectedUtilityUserId] = useState("");
  const [utilityMeters, setUtilityMeters] = useState<UtilityMeter[]>([]);
  const [utilityPayments, setUtilityPayments] = useState<UtilityPayment[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeDetailView, setActiveDetailView] = useState<DetailViewKey>(null);
  const [detailSearchTerm, setDetailSearchTerm] = useState("");
  const [currentDetailPage, setCurrentDetailPage] = useState(1);
  const [detailSort, setDetailSort] = useState<SortConfig | null>(null);
  const [selectedMeterNumber, setSelectedMeterNumber] = useState("");
  const [previousDetailView, setPreviousDetailView] = useState<DetailViewKey>(null);
  const { toast } = useToast();
  const formatCurrency = useCurrencyFormatter();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const detailRowsPerPage = 10;

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

  const currentUser = getStoredUser();
  const isAdmin = currentUser?.systemRoleId === 1;

  const normalizeStatus = (status?: string | null) =>
    (status ?? "").trim().toUpperCase();

  const isWithinRange = (dateValue?: string) => {
    if (!startDate && !endDate) {
      return true;
    }

    if (!dateValue) {
      return false;
    }

    const date = new Date(dateValue);
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

  const escapeCsvCell = (value: string | number) => {
    const normalized = String(value ?? "");
    return `"${normalized.replace(/"/g, '""')}"`;
  };

  const getSortValue = (row: UtilityMeter | UtilityPayment, key: string) => {
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

  const toggleSort = (key: string) => {
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

  const renderSortIcon = (key: string) => {
    if (!detailSort || detailSort.key !== key) {
      return <ArrowUpDown className="h-4 w-4" />;
    }

    return detailSort.direction === "asc" ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  const fetchUtilityUsers = async (token: string) => {
    setIsLoadingUsers(true);

    try {
      const response = await axios.get<ApiUser[]>(`${apiUrl}/GetAllUsers`, {
        headers: {
          Authorization: `Bearer ${token}`,
          accept: "*/*",
        },
      });

      const utilityUsersOnly = response.data.filter(
        (user) =>
          user.systemRoleId === 4 ||
          user.systemRole?.name?.toLowerCase().includes("utility")
      );

      setUtilityUsers(utilityUsersOnly);
      setSelectedUtilityUserId((currentSelection) => {
        const hasExistingSelection = utilityUsersOnly.some(
          (user) => user.id === currentSelection
        );

        if (hasExistingSelection) {
          return currentSelection;
        }

        return utilityUsersOnly[0]?.id ?? "";
      });
    } catch (error) {
      console.error("Error fetching utility users:", error);
      toast({
        title: "Error",
        description: "Failed to load utility users",
        variant: "destructive",
      });
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchDashboardData = async (targetUserId: string, token: string) => {
    setIsLoadingData(true);

    try {
      const [metersResponse, paymentsResponse] = await Promise.all([
        axios.get<UtilityMeter[]>(
          `${apiUrl}/GetUtilityMetersByLandLordId/${targetUserId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              accept: "*/*",
            },
          }
        ),
        axios.get<UtilityPayment[]>(
          `${apiUrl}/GetUtilityPaymentsByLandlordIdAsync/${targetUserId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              accept: "*/*",
            },
          }
        ),
      ]);

      setUtilityMeters(metersResponse.data ?? []);
      setUtilityPayments(paymentsResponse.data ?? []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast({
        title: "Error",
        description: "Failed to load utility dashboard data",
        variant: "destructive",
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (!currentUser?.token) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No user found in localStorage",
      });
      return;
    }

    if (isAdmin) {
      fetchUtilityUsers(currentUser.token);
      return;
    }

    if (currentUser.id) {
      setSelectedUtilityUserId(String(currentUser.id));
    }
  }, [currentUser?.id, currentUser?.token, isAdmin]);

  useEffect(() => {
    if (!currentUser?.token || !selectedUtilityUserId) {
      return;
    }

    setActiveDetailView(null);
    setDetailSearchTerm("");
    setSelectedMeterNumber("");
    setPreviousDetailView(null);
    fetchDashboardData(selectedUtilityUserId, currentUser.token);
  }, [currentUser?.token, selectedUtilityUserId]);

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

  const successfulPayments = useMemo(
    () =>
      filteredPayments.filter((payment) =>
        successfulStatuses.has(normalizeStatus(payment.status))
      ),
    [filteredPayments]
  );

  const pendingPayments = useMemo(
    () =>
      filteredPayments.filter((payment) =>
        pendingStatuses.has(normalizeStatus(payment.status))
      ),
    [filteredPayments]
  );

  const failedPayments = useMemo(
    () =>
      filteredPayments.filter((payment) =>
        failedStatuses.has(normalizeStatus(payment.status))
      ),
    [filteredPayments]
  );

  const activeMeterNumbers = useMemo(
    () => new Set(filteredPayments.map((payment) => payment.meterNumber).filter(Boolean)),
    [filteredPayments]
  );

  const activeMeters = useMemo(
    () =>
      filteredMeters.filter((meter) => activeMeterNumbers.has(meter.meterNumber)),
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

  const stats = useMemo<UtilityStats>(
    () => ({
      totalMeters: filteredMeters.length,
      activeMeters: activeMeters.length,
      inactiveMeters: Math.max(filteredMeters.length - activeMeters.length, 0),
      totalUtilityPayments: filteredPayments.length,
      totalUtilityAmount: successfulPayments.reduce(
        (sum, payment) => sum + (payment.amount || 0),
        0
      ),
      totalUtilityCharges: successfulPayments.reduce(
        (sum, payment) => sum + (payment.charges || 0),
        0
      ),
      successfulPayments: successfulPayments.length,
      pendingPayments: pendingPayments.length,
      failedPayments: failedPayments.length,
    }),
    [
      activeMeters.length,
      failedPayments.length,
      filteredMeters.length,
      filteredPayments.length,
      pendingPayments.length,
      successfulPayments,
    ]
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
          description: "All utility meters in the selected period.",
          type: "meters" as const,
          rows: filteredMeters,
        };
      case "activeMeters":
        return {
          title: "Active Meters",
          description: "Meters that have at least one payment in the selected period.",
          type: "meters" as const,
          rows: activeMeters,
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
          description: "All utility payment transactions in the selected period.",
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
          description: "Transactions that failed in the selected period.",
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
          description: "All transactions related to the selected meter in the active period.",
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
    overdueMeters,
    pendingPayments,
    selectedMeterNumber,
    selectedMeterPayments,
    sortedPayments,
    successfulPayments,
  ]);

  const filteredDetailRows = useMemo(() => {
    if (!detailContent) {
      return [];
    }

    const searchTerm = detailSearchTerm.trim().toLowerCase();
    if (!searchTerm) {
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
          .some((value) => String(value).toLowerCase().includes(searchTerm))
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
        .some((value) => String(value).toLowerCase().includes(searchTerm))
    );
  }, [detailContent, detailSearchTerm]);

  const sortedDetailRows = useMemo(() => {
    if (!detailSort) {
      return filteredDetailRows;
    }

    return [...filteredDetailRows].sort((left, right) => {
      const leftValue = getSortValue(left, detailSort.key);
      const rightValue = getSortValue(right, detailSort.key);

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

  const clearDateFilter = () => {
    setStartDate("");
    setEndDate("");
  };

  const cards = [
    {
      key: "totalMeters" as const,
      title: "Total Meters",
      value: stats.totalMeters,
      icon: <Zap className="h-6 w-6" />,
    },
    {
      key: "activeMeters" as const,
      title: "Active Meters",
      value: stats.activeMeters,
      icon: <CheckCircle className="h-6 w-6" />,
    },
    {
      key: "overdueMeters" as const,
      title: "30+ Days Without Payment",
      value: overdueMeters.length,
      icon: <AlertTriangle className="h-6 w-6" />,
    },
    {
      key: "totalPayments" as const,
      title: "Total Payments",
      value: stats.totalUtilityPayments,
      icon: <CircleDollarSign className="h-6 w-6" />,
    },
    {
      key: "successfulPayments" as const,
      title: "Successful Payments",
      value: stats.successfulPayments,
      icon: <CheckCircle className="h-6 w-6" />,
    },
    {
      key: "pendingPayments" as const,
      title: "Pending Payments",
      value: stats.pendingPayments,
      icon: <Clock className="h-6 w-6" />,
    },
    {
      key: "failedPayments" as const,
      title: "Failed Payments",
      value: stats.failedPayments,
      icon: <XCircle className="h-6 w-6" />,
    },
    {
      key: "totalAmount" as const,
      title: "Total Amount",
      value: formatCurrency(stats.totalUtilityAmount),
      icon: <TrendingUp className="h-6 w-6" />,
    },
    {
      key: "totalCharges" as const,
      title: "Total Charges",
      value: formatCurrency(stats.totalUtilityCharges),
      icon: <CircleDollarSign className="h-6 w-6" />,
    },
  ];

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Statistics Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Select a utility user and date range, then click any stat card to inspect the underlying records.
        </p>
      </div>

      <Card className="p-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_repeat(2,minmax(0,0.8fr))_auto]">
          {isAdmin && (
            <div className="space-y-2">
              <Label htmlFor="utility-user-select">Utility user</Label>
              <Select
                value={selectedUtilityUserId}
                onValueChange={setSelectedUtilityUserId}
                disabled={isLoadingUsers || utilityUsers.length === 0}
              >
                <SelectTrigger id="utility-user-select">
                  <SelectValue placeholder="Select a utility user" />
                </SelectTrigger>
                <SelectContent>
                  {utilityUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.fullName} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="start-date">Start date</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              max={endDate || undefined}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end-date">End date</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              min={startDate || undefined}
            />
          </div>

          <div className="flex items-end">
            <Button variant="outline" onClick={clearDateFilter} className="w-full">
              Clear Period
            </Button>
          </div>
        </div>

        {!isLoadingUsers && isAdmin && utilityUsers.length === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">No utility users were found.</p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="secondary">
            Period: {startDate || endDate ? `${startDate || "..."} to ${endDate || "..."}` : "All time"}
          </Badge>
          <Badge variant="outline">Meters: {filteredMeters.length}</Badge>
          <Badge variant="outline">Transactions: {filteredPayments.length}</Badge>
        </div>
      </Card>

      {isLoadingData ? (
        <p className="text-sm text-muted-foreground">Loading dashboard data...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => (
              <button
                key={card.key}
                type="button"
                onClick={() => {
                  setSelectedMeterNumber("");
                  setPreviousDetailView(null);
                  setActiveDetailView(card.key);
                }}
                className="w-full text-left"
              >
                <StatCard
                  title={card.title}
                  value={card.value}
                  icon={card.icon}
                  className={
                    activeDetailView === card.key
                      ? "ring-2 ring-primary shadow-lg"
                      : "cursor-pointer"
                  }
                />
              </button>
            ))}
          </div>

          <Card className="p-4">
            {detailContent ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">{detailContent.title}</h2>
                    <p className="text-sm text-muted-foreground">
                      {detailContent.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeDetailView === "meterPayments" && previousDetailView && (
                      <Button variant="outline" onClick={returnToPreviousView}>
                        Back to meters
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setActiveDetailView(null);
                        setSelectedMeterNumber("");
                        setPreviousDetailView(null);
                      }}
                    >
                      Close
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <Input
                    value={detailSearchTerm}
                    onChange={(event) => setDetailSearchTerm(event.target.value)}
                    placeholder={
                      detailContent.type === "meters"
                        ? "Search meters by number, type, location, or user"
                        : "Search transactions by status, meter, phone, or reference"
                    }
                    className="md:max-w-md"
                  />
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Results: {sortedDetailRows.length}</Badge>
                    <Badge variant="outline">
                      Page: {currentDetailPage} / {totalDetailPages}
                    </Badge>
                    <Button
                      variant="outline"
                      onClick={exportDetailRows}
                      disabled={filteredDetailRows.length === 0}
                    >
                      Export CSV
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  {detailContent.type === "meters" ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            <button type="button" className="flex items-center gap-1" onClick={() => toggleSort("meterNumber")}>
                              Meter Number
                              {renderSortIcon("meterNumber")}
                            </button>
                          </TableHead>
                          <TableHead>
                            <button type="button" className="flex items-center gap-1" onClick={() => toggleSort("meterType")}>
                              Type
                              {renderSortIcon("meterType")}
                            </button>
                          </TableHead>
                          <TableHead>
                            <button type="button" className="flex items-center gap-1" onClick={() => toggleSort("nwscAccount")}>
                              NWSC Account
                              {renderSortIcon("nwscAccount")}
                            </button>
                          </TableHead>
                          <TableHead>
                            <button type="button" className="flex items-center gap-1" onClick={() => toggleSort("locationOfNwscMeter")}>
                              Location
                              {renderSortIcon("locationOfNwscMeter")}
                            </button>
                          </TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>
                            <button type="button" className="flex items-center gap-1" onClick={() => toggleSort("dateCreated")}>
                              Created
                              {renderSortIcon("dateCreated")}
                            </button>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedDetailRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground">
                              No meters found for this selection.
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedMeterRows.map((meter) => (
                            <TableRow key={meter.id}>
                              <TableCell className="font-medium">
                                <button
                                  type="button"
                                  onClick={() => openMeterPayments(meter.meterNumber)}
                                  className="text-primary underline-offset-4 hover:underline"
                                >
                                  {meter.meterNumber}
                                </button>
                              </TableCell>
                              <TableCell>{meter.meterType || "-"}</TableCell>
                              <TableCell>{meter.nwscAccount || "-"}</TableCell>
                              <TableCell>{meter.locationOfNwscMeter || "-"}</TableCell>
                              <TableCell>{meter.user?.fullName || "-"}</TableCell>
                              <TableCell>{formatDateDmy(meter.dateCreated)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            <button type="button" className="flex items-center gap-1" onClick={() => toggleSort("status")}>
                              Status
                              {renderSortIcon("status")}
                            </button>
                          </TableHead>
                          <TableHead>
                            <button type="button" className="flex items-center gap-1" onClick={() => toggleSort("amount")}>
                              Amount
                              {renderSortIcon("amount")}
                            </button>
                          </TableHead>
                          <TableHead>
                            <button type="button" className="flex items-center gap-1" onClick={() => toggleSort("charges")}>
                              Charges
                              {renderSortIcon("charges")}
                            </button>
                          </TableHead>
                          <TableHead>
                            <button type="button" className="flex items-center gap-1" onClick={() => toggleSort("meterNumber")}>
                              Meter
                              {renderSortIcon("meterNumber")}
                            </button>
                          </TableHead>
                          <TableHead>
                            <button type="button" className="flex items-center gap-1" onClick={() => toggleSort("phoneNumber")}>
                              Phone
                              {renderSortIcon("phoneNumber")}
                            </button>
                          </TableHead>
                          <TableHead>
                            <button type="button" className="flex items-center gap-1" onClick={() => toggleSort("transactionID")}>
                              Transaction ID
                              {renderSortIcon("transactionID")}
                            </button>
                          </TableHead>
                          <TableHead>
                            <button type="button" className="flex items-center gap-1" onClick={() => toggleSort("vendorTranId")}>
                              Vendor Ref
                              {renderSortIcon("vendorTranId")}
                            </button>
                          </TableHead>
                          <TableHead>
                            <button type="button" className="flex items-center gap-1" onClick={() => toggleSort("createdAt")}>
                              Created
                              {renderSortIcon("createdAt")}
                            </button>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedDetailRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center text-muted-foreground">
                              No transactions found for this selection.
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedPaymentRows.map((payment) => (
                            <TableRow key={payment.id}>
                              <TableCell>{payment.status || "-"}</TableCell>
                              <TableCell>{formatCurrency(payment.amount || 0)}</TableCell>
                              <TableCell>{formatCurrency(payment.charges || 0)}</TableCell>
                              <TableCell>{payment.meterNumber || "-"}</TableCell>
                              <TableCell>{payment.phoneNumber || "-"}</TableCell>
                              <TableCell>{payment.transactionID || "-"}</TableCell>
                              <TableCell>{payment.vendorTranId || "-"}</TableCell>
                              <TableCell>{formatDateTimeDmy(payment.createdAt)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  )}
                </div>

                {sortedDetailRows.length > detailRowsPerPage && (
                  <div className="flex justify-end">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setCurrentDetailPage((page) => Math.max(1, page - 1))
                        }
                        disabled={currentDetailPage === 1}
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm">
                        Page {currentDetailPage} of {totalDetailPages}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setCurrentDetailPage((page) =>
                            Math.min(totalDetailPages, page + 1)
                          )
                        }
                        disabled={currentDetailPage === totalDetailPages}
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Click a stat card to view the records behind that metric.
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default UtilityPaymentDashboard;
