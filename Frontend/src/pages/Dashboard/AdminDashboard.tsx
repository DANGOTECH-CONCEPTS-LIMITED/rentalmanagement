import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Home,
  Wallet,
  TrendingUp,
  Building2,
  Plus,
  FileText,
  Settings,
  Droplets,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Smartphone,
  MessageSquare,
} from "lucide-react";
import StatCard from "../../components/common/StatCard";
import Button from "../../components/ui/button/Button";
import DashboardExportToolbar from "@/components/common/DashboardExportToolbar";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  exportDashboardPdf,
  exportDashboardWorkbook,
} from "@/lib/dashboard-export";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface Stats {
  totalProperties: number;
  totalLandlords: number;
  totalRevenue: number;
  occupancyRate: number;
}

type BalanceType = "SMS" | "BULK" | "WALLET";
type WithdrawDestination = "BULK" | "flexipay";

interface BalanceApiResponse {
  status: number;
  status_message: string;
  data: {
    currentBalance: boolean;
    message: string;
    balance?: {
      type: BalanceType;
      amount: string;
    };
  };
}

interface SimpleBalance {
  type: BalanceType;
  amount: string;
  message: string;
}

const revenueData = [
  { month: "Jan", amount: 85000 },
  { month: "Feb", amount: 92000 },
  { month: "Mar", amount: 88000 },
  { month: "Apr", amount: 105000 },
  { month: "May", amount: 112000 },
  { month: "Jun", amount: 125000 },
];

const occupancyData = [
  { month: "Jan", rate: 78 },
  { month: "Feb", rate: 82 },
  { month: "Mar", rate: 85 },
  { month: "Apr", rate: 88 },
  { month: "May", rate: 90 },
  { month: "Jun", rate: 92 },
];

const propertyTypeData = [
  { name: "Residential", value: 65, color: "#3b82f6" },
  { name: "Commercial", value: 25, color: "#06b6d4" },
  { name: "Industrial", value: 10, color: "#8b5cf6" },
];

