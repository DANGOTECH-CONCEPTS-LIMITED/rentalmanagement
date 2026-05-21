import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2, Home, Users, TrendingUp, Wallet, ArrowUpRight,
  ArrowDownLeft, ChevronDown, CircleDollarSign, Download,
  FileText, Zap, CheckCircle, AlertTriangle, Building2,
  Activity, Banknote, PiggyBank, X, History,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardExportToolbar from "@/components/common/DashboardExportToolbar";
import { useCurrencyFormatter } from "@/hooks/use-currency-formatter";
import { useToast } from "@/hooks/use-toast";
import { exportWalletStatementCsv, exportWalletStatementPdf } from "@/lib/wallet-statement-export";
import { exportDashboardPdf, exportDashboardWorkbook } from "@/lib/dashboard-export";
import { buildRunningBalanceStatement } from "@/lib/wallet-statement";
import axios from "axios";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const inputCls =
  "w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 transition-colors";

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
          {trend.up ? <TrendingUp className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3 rotate-90" />}
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
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [utilityStats, setUtilityStats] = useState<UtilityStats | null>(null);

  const dummyStats = {
    totalRevenueExpected: 2450000, incomeCollected: 1850000,
    uncollectedIncome: 600000, securityDeposits: 750000,
    utilityCollected: 120000, totalRooms: 24, occupiedRooms: 20, vacantRooms: 4,
  };

  const user = localStorage.getItem("user");
  if (!user) throw new Error("No user found in localStorage");
  const userData = JSON.parse(user);
  const token = userData.token;
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    fetchWalletData();
    fetchProperties();
    fetchTenants();
    fetchUtilityStats();
  }, []);

  const fetchWalletData = async () => {
    setIsLoading(true);
    try {
      const [balRes, stmtRes] = await Promise.all([
        fetch(`${apiUrl}/GetBalance/${userData.id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${apiUrl}/GetStatement/${userData.id}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (balRes.ok) setBalance((await balRes.json()).balance);
      if (stmtRes.ok) setTransactions(await stmtRes.json());
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const { data } = await axios.get(`${apiUrl}/GetAllTenants`);
      setTenants(data.filter((t: any) => t?.property?.ownerId === userData.id));
    } catch {}
  };

  const fetchUtilityStats = async () => {
    try {
      const { data } = await axios.get(`${apiUrl}/GetLandlordUtilityStats/${userData.id}`);
      setUtilityStats(data);
    } catch {}
  };

  const fetchProperties = async () => {
    try {
      const { data } = await axios.get(`${apiUrl}/GetPropertiesByLandLordId/${userData.id}`);
      setProperties(data);
    } catch {}
  };

  const validateWithdrawal = () => {
    const amount = Number(withdrawAmount);
    if (!withdrawAmount || isNaN(amount) || amount <= 0) {
      toast({ variant: "destructive", title: "Invalid Amount", description: "Enter a valid amount." });
      return false;
    }
    if (balance !== null && amount > balance) {
      toast({ variant: "destructive", title: "Insufficient Funds", description: "Amount exceeds balance." });
      return false;
    }
    return true;
  };

  const handleWithdraw = async () => {
    if (!validateWithdrawal()) return;
    setIsWithdrawing(true);
    try {
      const fd = new FormData();
      fd.append("amount", withdrawAmount);
      fd.append("landlordid", userData.id.toString());
      fd.append("description", "Withdrawal from wallet");
      const res = await fetch(`${apiUrl}/Withdraw`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      if (!res.ok) throw new Error("Withdrawal failed");
      toast({ title: "Withdrawal Successful", description: `Withdrawn ${formatCurrency(Number(withdrawAmount))}` });
      await fetchWalletData();
      setWithdrawAmount(""); setShowConfirmation(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Withdrawal Failed", description: err.message });
    } finally {
      setIsWithdrawing(false);
    }
  };

  const statementRows = useMemo(() => buildRunningBalanceStatement(transactions, balance), [transactions, balance]);

  const overdueUtilityMeters = useMemo(() => {
    const threshold = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return utilityStats?.meters.filter((m) => !m.lastPaymentAt || new Date(m.lastPaymentAt).getTime() < threshold).length ?? 0;
  }, [utilityStats]);

  const exportStatement = () => {
    exportWalletStatementCsv(statementRows, { fileNamePrefix: "landlord-wallet-statement", accountName: userData?.fullName });
    toast({ title: "Exported", description: "Wallet statement exported to CSV." });
  };
  const exportStatementPdf = () => {
    exportWalletStatementPdf(statementRows, { title: "Landlord Wallet Statement", fileNamePrefix: "landlord-wallet-statement", accountName: userData?.fullName, formatAmount: formatCurrency });
    toast({ title: "Exported", description: "Wallet statement exported to PDF." });
  };
  const handleExportPdf = async () => {
    if (!dashboardRef.current) return;
    try { await exportDashboardPdf(dashboardRef.current, { fileNamePrefix: "landlord-dashboard" }); toast({ title: "Exported" }); }
    catch (e: any) { toast({ title: "Export Failed", description: e.message, variant: "destructive" }); }
  };
  const handleExportExcel = async () => {
    try {
      await exportDashboardWorkbook({
        title: "Landlord Dashboard", fileNamePrefix: "landlord-dashboard",
        metadata: [{ label: "Account", value: userData?.fullName }, { label: "Balance", value: balance !== null ? formatCurrency(balance) : "--" }],
        summary: [
          { label: "Properties", value: properties.length }, { label: "Tenants", value: tenants.length },
          { label: "Utility Meters", value: utilityStats?.totalMeters ?? 0 }, { label: "Utility Payments", value: utilityStats?.totalUtilityPayments ?? 0 },
        ],
        sections: [{
          sheetName: "Wallet Statement",
          columns: ["Date", "Description", "Amount", "Running Balance"],
          rows: statementRows.map((r) => [new Date(r.transactionDate).toLocaleString(), r.description || "Wallet transaction", r.amount, r.runningBalance ?? ""]),
        }],
      });
      toast({ title: "Exported" });
    } catch (e: any) { toast({ title: "Export Failed", description: e.message, variant: "destructive" }); }
  };

  const occupancyPct = dummyStats.totalRooms > 0 ? Math.round((dummyStats.occupiedRooms / dummyStats.totalRooms) * 100) : 0;

  return (
    <div ref={dashboardRef} className="space-y-7">

      {/* ── Welcome banner ── */}
      <div className="relative overflow-hidden rounded-2xl px-7 py-6 text-white shadow-lg" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0f2044 45%, #1a3a6e 100%)" }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        {/* decorative blobs */}

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-200">{greeting()}, {userData?.fullName?.split(" ")[0]} 👋</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Landlord Dashboard</h1>
            <p className="mt-1 text-sm text-blue-200/70">
              {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>

          {/* Wallet inline */}
          <div className="flex flex-col gap-3 sm:items-end">
            <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-white/60 font-medium">Wallet Balance</p>
                {isLoading
                  ? <div className="h-6 w-28 bg-white/20 rounded-md animate-pulse mt-1" />
                  : <p className="text-xl font-bold">{balance !== null ? formatCurrency(balance) : "--"}</p>}
              </div>
              <div className="ml-4 flex gap-2">
                {/* Withdraw button */}
                <button
                  onClick={() => setShowWithdrawModal(true)}
                  className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-[#1D4ED8] hover:bg-blue-50 transition-colors"
                >
                  Withdraw
                </button>
                {/* History chevron */}
                <button
                  onClick={() => setShowHistoryModal(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-white hover:bg-white/25 transition-colors"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Export toolbar */}
        <div className="relative mt-4 flex justify-end">
          <DashboardExportToolbar onExportExcel={handleExportExcel} onExportPdf={handleExportPdf} />
        </div>
      </div>

      {/* ── Withdraw modal ── */}
      <AnimatePresence>
        {showWithdrawModal && (
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
                    <Wallet className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">Withdraw Funds</h3>
                </div>
                <button onClick={() => { setShowWithdrawModal(false); setWithdrawAmount(""); }} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-xs text-[#64748B]">Available balance: <span className="font-semibold text-[#0F172A]">{formatCurrency(balance || 0)}</span></p>
                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-1.5">Amount</label>
                  <input
                    type="number"
                    placeholder="Enter amount"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => { setShowWithdrawModal(false); setWithdrawAmount(""); }} className="flex-1 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-medium text-[#64748B] hover:bg-slate-50 transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={() => { if (validateWithdrawal()) { setShowWithdrawModal(false); setShowConfirmation(true); } }}
                    className="flex-1 rounded-lg bg-[#1D4ED8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1e40af] transition-colors"
                  >
                    Continue
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Confirm withdrawal ── */}
      <AnimatePresence>
        {showConfirmation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-sm rounded-2xl overflow-hidden bg-white shadow-[0_30px_90px_-36px_rgba(15,23,42,0.45)]"
            >
              <div className="bg-gradient-to-r from-amber-600 to-amber-500 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                    <AlertTriangle className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">Confirm Withdrawal</h3>
                </div>
                <button onClick={() => setShowConfirmation(false)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-sm text-[#0F172A]">Withdraw <span className="font-bold">{formatCurrency(Number(withdrawAmount))}</span> from your wallet?</p>
                <p className="text-xs text-[#64748B]">Funds will be transferred to your registered bank or mobile money account.</p>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setShowConfirmation(false)} className="flex-1 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-medium text-[#64748B] hover:bg-slate-50 transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={handleWithdraw}
                    disabled={isWithdrawing}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60 transition-colors"
                  >
                    {isWithdrawing ? <><Loader2 className="h-4 w-4 animate-spin" />Processing…</> : "Confirm"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Transaction history modal ── */}
      <AnimatePresence>
        {showHistoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-2xl rounded-2xl overflow-hidden bg-white shadow-[0_30px_90px_-36px_rgba(15,23,42,0.45)] max-h-[90vh] flex flex-col"
            >
              <div className="bg-gradient-to-r from-[#0F172A] to-[#1D4ED8] px-5 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                    <History className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Transaction History</h3>
                    <p className="text-[11px] text-blue-200/70">{statementRows.length} records</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={exportStatement} className="flex items-center gap-1.5 rounded-lg bg-white/15 hover:bg-white/25 px-2.5 py-1.5 text-xs font-medium text-white transition-colors">
                    <Download className="h-3.5 w-3.5" /> CSV
                  </button>
                  <button onClick={exportStatementPdf} className="flex items-center gap-1.5 rounded-lg bg-white/15 hover:bg-white/25 px-2.5 py-1.5 text-xs font-medium text-white transition-colors">
                    <FileText className="h-3.5 w-3.5" /> PDF
                  </button>
                  <button onClick={() => setShowHistoryModal(false)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto">
                {isLoading ? (
                  <div className="flex flex-col gap-3 p-5">
                    {[...Array(4)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-slate-100 animate-pulse" />)}
                  </div>
                ) : statementRows.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                      <FileText className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="text-sm text-[#64748B]">No transactions yet</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#E2E8F0] bg-slate-50/60">
                        {["Date", "Description", "Amount", "Running Balance"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {statementRows.map((tx, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 text-xs text-[#64748B]">{new Date(tx.transactionDate).toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 text-sm text-[#0F172A]">
                              {tx.amount > 0 ? <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-500" /> : <ArrowUpRight className="h-3.5 w-3.5 text-red-500" />}
                              {tx.description || "Transaction"}
                            </div>
                          </td>
                          <td className={`px-4 py-3 text-right text-sm font-semibold ${tx.amount > 0 ? "text-emerald-600" : "text-red-500"}`}>
                            {tx.amount > 0 ? "+" : ""}{formatCurrency(tx.amount)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-[#0F172A]">
                            {tx.runningBalance !== null ? formatCurrency(tx.runningBalance) : "--"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {isLoading ? [...Array(4)].map((_, i) => <div key={i} className="h-32 rounded-2xl bg-slate-200 animate-pulse" />) : (
          <>
            <KpiCard label="Properties" value={properties.length} sub="Managed by you" icon={Building2} iconBg="bg-blue-50" iconColor="text-blue-600" trend={{ value: 0, up: true }} />
            <KpiCard label="Total Tenants" value={tenants.length} sub="Active occupants" icon={Users} iconBg="bg-violet-50" iconColor="text-violet-600" trend={{ value: 2, up: true }} />
            <KpiCard
              label="Occupancy Rate"
              value={`${occupancyPct}%`}
              sub={`${dummyStats.occupiedRooms} of ${dummyStats.totalRooms} rooms`}
              icon={Home} iconBg="bg-emerald-50" iconColor="text-emerald-600"
              trend={{ value: 5, up: true }}
            />
            <KpiCard label="Utility Meters" value={utilityStats?.totalMeters ?? 0} sub={`${utilityStats?.activeMeters ?? 0} active`} icon={Zap} iconBg="bg-amber-50" iconColor="text-amber-500" />
          </>
        )}
      </div>

      {/* ── Revenue summary strip ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Revenue Expected", value: dummyStats.totalRevenueExpected, icon: Banknote, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Collected", value: dummyStats.incomeCollected, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
          { label: "Uncollected", value: dummyStats.uncollectedIncome, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50" },
          { label: "Security Deposits", value: dummyStats.securityDeposits, icon: PiggyBank, color: "text-violet-600", bg: "bg-violet-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${bg}`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-400 truncate">{label}</p>
              <p className={`text-sm font-bold ${color}`}>{formatCurrency(value)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Financial bar chart */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Financial Overview</h2>
              <p className="text-xs text-slate-400 mt-0.5">Current month breakdown</p>
            </div>
            <span className="rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-600">This Month</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={[
                { name: "Expected", amount: dummyStats.totalRevenueExpected },
                { name: "Collected", amount: dummyStats.incomeCollected },
                { name: "Uncollected", amount: dummyStats.uncollectedIncome },
                { name: "Deposits", amount: dummyStats.securityDeposits },
                { name: "Utility", amount: dummyStats.utilityCollected },
              ]}
              margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
              barSize={36}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#cbd5e1" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} width={38} />
              <Tooltip formatter={(v: number) => [formatCurrency(v), "Amount"]} contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 8px 24px -4px rgba(15,23,42,0.15)", fontSize: 12 }} />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                {["#2563EB", "#10B981", "#EF4444", "#8B5CF6", "#F59E0B"].map((c, i) => <Cell key={i} fill={c} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Utility stats */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-slate-900">Utility Stats</h2>
            <p className="text-xs text-slate-400 mt-0.5">Meter & payment overview</p>
          </div>
          <div className="space-y-3">
            {[
              { label: "Total Meters", value: utilityStats?.totalMeters ?? 0, icon: Zap, color: "text-amber-500", bg: "bg-amber-50" },
              { label: "Active Meters", value: utilityStats?.activeMeters ?? 0, icon: Activity, color: "text-green-600", bg: "bg-green-50" },
              { label: "Overdue (30+ days)", value: overdueUtilityMeters, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50" },
              { label: "Total Payments", value: utilityStats?.totalUtilityPayments ?? 0, icon: CircleDollarSign, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Utility Amount", value: formatCurrency(utilityStats?.totalUtilityAmount ?? 0), icon: Banknote, color: "text-violet-600", bg: "bg-violet-50" },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${bg}`}>
                    <Icon className={`h-3.5 w-3.5 ${color}`} />
                  </div>
                  <span className="text-xs font-medium text-slate-600">{label}</span>
                </div>
                <span className={`text-sm font-bold ${color}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Pie charts row ── */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

        {/* Room occupancy */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-900">Room Occupancy</h2>
            <p className="text-xs text-slate-400 mt-0.5">{dummyStats.occupiedRooms} occupied · {dummyStats.vacantRooms} vacant</p>
          </div>
          <div className="relative flex items-center justify-center" style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={[{ name: "Occupied", value: dummyStats.occupiedRooms }, { name: "Vacant", value: dummyStats.vacantRooms }]}
                  cx="50%" cy="44%" innerRadius={68} outerRadius={98} paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270}>
                  <Cell fill="#1D4ED8" /><Cell fill="#EF4444" />
                </Pie>
                <Tooltip formatter={(v: number) => [`${v} rooms`]} contentStyle={{ borderRadius: 12, border: "none", fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-slate-500">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" style={{ marginBottom: 28 }}>
              <span className="text-3xl font-bold text-slate-900">{occupancyPct}%</span>
              <span className="text-xs text-slate-400">Occupancy</span>
            </div>
          </div>
        </div>

        {/* Payment status */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-900">Payment Status</h2>
            <p className="text-xs text-slate-400 mt-0.5">Utility payment breakdown</p>
          </div>
          <div className="relative flex items-center justify-center" style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Successful", value: utilityStats?.successfulPayments || 0 },
                    { name: "Pending", value: utilityStats?.pendingPayments || 0 },
                    { name: "Failed", value: utilityStats?.failedPayments || 0 },
                  ]}
                  cx="50%" cy="44%" innerRadius={68} outerRadius={98} paddingAngle={3} dataKey="value">
                  <Cell fill="#10B981" /><Cell fill="#F59E0B" /><Cell fill="#EF4444" />
                </Pie>
                <Tooltip formatter={(v: number) => [`${v} payments`]} contentStyle={{ borderRadius: 12, border: "none", fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-slate-500">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" style={{ marginBottom: 28 }}>
              <span className="text-3xl font-bold text-slate-900">{utilityStats?.totalUtilityPayments ?? 0}</span>
              <span className="text-xs text-slate-400">Total</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default LandlordDashboard;
