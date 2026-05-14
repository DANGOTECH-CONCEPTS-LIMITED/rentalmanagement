import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  Home,
  Users,
  TrendingUp,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
  CircleDollarSign,
  Download,
  FileText,
  Zap,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import StatCard from "../../components/common/StatCard";
import DashboardExportToolbar from "@/components/common/DashboardExportToolbar";
import { useCurrencyFormatter } from "@/hooks/use-currency-formatter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  exportWalletStatementCsv,
  exportWalletStatementPdf,
} from "@/lib/wallet-statement-export";
import {
  exportDashboardPdf,
  exportDashboardWorkbook,
} from "@/lib/dashboard-export";
import { buildRunningBalanceStatement } from "@/lib/wallet-statement";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import axios from "axios";
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
} from "recharts";

interface Transaction {
  amount: number;
  description: string;
  transactionDate: string;
  type?: "deposit" | "withdrawal";
}

interface UtilityStats {
  landlordId: number;
  totalMeters: number;
  activeMeters: number;
  inactiveMeters: number;
  totalUtilityPayments: number;
  totalUtilityAmount: number;
  totalUtilityCharges: number;
  successfulPayments: number;
  pendingPayments: number;
  failedPayments: number;
  firstPaymentAt: string;
  lastPaymentAt: string;
  meters: {
    meterNumber: string;
    payments: number;
    amount: number;
    charges: number;
    lastPaymentAt: string;
  }[];
}

