import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2, Home, Users, TrendingUp, Wallet, ArrowUpRight,
  ArrowDownLeft, ChevronDown, CircleDollarSign, Download,
  FileText, Zap, CheckCircle, AlertTriangle, Building2,
  Activity, Banknote, PiggyBank,
} from "lucide-react";
import DashboardExportToolbar from "@/components/common/DashboardExportToolbar";
import { useCurrencyFormatter } from "@/hooks/use-currency-formatter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { exportWalletStatementCsv, exportWalletStatementPdf } from "@/lib/wallet-statement-export";
import { exportDashboardPdf, exportDashboardWorkbook } from "@/lib/dashboard-export";
import { buildRunningBalanceStatement } from "@/lib/wallet-statement";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import axios from "axios";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#1E3A5F] to-[#1D4ED8] px-7 py-6 text-white shadow-lg">
        {/* decorative blobs */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-52 w-52 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute bottom-0 right-24 h-32 w-32 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-blue-400/10" />

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
                  ? <Skeleton className="h-6 w-28 bg-white/20 mt-1" />
                  : <p className="text-xl font-bold">{balance !== null ? formatCurrency(balance) : "--"}</p>}
              </div>
              <div className="ml-4 flex gap-2">
                {/* Withdraw */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-white text-[#1D4ED8] hover:bg-blue-50 font-semibold text-xs h-8 px-3">
                      Withdraw
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Withdraw Funds</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">Available: {formatCurrency(balance || 0)}</p>
                      <Input type="number" placeholder="Enter amount" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} />
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setWithdrawAmount("")} className="w-full">Cancel</Button>
                        <Button onClick={() => { if (validateWithdrawal()) setShowConfirmation(true); }} className="w-full">Continue</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Transaction history */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white hover:bg-white/20">
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[300px] p-0">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" className="w-full justify-start">View Transaction History</Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader><DialogTitle>Transaction History</DialogTitle></DialogHeader>
                        {isLoading ? (
                          <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                        ) : transactions.length === 0 ? (
                          <div className="py-10 text-center text-muted-foreground">No transactions yet</div>
                        ) : (
                          <div className="space-y-4">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={exportStatement}><Download className="mr-2 h-4 w-4" />CSV</Button>
                              <Button variant="outline" size="sm" onClick={exportStatementPdf}><FileText className="mr-2 h-4 w-4" />PDF</Button>
                            </div>
                            <div className="max-h-[60vh] overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Date</TableHead><TableHead>Description</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="text-right">Balance</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {statementRows.map((tx, i) => (
                                    <TableRow key={i}>
                                      <TableCell className="text-xs text-slate-500">{new Date(tx.transactionDate).toLocaleDateString()}</TableCell>
                                      <TableCell className="flex items-center gap-2 text-sm">
                                        {tx.amount > 0 ? <ArrowDownLeft className="h-4 w-4 text-green-500" /> : <ArrowUpRight className="h-4 w-4 text-red-500" />}
                                        {tx.description || "Transaction"}
                                      </TableCell>
                                      <TableCell className={`text-right font-semibold text-sm ${tx.amount > 0 ? "text-green-600" : "text-red-500"}`}>
                                        {tx.amount > 0 ? "+" : ""}{formatCurrency(tx.amount)}
                                      </TableCell>
                                      <TableCell className="text-right text-sm font-medium">
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
            </div>
          </div>
        </div>

        {/* Export toolbar */}
        <div className="relative mt-4 flex justify-end">
          <DashboardExportToolbar onExportExcel={handleExportExcel} onExportPdf={handleExportPdf} />
        </div>
      </div>

      {/* ── Confirm withdrawal ── */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm Withdrawal</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm">Withdraw <span className="font-bold">{formatCurrency(Number(withdrawAmount))}</span> from your wallet?</p>
            <p className="text-xs text-muted-foreground">Funds will be transferred to your registered bank or mobile money account.</p>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowConfirmation(false)} className="w-full">Cancel</Button>
              <Button onClick={handleWithdraw} disabled={isWithdrawing} className="w-full">
                {isWithdrawing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing…</> : "Confirm"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {isLoading ? [...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />) : (
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
            <Badge className="bg-blue-50 text-blue-600 border-blue-100 text-xs">This Month</Badge>
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