const AdminDashboard = () => {
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<Stats>({
    totalProperties: 0,
    totalLandlords: 0,
    totalRevenue: 0,
    occupancyRate: 0,
  });

  const [properties, setProperties] = useState([]);
  const [landlords, setLandlords] = useState([]);

  const [balance, setBalance] = useState<SimpleBalance | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [balanceType, setBalanceType] = useState<BalanceType | "">("");
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [withdrawDestination, setWithdrawDestination] =
    useState<WithdrawDestination | null>(null);
  const [withdrawReference, setWithdrawReference] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);

  const navigate = useNavigate();

  const user = localStorage.getItem("user");
  let token = "";

  try {
    if (user) {
      const userData = JSON.parse(user);
      token = userData.token;
    }
  } catch (error) {
    console.error("Error parsing user:", error);
  }

  const fetchBalance = async (type: BalanceType) => {
    const apiUrl = import.meta.env.VITE_API_BASE_URL;
    try {
      setBalanceLoading(true);
      setBalanceError(null);
      const normalizedType = (type || "") as BalanceType;
      setBalanceType(normalizedType);

      const response = await fetch(`${apiUrl}/currentBalance`, {
        method: "POST",
        headers: {
          accept: "*/*",
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type: normalizedType }),
      });

      const data: BalanceApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.status_message || `HTTP error! status: ${response.status}`,
        );
      }

      if (!data?.data?.currentBalance) {
        throw new Error(data?.data?.message || "Unknown balance type");
      }

      const apiBalance = data.data.balance;
      const message = data.data.message;
      const simple: SimpleBalance = {
        type: (apiBalance?.type || normalizedType) as BalanceType,
        amount: apiBalance?.amount || "0",
        message: message || "",
      };
      setBalance(simple);
    } catch (err) {
      setBalanceError(
        err instanceof Error ? err.message : "Unknown error occurred",
      );
      setBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  };

  const openWithdrawDialog = (destination: WithdrawDestination) => {
    setWithdrawDestination(destination);
    setWithdrawDialogOpen(true);
  };

  const handleCollectoWithdraw = async () => {
    const apiUrl = import.meta.env.VITE_API_BASE_URL;

    if (!withdrawDestination) {
      toast({
        title: "Destination required",
        description: "Choose a valid withdraw destination.",
        variant: "destructive",
      });
      return;
    }

    if (!withdrawReference.trim()) {
      toast({
        title: "Reference required",
        description: "Enter a reference for this Collecto withdrawal.",
        variant: "destructive",
      });
      return;
    }

    if (
      !withdrawAmount ||
      Number.isNaN(Number(withdrawAmount)) ||
      Number(withdrawAmount) <= 0
    ) {
      toast({
        title: "Invalid amount",
        description: "Enter a valid withdraw amount greater than zero.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingWithdraw(true);

    try {
      const response = await fetch(`${apiUrl}/withdrawFromCollectoWallet`, {
        method: "POST",
        headers: {
          accept: "*/*",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reference: withdrawReference.trim(),
          amount: withdrawAmount,
          withdrawTo: withdrawDestination,
        }),
      });

      const rawText = await response.text();
      let parsedResponse: {
        message?: string;
        response?: string;
        status?: string;
      } | null = null;

      try {
        parsedResponse = rawText ? JSON.parse(rawText) : null;
      } catch {
        parsedResponse = null;
      }

      if (!response.ok) {
        throw new Error(
          parsedResponse?.message || rawText || "Collecto withdrawal failed.",
        );
      }

      toast({
        title: "Withdrawal submitted",
        description:
          parsedResponse?.message ||
          `Withdrawal to ${withdrawDestination.toUpperCase()} was submitted successfully.`,
      });

      setWithdrawDialogOpen(false);
      setWithdrawReference("");
      setWithdrawAmount("");
    } catch (error) {
      toast({
        title: "Withdrawal failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to submit Collecto withdrawal.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  const fetchLandlords = async () => {
    const apiUrl = import.meta.env.VITE_API_BASE_URL;
    if (!apiUrl) {
      throw new Error("API base URL is not configured");
    }

    try {
      const { data } = await axios.get(`${apiUrl}/GetLandlords`);
      setLandlords(data);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error.response.status === 404
            ? `Landlords ${error.response.statusText}`
            : error.response.data,
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
      const { data } = await axios.get(`${apiUrl}/GetAllProperties`);
      setProperties(data);
    } catch (error) {
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

  useEffect(() => {
    const fetchStats = async () => {
      const mockStats: Stats = {
        totalProperties: 150,
        totalLandlords: 45,
        totalRevenue: 125000,
        occupancyRate: 92,
      };
      setStats(mockStats);
    };

    fetchStats();
    fetchProperties();
    fetchLandlords();
  }, []);

  const quickActions = [
    {
      title: "Register Landlord",
      description: "Add a new landlord to the system",
      path: "/admin-dashboard/register-landlord",
      icon: Users,
      color: "from-blue-500 to-blue-600",
    },
    {
      title: "Register Property",
      description: "Add a new property to listing",
      path: "/admin-dashboard/register-property",
      icon: Building2,
      color: "from-cyan-500 to-cyan-600",
    },
    {
      title: "View Reports",
      description: "Access detailed analytics",
      path: "/admin-dashboard/reports",
      icon: FileText,
      color: "from-indigo-500 to-indigo-600",
    },
    {
      title: "System Settings",
      description: "Configure system preferences",
      path: "/admin-dashboard/system-settings",
      icon: Settings,
      color: "from-violet-500 to-violet-600",
    },
  ];

  const balanceButtons = [
    { type: "SMS" as BalanceType, label: "SMS Balance", icon: MessageSquare },
    { type: "BULK" as BalanceType, label: "Bulk Balance", icon: Smartphone },
    {
      type: "WALLET" as BalanceType,
      label: "Wallet Balance",
      icon: CreditCard,
    },
  ];

  const handleExportPdf = async () => {
    if (!dashboardRef.current) {
      return;
    }

    try {
      await exportDashboardPdf(dashboardRef.current, {
        fileNamePrefix: "admin-dashboard-overview",
      });

      toast({
        title: "Export Successful",
        description: "Dashboard exported to PDF.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to export dashboard to PDF.",
        variant: "destructive",
      });
    }
  };

  const handleExportExcel = async () => {
    try {
      await exportDashboardWorkbook({
        title: "Admin Dashboard Overview",
        fileNamePrefix: "admin-dashboard-overview",
        metadata: [
          {
            label: "Selected Balance Type",
            value: balanceType || "Not selected",
          },
          { label: "Balance Message", value: balance?.message || "N/A" },
          { label: "Balance Error", value: balanceError || "None" },
        ],
        summary: [
          { label: "Total Properties", value: properties.length },
          { label: "Total Landlords", value: landlords.length },
          { label: "Total Revenue", value: stats.totalRevenue },
          { label: "Occupancy Rate", value: `${stats.occupancyRate}%` },
        ],
        sections: [
          {
            sheetName: "Quick Actions",
            columns: ["Title", "Description", "Path"],
            rows: quickActions.map((action) => [
              action.title,
              action.description,
              action.path,
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
        description:
          error instanceof Error
            ? error.message
            : "Failed to export dashboard to Excel.",
        variant: "destructive",
      });
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <div
      ref={dashboardRef}
      className="min-h-screen space-y-8 p-4 lg:p-8 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white"
    >
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-border/50"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Dashboard Overview
          </h1>
          <p className="text-blue-200 mt-1">
            Welcome back! Here's what's happening across your properties.
          </p>
        </div>
        <DashboardExportToolbar
          onExportExcel={handleExportExcel}
          onExportPdf={handleExportPdf}
        />
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <motion.div variants={itemVariants}>
          <StatCard
            title="Total Properties"
            value={properties.length || stats.totalProperties}
            icon={<Home className="w-5 h-5" />}
            change={{ value: 12, type: "increase" }}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <StatCard
            title="Total Landlords"
            value={landlords.length || stats.totalLandlords}
            icon={<Users className="w-5 h-5" />}
            change={{ value: 8, type: "increase" }}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <StatCard
            title="Total Revenue"
            value={`UGX ${stats.totalRevenue.toLocaleString()}`}
            icon={<Wallet className="w-5 h-5" />}
            change={{ value: 15, type: "increase" }}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <StatCard
            title="Occupancy Rate"
            value={`${stats.occupancyRate}%`}
            icon={<TrendingUp className="w-5 h-5" />}
            change={{ value: 5, type: "increase" }}
          />
        </motion.div>
      </motion.div>

      {/* Balance Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl p-6 rounded-2xl space-y-6"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Account Balances
            </h3>
            <p className="text-sm text-blue-200">
              Check your SMS, BULK, and Wallet balances in real-time.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {balanceButtons.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.type}
                  onClick={(e) => {
                    e.preventDefault();
                    fetchBalance(item.type);
                  }}
                  disabled={balanceLoading}
                  variant={balanceType === item.type ? "primary" : "outline"}
                  className="min-w-36 gap-2"
                  leftIcon={<Icon size={16} />}
                >
                  {balanceLoading && balanceType === item.type
                    ? "Loading..."
                    : item.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Balance Display */}
        {balance && !balanceError ? (
          <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-200/20 p-6 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-200 mb-1">
                  {balance.type} Balance
                </p>
                <p className="text-3xl font-bold text-white">
                  {balance.message ||
                    `UGX ${Number(balance.amount).toLocaleString()}`}
                </p>
              </div>
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Wallet className="w-7 h-7 text-primary" />
              </div>
            </div>
          </div>
        ) : balanceError ? (
          <div className="flex items-center gap-2 text-red-500 p-4 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200">
            <ArrowDownRight className="w-5 h-5" />
            <span>Error: {balanceError}</span>
          </div>
        ) : null}
      </motion.div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl p-6 rounded-2xl"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold">Revenue Overview</h3>
              <p className="text-sm text-blue-200">
                Monthly revenue collection trend
              </p>
            </div>
            <div className="flex items-center gap-1 text-green-500 text-sm font-medium">
              <ArrowUpRight className="w-4 h-4" />
              <span>+15%</span>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient
                    id="revenueGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(148, 163, 184, 0.2)"
                />
                <XAxis
                  dataKey="month"
                  stroke="rgba(148, 163, 184, 0.6)"
                  fontSize={12}
                />
                <YAxis
                  stroke="rgba(148, 163, 184, 0.6)"
                  fontSize={12}
                  tickFormatter={(value) => `UGX ${value / 1000}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    border: "1px solid rgba(226, 232, 240, 0.8)",
                    borderRadius: "12px",
                    boxShadow: "0 10px 30px -10px rgba(15, 23, 42, 0.2)",
                  }}
                  formatter={(value: number) => [
                    `UGX ${value.toLocaleString()}`,
                    "Revenue",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl p-6 rounded-2xl"
        >
          <h3 className="text-lg font-semibold mb-2">Property Distribution</h3>
          <p className="text-sm text-blue-200 mb-6">
            Portfolio breakdown by type
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={propertyTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {propertyTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    border: "1px solid rgba(226, 232, 240, 0.8)",
                    borderRadius: "12px",
                  }}
                  formatter={(value: number, name: string) => [
                    `${value}%`,
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {propertyTypeData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-blue-200">
                  {item.name} ({item.value}%)
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Occupancy Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl p-6 rounded-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">Occupancy Trends</h3>
            <p className="text-sm text-blue-200">
              Monthly occupancy rate performance
            </p>
          </div>
          <div className="flex items-center gap-1 text-green-500 text-sm font-medium">
            <ArrowUpRight className="w-4 h-4" />
            <span>+5%</span>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={occupancyData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(148, 163, 184, 0.2)"
              />
              <XAxis
                dataKey="month"
                stroke="rgba(148, 163, 184, 0.6)"
                fontSize={12}
              />
              <YAxis
                stroke="rgba(148, 163, 184, 0.6)"
                fontSize={12}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  border: "1px solid rgba(226, 232, 240, 0.8)",
                  borderRadius: "12px",
                }}
                formatter={(value: number) => [`${value}%`, "Occupancy"]}
              />
              <Bar dataKey="rate" fill="#06b6d4" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Collecto Wallet Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl p-6 rounded-2xl space-y-4"
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              Collecto Wallet Withdrawals
            </h3>
            <p className="text-sm text-blue-200">
              Submit and track admin withdrawals from the Collecto wallet to
              BULK and FLEXIPAY.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/admin-dashboard/collecto-withdraw-logs")}
          >
            View Withdraw Logs
          </Button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            onClick={() => openWithdrawDialog("BULK")}
            leftIcon={<Wallet size={16} />}
          >
            Withdraw to BULK
          </Button>
          <Button
            variant="secondary"
            onClick={() => openWithdrawDialog("flexipay")}
            leftIcon={<CreditCard size={16} />}
          >
            Withdraw to FLEXIPAY
          </Button>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <motion.div
                key={action.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + index * 0.1 }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl p-6 rounded-2xl space-y-4 cursor-pointer group"
                onClick={() => navigate(action.path)}
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{action.title}</h3>
                  <p className="text-sm text-blue-200 mt-1">
                    {action.description}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Get Started
                </Button>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <DialogContent className="rounded-[28px] sm:max-w-lg bg-slate-900/95 backdrop-blur-xl border border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              {withdrawDestination === "BULK"
                ? "Withdraw to BULK"
                : "Withdraw to FLEXIPAY"}
            </DialogTitle>
            <DialogDescription className="text-blue-200">
              This submits a request to the `withdrawFromCollectoWallet`
              endpoint and stores the local plus downstream Collecto logs in the
              database.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="collecto-withdraw-reference"
                className="text-white"
              >
                Reference
              </Label>
              <Input
                id="collecto-withdraw-reference"
                variant="dark"
                value={withdrawReference}
                onChange={(event) => setWithdrawReference(event.target.value)}
                placeholder="Enter a unique withdrawal reference"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="collecto-withdraw-amount" className="text-white">
                Amount
              </Label>
              <Input
                id="collecto-withdraw-amount"
                variant="dark"
                type="number"
                min="0"
                step="0.01"
                value={withdrawAmount}
                onChange={(event) => setWithdrawAmount(event.target.value)}
                placeholder="Enter amount to withdraw"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setWithdrawDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCollectoWithdraw}
                isLoading={isSubmittingWithdraw}
              >
                Submit Withdrawal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
