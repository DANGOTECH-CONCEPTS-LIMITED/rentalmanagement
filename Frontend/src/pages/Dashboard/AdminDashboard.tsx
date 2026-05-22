import { useEffect, useState } from "react";
import {
  Users, Home, Wallet, TrendingUp, MessageSquare, BarChart3,
  Settings, UserPlus, Building2, ChevronRight, ArrowUpRight,
  CircleDollarSign, Loader2, AlertCircle, CheckCircle2, X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "@/hooks/use-toast";

const inputCls =
  "w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 transition-colors";

type BalanceType = "SMS" | "BULK" | "WALLET";
type WithdrawDestination = "BULK" | "flexipay";

interface BalanceApiResponse {
  status: number;
  status_message: string;
  data: {
    currentBalance: boolean;
    message: string;
    balance?: { type: BalanceType; amount: string };
  };
}

interface SimpleBalance {
  type: BalanceType;
  amount: string;
  message: string;
}

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const KpiCard = ({
  label, value, sub, icon: Icon, iconBg, iconColor, trend,
}: {
  label: string; value: string | number; sub?: string;
  icon: any; iconBg: string; iconColor: string; trend?: { value: number; up: boolean };
}) => (
  <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
      {trend && (
        <span className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${trend.up ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
          <ArrowUpRight className={`h-3 w-3 ${trend.up ? "" : "rotate-180"}`} />
          {Math.abs(trend.value)}%
        </span>
      )}
    </div>
    <div className="mt-4">
      <p className="text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="mt-0.5 text-sm font-medium text-slate-500">{label}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  </div>
);

const QuickActionCard = ({
  title, desc, path, icon: Icon, color, bg, navigate,
}: {
  title: string; desc: string; path: string;
  icon: any; color: string; bg: string; navigate: (p: string) => void;
}) => (
  <button
    onClick={() => navigate(path)}
    className="group flex flex-col items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
  >
    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${bg}`}>
      <Icon className={`h-5 w-5 ${color}`} />
    </div>
    <div className="flex-1">
      <p className="font-semibold text-slate-900 text-sm">{title}</p>
      <p className="mt-0.5 text-xs text-slate-500">{desc}</p>
    </div>
    <ChevronRight className={`h-4 w-4 ${color} transition-transform group-hover:translate-x-0.5`} />
  </button>
);

const AdminDashboard = () => {
  const navigate = useNavigate();

  const [properties, setProperties] = useState<any[]>([]);
  const [landlords, setLandlords] = useState<any[]>([]);
  const [balance, setBalance] = useState<SimpleBalance | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [balanceType, setBalanceType] = useState<BalanceType | "">("");
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [withdrawDestination, setWithdrawDestination] = useState<WithdrawDestination | null>(null);
  const [withdrawReference, setWithdrawReference] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);

  const user = localStorage.getItem("user");
  let token = "";
  let firstName = "Admin";
  try {
    if (user) {
      const u = JSON.parse(user);
      token = u.token;
      firstName = u.fullName?.split(" ")[0] ?? "Admin";
    }
  } catch {}

  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const fetchBalance = async (type: BalanceType) => {
    try {
      setBalanceLoading(true);
      setBalanceError(null);
      setBalanceType(type);
      const response = await fetch(`${apiUrl}/currentBalance`, {
        method: "POST",
        headers: { accept: "*/*", Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data: BalanceApiResponse = await response.json();
      if (!response.ok) throw new Error(data?.status_message || `HTTP ${response.status}`);
      if (!data?.data?.currentBalance) throw new Error(data?.data?.message || "Unknown balance type");
      setBalance({
        type: (data.data.balance?.type || type) as BalanceType,
        amount: data.data.balance?.amount || "0",
        message: data.data.message || "",
      });
    } catch (err) {
      setBalanceError(err instanceof Error ? err.message : "Unknown error");
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
    if (!withdrawDestination) return;
    if (!withdrawReference.trim()) {
      toast({ title: "Reference required", description: "Enter a reference for this withdrawal.", variant: "destructive" });
      return;
    }
    if (!withdrawAmount || isNaN(Number(withdrawAmount)) || Number(withdrawAmount) <= 0) {
      toast({ title: "Invalid amount", description: "Enter a valid amount greater than zero.", variant: "destructive" });
      return;
    }
    setIsSubmittingWithdraw(true);
    try {
      const response = await fetch(`${apiUrl}/withdrawFromCollectoWallet`, {
        method: "POST",
        headers: { accept: "*/*", Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reference: withdrawReference.trim(), amount: withdrawAmount, withdrawTo: withdrawDestination }),
      });
      const rawText = await response.text();
      let parsed: { message?: string } | null = null;
      try { parsed = rawText ? JSON.parse(rawText) : null; } catch {}
      if (!response.ok) throw new Error(parsed?.message || rawText || "Withdrawal failed.");
      toast({ title: "Withdrawal submitted", description: parsed?.message || `Withdrawal to ${withdrawDestination.toUpperCase()} submitted.` });
      setWithdrawDialogOpen(false);
      setWithdrawReference("");
      setWithdrawAmount("");
    } catch (error) {
      toast({ title: "Withdrawal failed", description: error instanceof Error ? error.message : "Failed to submit withdrawal.", variant: "destructive" });
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  const fetchLandlords = async () => {
    try {
      const { data } = await axios.get(`${apiUrl}/GetLandlords`);
      setLandlords(data);
    } catch (error: any) {
      toast({ title: "Error", description: error?.response?.data ?? "Failed to load landlords.", variant: "destructive" });
    }
  };

  const fetchProperties = async () => {
    try {
      const { data } = await axios.get(`${apiUrl}/GetAllProperties`);
      setProperties(data);
    } catch (error: any) {
      toast({ title: "Error", description: error?.response?.data ?? "Failed to load properties.", variant: "destructive" });
    }
  };

  useEffect(() => {
    fetchProperties();
    fetchLandlords();
  }, []);

  const balanceTabs: { type: BalanceType; label: string }[] = [
    { type: "SMS", label: "SMS" },
    { type: "BULK", label: "Bulk" },
    { type: "WALLET", label: "Wallet" },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl p-7 text-white shadow-xl" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0f2044 45%, #1a3a6e 100%)" }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-200">{greeting()},</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{firstName}</h1>
            <p className="mt-2 text-sm text-slate-300">Platform Overview — Marple Properties Administration</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <div className="rounded-xl bg-white/10 border border-white/15 px-3 py-2">
                <p className="text-xs text-blue-200">Properties</p>
                <p className="text-lg font-bold">{properties.length}</p>
              </div>
              <div className="rounded-xl bg-white/10 border border-white/15 px-3 py-2">
                <p className="text-xs text-blue-200">Landlords</p>
                <p className="text-lg font-bold">{landlords.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Total Properties"
          value={properties.length}
          sub="Registered on platform"
          icon={Home}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          trend={{ value: 12, up: true }}
        />
        <KpiCard
          label="Total Landlords"
          value={landlords.length}
          sub="Active accounts"
          icon={Users}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          trend={{ value: 8, up: true }}
        />
        <KpiCard
          label="Total Revenue"
          value="UGX 125,000"
          sub="Lifetime collections"
          icon={CircleDollarSign}
          iconBg="bg-amber-50"
          iconColor="text-amber-500"
          trend={{ value: 15, up: true }}
        />
        <KpiCard
          label="Occupancy Rate"
          value="92%"
          sub="Across all properties"
          icon={TrendingUp}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
          trend={{ value: 5, up: true }}
        />
      </div>

      {/* Balance Checker */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-6 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <Wallet className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Account Balances</p>
            <p className="text-xs text-slate-400">Check SMS, Bulk, or Wallet balance in real time</p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Tab selector */}
          <div className="flex gap-2 flex-wrap">
            {balanceTabs.map(({ type, label }) => (
              <button
                key={type}
                onClick={() => fetchBalance(type)}
                disabled={balanceLoading}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all border ${
                  balanceType === type
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "border-slate-200 text-slate-600 hover:border-blue-200 hover:text-blue-600 bg-white"
                }`}
              >
                {balanceLoading && balanceType === type ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : null}
                {label} Balance
              </button>
            ))}
          </div>

          {/* Balance display */}
          {balance && !balanceError && (
            <div className="flex items-center gap-4 rounded-xl border border-green-100 bg-green-50 px-5 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-green-700 uppercase tracking-wider">{balance.type} Balance</p>
                <p className="text-2xl font-bold text-green-800">
                  {balance.message || `UGX ${Number(balance.amount).toLocaleString()}`}
                </p>
              </div>
            </div>
          )}
          {balanceError && (
            <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {balanceError}
            </div>
          )}
        </div>
      </div>

      {/* Collecto Wallet */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-6 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
            <CircleDollarSign className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800">Collecto Wallet</p>
            <p className="text-xs text-slate-400">Submit withdrawals to BULK or FLEXIPAY</p>
          </div>
          <button
            onClick={() => navigate("/admin-dashboard/collecto-withdraw-logs")}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            View logs <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        <div className="flex flex-col gap-3 p-6 sm:flex-row">
          <button
            onClick={() => openWithdrawDialog("BULK")}
            className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
          >
            <ArrowUpRight className="h-4 w-4" /> Withdraw to BULK
          </button>
          <button
            onClick={() => openWithdrawDialog("flexipay")}
            className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            <ArrowUpRight className="h-4 w-4" /> Withdraw to FLEXIPAY
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <QuickActionCard title="Register Landlord" desc="Add a new landlord to the system" path="/admin-dashboard/register-landlord" icon={UserPlus} color="text-blue-600" bg="bg-blue-50" navigate={navigate} />
          <QuickActionCard title="Register Property" desc="Add a new property to listings" path="/admin-dashboard/register-property" icon={Building2} color="text-emerald-600" bg="bg-emerald-50" navigate={navigate} />
          <QuickActionCard title="View Reports" desc="Access detailed analytics" path="/admin-dashboard/reports" icon={BarChart3} color="text-amber-600" bg="bg-amber-50" navigate={navigate} />
          <QuickActionCard title="System Settings" desc="Configure system preferences" path="/admin-dashboard/system-settings" icon={Settings} color="text-violet-600" bg="bg-violet-50" navigate={navigate} />
        </div>
      </div>

      {/* Withdraw Modal */}
      <AnimatePresence>
        {withdrawDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-sm rounded-2xl overflow-hidden bg-white shadow-[0_30px_90px_-36px_rgba(15,23,42,0.45)]"
            >
              <div className="bg-gradient-to-r from-[#0F172A] to-[#1D4ED8] px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                    <CircleDollarSign className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {withdrawDestination === "BULK" ? "Withdraw to BULK" : "Withdraw to FLEXIPAY"}
                    </h3>
                    <p className="text-[11px] text-blue-200/70">Collecto wallet withdrawal</p>
                  </div>
                </div>
                <button
                  onClick={() => setWithdrawDialogOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-xs text-[#64748B]">Submit a withdrawal from the Collecto wallet. This will be logged in the system.</p>
                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-1.5">Reference</label>
                  <input
                    value={withdrawReference}
                    onChange={(e) => setWithdrawReference(e.target.value)}
                    placeholder="Unique withdrawal reference"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-1.5">Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Amount to withdraw"
                    className={inputCls}
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setWithdrawDialogOpen(false)}
                    className="flex-1 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-medium text-[#64748B] hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCollectoWithdraw}
                    disabled={isSubmittingWithdraw}
                    className="btn-grid flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#1D4ED8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1e40af] disabled:opacity-60 transition-colors"
                  >
                    {isSubmittingWithdraw ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
                    ) : "Submit Withdrawal"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