const LandlordDashboard = () => {
  const formatCurrency = useCurrencyFormatter();
  const { toast } = useToast();
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [utilityStats, setUtilityStats] = useState<UtilityStats | null>(null);

  // Dummy financial & room stats (replace with API calls when ready)
  const dummyStats = {
    totalRevenueExpected: 2450000,
    incomeCollected: 1850000,
    uncollectedIncome: 600000,
    securityDeposits: 750000,
    utilityCollected: 120000,
    totalRooms: 24,
    occupiedRooms: 20,
    vacantRooms: 4,
  };

  const user = localStorage.getItem("user");

  if (!user) throw new Error("No user found in localStorage");
  const userData = JSON.parse(user);
  const getUserToken = () => {
    try {
      // setUserInfo(userData);
      return userData.token;
    } catch (error) {
      console.error("Error getting user token:", error);
      return null;
    }
  };

  const token = getUserToken();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    fetchWalletData();
    fetchProperties();
    fetchTenants();
    fetchUtilityStats();
  }, [token, apiUrl, toast]);

  const fetchWalletData = async () => {
    setIsLoading(true);
    try {
      if (!token) throw new Error("No authentication token found");

      const user = localStorage.getItem("user");
      if (!user) throw new Error("No user found in localStorage");
      const userData = JSON.parse(user);

      const balanceRes = await fetch(`${apiUrl}/GetBalance/${userData.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          accept: "*/*",
        },
      });

      if (!balanceRes.ok)
        throw new Error(`Failed to fetch balance: ${balanceRes.status}`);
      const balanceData = await balanceRes.json();
      setBalance(balanceData.balance);

      const statementRes = await fetch(
        `${apiUrl}/GetStatement/${userData.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            accept: "*/*",
          },
        }
      );

      if (!statementRes.ok)
        throw new Error(`Failed to fetch statement: ${statementRes.status}`);
      const statementData = await statementRes.json();
      setTransactions(statementData);
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to load wallet data",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTenants = async () => {
    const apiUrl = import.meta.env.VITE_API_BASE_URL;
    if (!apiUrl) {
      throw new Error("API base URL is not configured");
    }

    try {
      const { data } = await axios.get(`${apiUrl}/GetAllTenants`);
      const filteredData = data.filter(
        (tenant: any) => tenant?.property?.ownerId === userData.id
      );
      setTenants(filteredData);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error.response.status === 404
            ? `Tenants ${error.response.statusText}`
            : error.response.data,
        variant: "destructive",
      });
    }
  };

  const fetchUtilityStats = async () => {
    const apiUrl = import.meta.env.VITE_API_BASE_URL;
    if (!apiUrl) {
      throw new Error("API base URL is not configured");
    }

    try {
      const response = await axios.get(
        `${apiUrl}/GetLandlordUtilityStats/${userData.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            accept: "*/*",
          },
        }
      );
      setUtilityStats(response.data);
    } catch (error) {
      console.error("Error fetching utility stats:", error);
      toast({
        title: "Error",
        description: "Failed to load utility statistics",
        variant: "destructive",
      });
    }
  };
  const fetchProperties = async () => {
    const apiUrl = import.meta.env.VITE_API_BASE_URL;
    if (!apiUrl) {
      throw new Error("API base URL is not configured");
    }

    try {
      const { data } = await axios.get(
        `${apiUrl}/GetPropertiesByLandLordId/${userData.id}`
      );

      setProperties(data);
    } catch (error) {
      console.error("Error fetching landlords:", error);
      toast({
        title: "Error",
        description:
          error.response.status === 404
            ? `Properties ${error.response.statusText}`
            : error.response.data,
        variant: "destructive",
      });
    }
  };

  const validateWithdrawal = () => {
    if (!withdrawAmount || isNaN(Number(withdrawAmount))) {
      toast({
        variant: "destructive",
        title: "Invalid Amount",
        description: "Please enter a valid withdrawal amount",
      });
      return false;
    }

    const amount = Number(withdrawAmount);
    if (amount <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Amount",
        description: "Withdrawal amount must be greater than 0",
      });
      return false;
    }

    if (balance !== null && amount > balance) {
      toast({
        variant: "destructive",
        title: "Insufficient Funds",
        description: "You don't have enough balance for this withdrawal",
      });
      return false;
    }

    return true;
  };

  const handleWithdraw = async () => {
    if (!validateWithdrawal()) return;

    const amount = Number(withdrawAmount);
    setIsWithdrawing(true);

    try {
      const user = localStorage.getItem("user");
      if (!user) throw new Error("No user found in localStorage");
      const userData = JSON.parse(user);

      const formData = new FormData();
      formData.append("amount", amount.toString());
      formData.append("landlordid", userData.id.toString());
      formData.append("description", "Withdrawal from wallet");

      const response = await fetch(`${apiUrl}/Withdraw`, {
        method: "POST",
        headers: {
          accept: "*/*",
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error("Withdrawal failed");

      toast({
        title: "Withdrawal Successful",
        description: `You have withdrawn ${formatCurrency(amount)}`,
      });

      // Refresh balance & transactions
      const updatedBalance = await (
        await fetch(`${apiUrl}/GetBalance/${userData.id}`, {
          headers: { Authorization: `Bearer ${token}`, accept: "*/*" },
        })
      ).json();
      setBalance(updatedBalance.balance);

      const updatedStatement = await (
        await fetch(`${apiUrl}/GetStatement/${userData.id}`, {
          headers: { Authorization: `Bearer ${token}`, accept: "*/*" },
        })
      ).json();
      setTransactions(updatedStatement);

      setWithdrawAmount("");
      setShowConfirmation(false);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Withdrawal Failed",
        description:
          err.message || "There was an error processing your withdrawal",
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  const statementRows = useMemo(
    () => buildRunningBalanceStatement(transactions, balance),
    [transactions, balance]
  );

  const overdueUtilityMeters = useMemo(() => {
    const overdueThreshold = Date.now() - 30 * 24 * 60 * 60 * 1000;

    return (
      utilityStats?.meters.filter((meter) => {
        if (!meter.lastPaymentAt) {
          return true;
        }

        const lastPaymentTimestamp = new Date(meter.lastPaymentAt).getTime();
        return Number.isNaN(lastPaymentTimestamp) || lastPaymentTimestamp < overdueThreshold;
      }).length ?? 0
    );
  }, [utilityStats]);

  const exportStatement = () => {
    exportWalletStatementCsv(statementRows, {
      fileNamePrefix: "landlord-wallet-statement",
      accountName: userData?.fullName,
    });

    toast({
      title: "Export Successful",
      description: "Wallet statement exported to CSV.",
    });
  };

  const exportStatementPdf = () => {
    exportWalletStatementPdf(statementRows, {
      title: "Landlord Wallet Statement",
      fileNamePrefix: "landlord-wallet-statement",
      accountName: userData?.fullName,
      formatAmount: formatCurrency,
    });

    toast({
      title: "Export Successful",
      description: "Wallet statement exported to PDF.",
    });
  };

  const handleExportPdf = async () => {
    if (!dashboardRef.current) {
      return;
    }

    try {
      await exportDashboardPdf(dashboardRef.current, {
        fileNamePrefix: "landlord-dashboard-overview",
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
      await exportDashboardWorkbook({
        title: "Landlord Dashboard",
        fileNamePrefix: "landlord-dashboard-overview",
        metadata: [
          { label: "Account", value: userData?.fullName || "N/A" },
          { label: "Available Balance", value: balance !== null ? formatCurrency(balance) : "--" },
        ],
        summary: [
          { label: "Properties", value: properties.length },
          { label: "Tenants", value: tenants.length },
          { label: "Wallet Transactions", value: statementRows.length },
          { label: "Utility Meters", value: utilityStats?.totalMeters ?? 0 },
          { label: "Utility Payments", value: utilityStats?.totalUtilityPayments ?? 0 },
          { label: "Utility Amount", value: utilityStats?.totalUtilityAmount ?? 0 },
        ],
        sections: [
          {
            sheetName: "Wallet Statement",
            columns: ["Date", "Description", "Amount", "Running Balance"],
            rows: statementRows.map((row) => [
              new Date(row.transactionDate).toLocaleString(),
              row.description || "Wallet transaction",
              row.amount,
              row.runningBalance ?? "",
            ]),
          },
          {
            sheetName: "Utility Meters",
            columns: ["Meter Number", "Payments", "Amount", "Charges", "Last Payment"],
            rows: (utilityStats?.meters ?? []).map((meter) => [
              meter.meterNumber,
              meter.payments,
              meter.amount,
              meter.charges,
              meter.lastPaymentAt ? new Date(meter.lastPaymentAt).toLocaleString() : "N/A",
            ]),
          },
        ],
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

  return (
    <div ref={dashboardRef} className="space-y-6">

      {/* Page header */}
      <section className="page-hero">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Landlord
            </span>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
              Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Welcome back, {userData?.fullName}
            </p>
          </div>
          <DashboardExportToolbar
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
          />
        </div>
      </section>

      {/* Wallet Balance card */}
      <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-primary to-primary-hover p-6 text-white shadow-[0_20px_60px_-16px_rgba(37,99,235,0.45)]">
        {/* decorative circles */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-8 -right-4 h-28 w-28 rounded-full bg-white/10" />

        <div className="relative flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-medium text-white/80">Wallet Balance</span>
          </div>

          {/* Transaction history dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white hover:bg-white/20">
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[300px] p-0">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start">
                    View Transaction History
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Transaction History</DialogTitle>
                  </DialogHeader>
                  {isLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : transactions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No transactions found</div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={exportStatement}>
                          <Download className="mr-2 h-4 w-4" />Export CSV
                        </Button>
                        <Button variant="outline" size="sm" onClick={exportStatementPdf}>
                          <FileText className="mr-2 h-4 w-4" />Export PDF
                        </Button>
                      </div>
                      <div className="overflow-x-auto max-h-[60vh]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                              <TableHead className="text-right">Running Balance</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {statementRows.map((tx, i) => (
                              <TableRow key={i}>
                                <TableCell>{new Date(tx.transactionDate).toLocaleDateString()}</TableCell>
                                <TableCell className="flex items-center gap-2">
                                  {tx.amount > 0
                                    ? <ArrowDownLeft className="h-4 w-4 text-success" />
                                    : <ArrowUpRight className="h-4 w-4 text-danger" />}
                                  {tx.description || "Transaction"}
                                </TableCell>
                                <TableCell className={`text-right font-medium ${tx.amount > 0 ? "text-success" : "text-danger"}`}>
                                  {tx.amount > 0 ? "+" : ""}{formatCurrency(tx.amount)}
                                </TableCell>
                                <TableCell className="text-right font-medium text-slate-950">
                                  {tx.runningBalance !== null ? formatCurrency(tx.runningBalance) : "--"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="relative mt-5 flex items-end justify-between">
          {isLoading ? (
            <>
              <Skeleton className="h-9 w-36 bg-white/30" />
              <Skeleton className="h-9 w-24 bg-white/30" />
            </>
          ) : (
            <>
              <div>
                <p className="text-3xl font-bold tracking-tight">
                  {balance !== null ? formatCurrency(balance) : "--"}
                </p>
                <p className="mt-1 text-sm text-white/70">Available balance</p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-white text-primary hover:bg-white/90 font-semibold shadow-none">
                    Withdraw
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Withdraw Funds</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">Available: {formatCurrency(balance || 0)}</p>
                    <Input type="number" placeholder="Enter amount to withdraw" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} />
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setWithdrawAmount("")} className="w-full">Cancel</Button>
                      <Button onClick={() => { if (validateWithdrawal()) setShowConfirmation(true); }} className="w-full">Continue</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Confirm withdrawal dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm Withdrawal</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm">Are you sure you want to withdraw {formatCurrency(Number(withdrawAmount))}?</p>
            <p className="text-xs text-muted-foreground">
              This action cannot be undone. The funds will be transferred to your registered bank account or mobile money number.
            </p>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowConfirmation(false)} className="w-full">Cancel</Button>
              <Button onClick={handleWithdraw} disabled={isWithdrawing} className="w-full">
                {isWithdrawing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : "Confirm Withdrawal"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Stats */}
      <div className="data-surface p-6">
        <div className="mb-5 flex items-center gap-2">
          <span className="h-4 w-1 rounded-full bg-primary" />
          <h2 className="text-base font-semibold text-slate-950">Quick Stats</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Properties" value={properties.length} icon={<Home className="h-6 w-6" />} change={{ value: 1, type: "increase" }} />
          <StatCard title="Total Tenants" value={tenants.length} icon={<Users className="h-6 w-6" />} change={{ value: 2, type: "increase" }} />
          <StatCard title="Monthly Revenue" value={formatCurrency(15000)} icon={<CircleDollarSign className="h-6 w-6" />} change={{ value: 8, type: "increase" }} />
          <StatCard title="Occupancy Rate" value="95%" icon={<TrendingUp className="h-6 w-6" />} change={{ value: 5, type: "increase" }} />
        </div>
      </div>

      {/* Row 1: Financial Overview (2/3) + Utility Statistics (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Financial Overview — bar chart, spans 2 cols */}
        <div className="data-surface p-6 lg:col-span-2">
          <div className="mb-5 flex items-center gap-2">
            <span className="h-4 w-1 rounded-full bg-accent" />
            <h2 className="text-base font-semibold text-slate-950">Financial Overview — Current Month</h2>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={[
                { name: "Expected", amount: dummyStats.totalRevenueExpected },
                { name: "Collected", amount: dummyStats.incomeCollected },
                { name: "Uncollected", amount: dummyStats.uncollectedIncome },
                { name: "Deposits", amount: dummyStats.securityDeposits },
                { name: "Utility", amount: dummyStats.utilityCollected },
              ]}
              margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
              barSize={38}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
                width={42}
              />
              <Tooltip
                formatter={(v: number) => [formatCurrency(v), "Amount"]}
                contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 8px 24px -4px rgba(15,23,42,0.15)", fontSize: 13 }}
              />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                {["#2563EB", "#10B981", "#EF4444", "#8B5CF6", "#F59E0B"].map((color, i) => (
                  <Cell key={i} fill={color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Utility Statistics — 4 stat cards */}
        <div className="data-surface p-6">
          <div className="mb-5 flex items-center gap-2">
            <span className="h-4 w-1 rounded-full bg-warning" />
            <h2 className="text-base font-semibold text-slate-950">Utility Statistics</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatCard title="Total Meters" value={utilityStats?.totalMeters || 0} icon={<Zap className="h-6 w-6" />} />
            <StatCard title="Active Meters" value={utilityStats?.activeMeters || 0} icon={<CheckCircle className="h-6 w-6" />} />
            <StatCard title="Overdue (30+ days)" value={overdueUtilityMeters} icon={<AlertTriangle className="h-6 w-6" />} />
            <StatCard title="Total Payments" value={utilityStats?.totalUtilityPayments || 0} icon={<CircleDollarSign className="h-6 w-6" />} />
          </div>
        </div>

      </div>

      {/* Row 2: Room Occupancy + Payment Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Room Occupancy */}
        <div className="data-surface p-6">
          <div className="mb-5 flex items-center gap-2">
            <span className="h-4 w-1 rounded-full bg-primary" />
            <h2 className="text-base font-semibold text-slate-950">Room Occupancy</h2>
          </div>
          <div className="relative flex items-center justify-center" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Occupied", value: dummyStats.occupiedRooms },
                    { name: "Vacant", value: dummyStats.vacantRooms },
                  ]}
                  cx="50%" cy="44%"
                  innerRadius={65} outerRadius={96}
                  paddingAngle={3}
                  dataKey="value"
                  startAngle={90} endAngle={-270}
                >
                  <Cell fill="#2563EB" />
                  <Cell fill="#EF4444" />
                </Pie>
                <Tooltip
                  formatter={(v: number) => [`${v} rooms`]}
                  contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 8px 24px -4px rgba(15,23,42,0.15)", fontSize: 13 }}
                />
                <Legend iconType="circle" iconSize={8}
                  formatter={(value) => <span className="text-xs text-slate-600">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" style={{ marginBottom: 28 }}>
              <span className="text-2xl font-bold text-slate-950">{dummyStats.totalRooms}</span>
              <span className="text-xs text-muted-foreground">Total Rooms</span>
            </div>
          </div>
        </div>

        {/* Payment Status */}
        <div className="data-surface p-6">
          <div className="mb-5 flex items-center gap-2">
            <span className="h-4 w-1 rounded-full bg-success" />
            <h2 className="text-base font-semibold text-slate-950">Payment Status</h2>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={[
                  { name: "Successful", value: utilityStats?.successfulPayments || 0 },
                  { name: "Pending", value: utilityStats?.pendingPayments || 0 },
                  { name: "Failed", value: utilityStats?.failedPayments || 0 },
                ]}
                cx="50%" cy="44%"
                innerRadius={65} outerRadius={96}
                paddingAngle={3}
                dataKey="value"
              >
                <Cell fill="#10B981" />
                <Cell fill="#F59E0B" />
                <Cell fill="#EF4444" />
              </Pie>
              <Tooltip
                formatter={(v: number) => [`${v} payments`]}
                contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 8px 24px -4px rgba(15,23,42,0.15)", fontSize: 13 }}
              />
              <Legend iconType="circle" iconSize={8}
                formatter={(value) => <span className="text-xs text-slate-600">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

      </div>

    </div>
  );
};

export default LandlordDashboard;
