import { useState, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Download, RefreshCw, TrendingUp, TrendingDown, BarChart3,
  CircleDollarSign, AlertTriangle, FileBarChart, Scale, BookOpen,
  PieChart as PieChartIcon, Building2, ChevronDown, ChevronRight,
  Banknote, Receipt,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";

const EXPENSE_COLORS = ["#3b82f6", "#f59e0b", "#8b5cf6", "#10b981", "#ef4444", "#6b7280"];

interface ProfitDto {
  from: string;
  to: string;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  incomeBreakdown?: Record<string, number>;
  expenseBreakdown?: Record<string, number>;
  monthlyBreakdown?: Array<{ month: string; income: number; expenses: number; profit: number }>;
}

interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  balance: number;
}

interface TrialBalanceDto {
  from?: string;
  to?: string;
  rows: TrialBalanceRow[];
  totalDebits: number;
  totalCredits: number;
}

interface BalanceSheetRow {
  accountCode: string;
  accountName: string;
  balance: number;
}

interface BalanceSheetDto {
  asOf?: string;
  assets?: BalanceSheetRow[];
  liabilities?: BalanceSheetRow[];
  equity?: BalanceSheetRow[];
  totalAssets?: number;
  totalLiabilities?: number;
  totalEquity?: number;
}

const formatUGX = (n: number) =>
  `UGX ${(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const currentYear = new Date().getFullYear();
const years = [currentYear, currentYear - 1, currentYear - 2].map(String);

const yearRange = (year: string) => ({
  from: `${year}-01-01`,
  to: `${year}-12-31`,
});

type Tab = "pnl" | "expense" | "trial" | "balance" | "property";

interface Property {
  id: number;
  name: string;
  address: string;
  type: string;
}

interface PaymentRecord {
  id: number;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  paymentStatus: string;
  transactionId: string;
  description: string | null;
  propertyTenant?: { tenant?: { firstName: string; lastName: string } };
}

interface ExpenseRecord {
  id: number;
  amount: number;
  date: string;
  category: string;
  description: string;
  paidBy: string;
}

interface InvoiceRecord {
  id: number;
  invoiceNumber: string;
  amount: number;
  invoiceDate: string;
  dueDate: string;
  status: string;
  type: string;
  notes?: string;
  propertyId: number;
  tenant?: { fullName?: string };
}

interface PropertyReport {
  property: Property;
  payments: PaymentRecord[];
  paidInvoices: InvoiceRecord[];
  expenses: ExpenseRecord[];
  totalCollections: number;
  totalExpenses: number;
}

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-3">
    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
      <FileBarChart className="h-6 w-6 text-slate-400" />
    </div>
    <p className="text-sm text-[#64748B]">{message}</p>
  </div>
);

const LoadingRows = ({ count = 4 }: { count?: number }) => (
  <div className="flex flex-col gap-3 p-5">
    {[...Array(count)].map((_, i) => (
      <div key={i} className="h-10 rounded-lg bg-slate-100 animate-pulse" />
    ))}
  </div>
);

const LandlordReports = () => {
  const { toast } = useToast();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const userData = JSON.parse(localStorage.getItem("user") || "{}");

  const [period, setPeriod] = useState(String(currentYear));
  const [activeTab, setActiveTab] = useState<Tab>("pnl");
  const [profit, setProfit] = useState<ProfitDto | null>(null);
  const [trialBalance, setTrialBalance] = useState<TrialBalanceDto | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetDto | null>(null);
  const [isLoadingProfit, setIsLoadingProfit] = useState(false);
  const [isLoadingTrial, setIsLoadingTrial] = useState(false);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Property report state
  const [reportFrom, setReportFrom] = useState(`${currentYear}-01-01`);
  const [reportTo, setReportTo] = useState(new Date().toISOString().split("T")[0]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyReports, setPropertyReports] = useState<PropertyReport[]>([]);
  const [isLoadingPropertyReport, setIsLoadingPropertyReport] = useState(false);
  const [expandedProperty, setExpandedProperty] = useState<number | null>(null);

  const fetchProperties = async () => {
    try {
      const { data } = await axios.get<Property[]>(`${apiUrl}/GetPropertiesByLandLordId/${userData.id}`);
      setProperties(data || []);
      return data || [];
    } catch {
      return [];
    }
  };

  const fetchPropertyReport = async (from: string, to: string, propList?: Property[]) => {
    const list = propList ?? properties;
    if (list.length === 0) return;
    setIsLoadingPropertyReport(true);
    try {
      // Fetch all landlord invoices once, then filter per property
      let allInvoices: InvoiceRecord[] = [];
      try {
        const invRes = await axios.get<InvoiceRecord[]>(`${apiUrl}/GetInvoicesByLandLordId/${userData.id}`);
        allInvoices = invRes.data ?? [];
      } catch { /* ignore if endpoint fails */ }

      const fromDate = new Date(from);
      const toDate = new Date(to + "T23:59:59");

      const reports = await Promise.all(
        list.map(async (prop) => {
          const [paymentsRes, expensesRes] = await Promise.allSettled([
            axios.get<PaymentRecord[]>(`${apiUrl}/GetTenantPaymentsByPropertyIdAndDateRange`, {
              params: { propertyId: prop.id, startDate: from, endDate: to },
            }),
            axios.post<ExpenseRecord[]>(`${apiUrl}/GetExpenses`, {
              OwnerId: userData.id,
              PropertyId: prop.id,
              From: fromDate.toISOString(),
              To: toDate.toISOString(),
            }),
          ]);
          const payments: PaymentRecord[] =
            paymentsRes.status === "fulfilled" ? paymentsRes.value.data ?? [] : [];
          const expenses: ExpenseRecord[] =
            expensesRes.status === "fulfilled" ? expensesRes.value.data ?? [] : [];

          // Paid invoices for this property within the date range
          const paidInvoices: InvoiceRecord[] = allInvoices.filter((inv) => {
            if (inv.propertyId !== prop.id) return false;
            if (inv.status?.toLowerCase() !== "paid") return false;
            const d = new Date(inv.invoiceDate);
            return d >= fromDate && d <= toDate;
          });

          // Paid invoices represent settled rent — use as the single source for collections.
          // Payment records cover the same transactions so we must NOT add both.
          const totalCollections = paidInvoices.reduce((s, i) => s + (i.amount ?? 0), 0);
          const totalExpenses = expenses.reduce((s, e) => s + (e.amount ?? 0), 0);
          return { property: prop, payments, paidInvoices, expenses, totalCollections, totalExpenses };
        })
      );
      setPropertyReports(reports);
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data || "Failed to load property report.", variant: "destructive" });
    } finally {
      setIsLoadingPropertyReport(false);
    }
  };

  const fetchProfit = async (year: string) => {
    setIsLoadingProfit(true);
    const { from, to } = yearRange(year);
    try {
      const { data } = await axios.get<ProfitDto>(`${apiUrl}/api/Accounting/landlord-summary`, {
        params: { landlordId: userData.id, from, to },
      });
      setProfit(data);
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data || "Failed to load profit data.", variant: "destructive" });
    } finally {
      setIsLoadingProfit(false);
    }
  };

  const fetchTrialBalance = async (year: string) => {
    setIsLoadingTrial(true);
    const { from, to } = yearRange(year);
    try {
      const { data } = await axios.get<TrialBalanceDto>(`${apiUrl}/api/Accounting/trial-balance`, { params: { from, to } });
      setTrialBalance(data);
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data || "Failed to load trial balance.", variant: "destructive" });
    } finally {
      setIsLoadingTrial(false);
    }
  };

  const fetchBalanceSheet = async (year: string) => {
    setIsLoadingBalance(true);
    const asOf = yearRange(year).to;
    try {
      const { data } = await axios.get<BalanceSheetDto>(`${apiUrl}/api/Accounting/balance-sheet`, { params: { asOf } });
      setBalanceSheet(data);
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data || "Failed to load balance sheet.", variant: "destructive" });
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const refresh = () => {
    if (activeTab === "property") {
      fetchPropertyReport(reportFrom, reportTo);
    } else {
      fetchProfit(period);
      fetchTrialBalance(period);
      fetchBalanceSheet(period);
    }
  };

  useEffect(() => {
    if (activeTab !== "property") {
      fetchProfit(period);
      fetchTrialBalance(period);
      fetchBalanceSheet(period);
    }
  }, [period]);

  useEffect(() => {
    if (activeTab === "property") {
      if (properties.length === 0) {
        fetchProperties().then((list) => fetchPropertyReport(reportFrom, reportTo, list));
      } else {
        fetchPropertyReport(reportFrom, reportTo);
      }
    }
  }, [activeTab, reportFrom, reportTo]);

  const monthly = profit?.monthlyBreakdown ?? [];
  const expenseBreakdown = profit?.expenseBreakdown
    ? Object.entries(profit.expenseBreakdown).map(([name, value]) => ({ name, value }))
    : [];
  const totalIncome = profit?.totalIncome ?? 0;
  const totalExpenses = profit?.totalExpenses ?? 0;
  const netProfit = profit?.netProfit ?? (totalIncome - totalExpenses);
  const trialRows: TrialBalanceRow[] = trialBalance?.rows ?? [];

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "pnl", label: "Profit & Loss", icon: <TrendingUp className="h-3.5 w-3.5" /> },
    { id: "expense", label: "Expense Breakdown", icon: <PieChartIcon className="h-3.5 w-3.5" /> },
    { id: "trial", label: "Trial Balance", icon: <Scale className="h-3.5 w-3.5" /> },
    { id: "balance", label: "Balance Sheet", icon: <BookOpen className="h-3.5 w-3.5" /> },
    { id: "property", label: "Property Report", icon: <Building2 className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="space-y-6 pb-8">

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl px-6 py-8 md:px-10" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0f2044 45%, #1a3a6e 100%)" }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest text-blue-200">
                Accounting
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white md:text-3xl">Reports</h1>
            <p className="max-w-md text-sm text-blue-200/80">
              Income, expenses, profit & loss and accounting reports
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="rounded-lg border border-white/25 bg-white/15 px-3 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-white/30 transition-colors"
            >
              {years.map((y) => (
                <option key={y} value={y} className="text-[#0F172A] bg-white">{y}</option>
              ))}
            </select>
            <button
              onClick={refresh}
              className="flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/15 px-3 py-2 text-xs font-semibold text-white hover:bg-white/25 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
            <button
              className="flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/15 px-3 py-2 text-xs font-semibold text-white hover:bg-white/25 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 border-l-4 border-l-emerald-500 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-[#64748B]">Total Income</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
              <TrendingUp className="h-4.5 w-4.5 text-emerald-600" />
            </div>
          </div>
          {isLoadingProfit ? (
            <div className="mt-3 h-7 w-32 rounded-md bg-slate-100 animate-pulse" />
          ) : (
            <p className="mt-3 text-2xl font-bold text-emerald-600">{formatUGX(totalIncome)}</p>
          )}
          <p className="mt-1 text-xs text-[#94A3B8]">For {period}</p>
        </div>

        <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 border-l-4 border-l-red-500 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-[#64748B]">Total Expenses</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
              <TrendingDown className="h-4.5 w-4.5 text-red-500" />
            </div>
          </div>
          {isLoadingProfit ? (
            <div className="mt-3 h-7 w-32 rounded-md bg-slate-100 animate-pulse" />
          ) : (
            <p className="mt-3 text-2xl font-bold text-red-500">{formatUGX(totalExpenses)}</p>
          )}
          <p className="mt-1 text-xs text-[#94A3B8]">For {period}</p>
        </div>

        <div className={`rounded-xl border border-[#E2E8F0] bg-white p-5 border-l-4 ${netProfit >= 0 ? "border-l-blue-500" : "border-l-red-600"} shadow-sm`}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-[#64748B]">Net Profit</p>
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${netProfit >= 0 ? "bg-blue-50" : "bg-red-50"}`}>
              {netProfit >= 0
                ? <CircleDollarSign className="h-4.5 w-4.5 text-blue-600" />
                : <AlertTriangle className="h-4.5 w-4.5 text-red-600" />
              }
            </div>
          </div>
          {isLoadingProfit ? (
            <div className="mt-3 h-7 w-32 rounded-md bg-slate-100 animate-pulse" />
          ) : (
            <p className={`mt-3 text-2xl font-bold ${netProfit >= 0 ? "text-blue-600" : "text-red-700"}`}>
              {formatUGX(netProfit)}
            </p>
          )}
          <p className="mt-1 text-xs text-[#94A3B8]">
            {totalIncome > 0 ? `${((netProfit / totalIncome) * 100).toFixed(1)}% margin` : "For " + period}
          </p>
        </div>
      </div>

      {/* Tab pills */}
      <div className="flex flex-wrap gap-2">
        {tabs.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all border ${
              activeTab === id
                ? "bg-[#1D4ED8] text-white border-[#1D4ED8] shadow-sm"
                : "border-[#E2E8F0] text-[#64748B] hover:border-[#1D4ED8]/40 hover:text-[#1D4ED8] bg-white"
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* ── PROFIT & LOSS ── */}
      {activeTab === "pnl" && (
        <div className="space-y-4">
          {isLoadingProfit ? (
            <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
              <LoadingRows count={6} />
            </div>
          ) : monthly.length > 0 ? (
            <>
              {/* Line Chart */}
              <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm p-5">
                <div className="mb-5">
                  <h2 className="text-base font-semibold text-[#0F172A]">Monthly Profit & Loss</h2>
                  <p className="text-xs text-[#94A3B8] mt-0.5">Income, expenses and net profit per month — {period}</p>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={monthly} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#cbd5e1" }} axisLine={false} tickLine={false}
                      tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} width={38} />
                    <Tooltip
                      formatter={(v: number) => formatUGX(v)}
                      contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 8px 24px -4px rgba(15,23,42,0.15)", fontSize: 12 }}
                    />
                    <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-slate-500">{v}</span>} />
                    <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} name="Income" dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Expenses" dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="profit" stroke="#1D4ED8" strokeWidth={2} strokeDasharray="5 5" name="Net Profit" dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Monthly Table */}
              <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
                <div className="border-b border-[#E2E8F0] px-5 py-4">
                  <h2 className="text-base font-semibold text-[#0F172A]">Monthly Breakdown</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#E2E8F0] bg-slate-50/60">
                        {["Month", "Income", "Expenses", "Net Profit", "Margin"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {monthly.map((m) => {
                        const margin = m.income > 0 ? ((m.profit / m.income) * 100).toFixed(1) : null;
                        return (
                          <tr key={m.month} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3 text-sm font-medium text-[#0F172A]">{m.month}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-emerald-600">{formatUGX(m.income)}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-red-500">{formatUGX(m.expenses)}</td>
                            <td className={`px-4 py-3 text-sm font-bold ${m.profit >= 0 ? "text-blue-600" : "text-red-700"}`}>
                              {formatUGX(m.profit)}
                            </td>
                            <td className="px-4 py-3">
                              {margin !== null ? (
                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  Number(margin) >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                                }`}>
                                  {margin}%
                                </span>
                              ) : (
                                <span className="text-xs text-[#94A3B8]">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
              <EmptyState message="No profit & loss data available for this period." />
            </div>
          )}
        </div>
      )}

      {/* ── EXPENSE BREAKDOWN ── */}
      {activeTab === "expense" && (
        <div className="space-y-4">
          {isLoadingProfit ? (
            <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
              <LoadingRows count={5} />
            </div>
          ) : expenseBreakdown.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {/* Pie chart */}
              <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm p-5">
                <div className="mb-5">
                  <h2 className="text-base font-semibold text-[#0F172A]">Expense Distribution</h2>
                  <p className="text-xs text-[#94A3B8] mt-0.5">Breakdown by category</p>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={expenseBreakdown}
                      cx="50%" cy="50%"
                      outerRadius={90}
                      innerRadius={50}
                      dataKey="value"
                      nameKey="name"
                      paddingAngle={3}
                    >
                      {expenseBreakdown.map((_, i) => (
                        <Cell key={i} fill={EXPENSE_COLORS[i % EXPENSE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => formatUGX(v)}
                      contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 8px 24px -4px rgba(15,23,42,0.15)", fontSize: 12 }}
                    />
                    <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-slate-500">{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Bar chart */}
              <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm p-5">
                <div className="mb-5">
                  <h2 className="text-base font-semibold text-[#0F172A]">By Category</h2>
                  <p className="text-xs text-[#94A3B8] mt-0.5">Amount per expense type</p>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={expenseBreakdown} margin={{ top: 4, right: 8, left: 0, bottom: 4 }} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#cbd5e1" }} axisLine={false} tickLine={false}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={38} />
                    <Tooltip
                      formatter={(v: number) => formatUGX(v)}
                      contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 8px 24px -4px rgba(15,23,42,0.15)", fontSize: 12 }}
                    />
                    <Bar dataKey="value" name="Amount" radius={[6, 6, 0, 0]}>
                      {expenseBreakdown.map((_, i) => (
                        <Cell key={i} fill={EXPENSE_COLORS[i % EXPENSE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Category list */}
              <div className="md:col-span-2 rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
                <div className="border-b border-[#E2E8F0] px-5 py-4">
                  <h2 className="text-base font-semibold text-[#0F172A]">Category Details</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#E2E8F0] bg-slate-50/60">
                        {["Category", "Amount", "Share"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {expenseBreakdown.map(({ name, value }, i) => {
                        const pct = totalExpenses > 0 ? ((value / totalExpenses) * 100).toFixed(1) : "0";
                        return (
                          <tr key={name} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: EXPENSE_COLORS[i % EXPENSE_COLORS.length] }} />
                                <span className="text-sm font-medium text-[#0F172A]">{name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-red-500">{formatUGX(value)}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-24 rounded-full bg-slate-100 overflow-hidden">
                                  <div
                                    className="h-full rounded-full"
                                    style={{ width: `${pct}%`, backgroundColor: EXPENSE_COLORS[i % EXPENSE_COLORS.length] }}
                                  />
                                </div>
                                <span className="text-xs text-[#64748B]">{pct}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
              <EmptyState message="No expense breakdown available for this period." />
            </div>
          )}
        </div>
      )}

      {/* ── TRIAL BALANCE ── */}
      {activeTab === "trial" && (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-[#E2E8F0] px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#0F172A]">Trial Balance — {period}</h2>
              <p className="text-xs text-[#94A3B8] mt-0.5">Account-level debit and credit summary</p>
            </div>
            {trialBalance && (
              <div className="flex flex-wrap gap-3 text-xs">
                <div className="flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-slate-50 px-3 py-1.5">
                  <span className="text-[#94A3B8]">Total Debits</span>
                  <span className="font-semibold text-[#0F172A]">{formatUGX(trialBalance.totalDebits)}</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-slate-50 px-3 py-1.5">
                  <span className="text-[#94A3B8]">Total Credits</span>
                  <span className="font-semibold text-[#0F172A]">{formatUGX(trialBalance.totalCredits)}</span>
                </div>
                <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                  trialBalance.totalDebits === trialBalance.totalCredits
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                }`}>
                  {trialBalance.totalDebits === trialBalance.totalCredits ? "✓ Balanced" : "✗ Unbalanced"}
                </span>
              </div>
            )}
          </div>

          {isLoadingTrial ? (
            <LoadingRows count={5} />
          ) : trialRows.length === 0 ? (
            <EmptyState message="No trial balance data available for this period." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-slate-50/60">
                    {["Code", "Account Name", "Debit", "Credit", "Balance"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {trialRows.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-[#64748B] bg-slate-100 rounded px-1.5 py-0.5">{r.accountCode}</span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-[#0F172A]">{r.accountName}</td>
                      <td className="px-4 py-3 text-sm text-[#64748B]">{formatUGX(r.debit)}</td>
                      <td className="px-4 py-3 text-sm text-[#64748B]">{formatUGX(r.credit)}</td>
                      <td className={`px-4 py-3 text-sm font-semibold ${r.balance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {formatUGX(r.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#E2E8F0] bg-slate-50">
                    <td colSpan={2} className="px-4 py-3 text-sm font-bold text-[#0F172A]">Totals</td>
                    <td className="px-4 py-3 text-sm font-bold text-[#0F172A]">{formatUGX(trialBalance?.totalDebits ?? 0)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-[#0F172A]">{formatUGX(trialBalance?.totalCredits ?? 0)}</td>
                    <td className="px-4 py-3" />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── PROPERTY REPORT ── */}
      {activeTab === "property" && (
        <div className="space-y-4">
          {/* Date range filter */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 shadow-sm">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Period</span>
            <div className="flex items-center gap-2">
              <label className="text-xs text-[#94A3B8]">From</label>
              <input
                type="date"
                value={reportFrom}
                onChange={(e) => setReportFrom(e.target.value)}
                className="rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-[#94A3B8]">To</label>
              <input
                type="date"
                value={reportTo}
                onChange={(e) => setReportTo(e.target.value)}
                className="rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30"
              />
            </div>
          </div>

          {isLoadingPropertyReport ? (
            <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
              <LoadingRows count={5} />
            </div>
          ) : propertyReports.length === 0 ? (
            <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
              <EmptyState message="No property data available. Make sure you have registered properties." />
            </div>
          ) : (
            <>
              {/* Summary KPIs */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {(() => {
                  const grandCollections = propertyReports.reduce((s, r) => s + r.totalCollections, 0);
                  const grandExpenses = propertyReports.reduce((s, r) => s + r.totalExpenses, 0);
                  const grandNet = grandCollections - grandExpenses;
                  return (
                    <>
                      <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 border-l-4 border-l-emerald-500 shadow-sm">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-[#64748B]">Total Collections</p>
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                            <Banknote className="h-4.5 w-4.5 text-emerald-600" />
                          </div>
                        </div>
                        <p className="mt-3 text-2xl font-bold text-emerald-600">{formatUGX(grandCollections)}</p>
                        <p className="mt-1 text-xs text-[#94A3B8]">{reportFrom} — {reportTo}</p>
                      </div>
                      <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 border-l-4 border-l-red-500 shadow-sm">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-[#64748B]">Total Expenses</p>
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
                            <Receipt className="h-4.5 w-4.5 text-red-500" />
                          </div>
                        </div>
                        <p className="mt-3 text-2xl font-bold text-red-500">{formatUGX(grandExpenses)}</p>
                        <p className="mt-1 text-xs text-[#94A3B8]">{reportFrom} — {reportTo}</p>
                      </div>
                      <div className={`rounded-xl border border-[#E2E8F0] bg-white p-5 border-l-4 ${grandNet >= 0 ? "border-l-blue-500" : "border-l-red-600"} shadow-sm`}>
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-[#64748B]">Net</p>
                          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${grandNet >= 0 ? "bg-blue-50" : "bg-red-50"}`}>
                            {grandNet >= 0
                              ? <CircleDollarSign className="h-4.5 w-4.5 text-blue-600" />
                              : <AlertTriangle className="h-4.5 w-4.5 text-red-600" />}
                          </div>
                        </div>
                        <p className={`mt-3 text-2xl font-bold ${grandNet >= 0 ? "text-blue-600" : "text-red-700"}`}>{formatUGX(grandNet)}</p>
                        <p className="mt-1 text-xs text-[#94A3B8]">Collections minus expenses</p>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Per-property cards */}
              <div className="space-y-3">
                {propertyReports.map(({ property, payments, paidInvoices, expenses, totalCollections, totalExpenses }) => {
                  const net = totalCollections - totalExpenses;
                  const isExpanded = expandedProperty === property.id;
                  return (
                    <div key={property.id} className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
                      {/* Property header row */}
                      <button
                        onClick={() => setExpandedProperty(isExpanded ? null : property.id)}
                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50/60 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 shrink-0">
                            <Building2 className="h-4.5 w-4.5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#0F172A]">{property.name}</p>
                            <p className="text-xs text-[#94A3B8]">{property.address}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right hidden sm:block">
                            <p className="text-xs text-[#94A3B8]">Collections</p>
                            <p className="text-sm font-bold text-emerald-600">{formatUGX(totalCollections)}</p>
                          </div>
                          <div className="text-right hidden sm:block">
                            <p className="text-xs text-[#94A3B8]">Expenses</p>
                            <p className="text-sm font-bold text-red-500">{formatUGX(totalExpenses)}</p>
                          </div>
                          <div className="text-right hidden sm:block">
                            <p className="text-xs text-[#94A3B8]">Net</p>
                            <p className={`text-sm font-bold ${net >= 0 ? "text-blue-600" : "text-red-700"}`}>{formatUGX(net)}</p>
                          </div>
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100">
                            {isExpanded
                              ? <ChevronDown className="h-4 w-4 text-slate-500" />
                              : <ChevronRight className="h-4 w-4 text-slate-500" />}
                          </div>
                        </div>
                      </button>

                      {/* Mobile totals strip */}
                      <div className="sm:hidden flex divide-x divide-[#F1F5F9] border-t border-[#F1F5F9]">
                        {[
                          { label: "Collections", value: totalCollections, cls: "text-emerald-600" },
                          { label: "Expenses", value: totalExpenses, cls: "text-red-500" },
                          { label: "Net", value: net, cls: net >= 0 ? "text-blue-600" : "text-red-700" },
                        ].map(({ label, value, cls }) => (
                          <div key={label} className="flex-1 py-2 px-3 text-center">
                            <p className="text-[10px] text-[#94A3B8]">{label}</p>
                            <p className={`text-xs font-bold ${cls}`}>{formatUGX(value)}</p>
                          </div>
                        ))}
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="border-t border-[#E2E8F0]">
                          {/* Payments table */}
                          <div className="border-b border-[#F1F5F9]">
                            <div className="flex items-center gap-2 px-5 py-3 bg-slate-50/60">
                              <Banknote className="h-4 w-4 text-emerald-500" />
                              <span className="text-xs font-semibold text-[#0F172A] uppercase tracking-wide">
                                Collections ({payments.length + paidInvoices.length})
                              </span>
                            </div>
                            {payments.length === 0 && paidInvoices.length === 0 ? (
                              <p className="px-5 py-4 text-xs text-[#94A3B8]">No payments in this period.</p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full">
                                  <thead>
                                    <tr className="border-b border-[#F1F5F9]">
                                      {["Date", "Tenant", "Amount", "Method / Ref", "Type"].map((h) => (
                                        <th key={h} className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#F8FAFC]">
                                    {payments.map((p) => {
                                      const tenant = p.propertyTenant?.tenant;
                                      const tenantName = tenant ? `${tenant.firstName} ${tenant.lastName}` : "—";
                                      const statusColor =
                                        p.paymentStatus?.toLowerCase() === "completed" ? "bg-emerald-50 text-emerald-700"
                                        : p.paymentStatus?.toLowerCase() === "failed" ? "bg-red-50 text-red-700"
                                        : "bg-amber-50 text-amber-700";
                                      return (
                                        <tr key={`pay-${p.id}`} className="hover:bg-slate-50/40">
                                          <td className="px-4 py-2.5 text-xs text-[#64748B]">{p.paymentDate?.split("T")[0] ?? "—"}</td>
                                          <td className="px-4 py-2.5 text-xs font-medium text-[#0F172A]">{tenantName}</td>
                                          <td className="px-4 py-2.5 text-xs font-semibold text-emerald-600">{formatUGX(p.amount)}</td>
                                          <td className="px-4 py-2.5 text-xs text-[#64748B]">{p.paymentMethod ?? "—"}</td>
                                          <td className="px-4 py-2.5">
                                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor}`}>
                                              {p.paymentStatus ?? "—"}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                    {paidInvoices.map((inv) => (
                                      <tr key={`inv-${inv.id}`} className="hover:bg-slate-50/40">
                                        <td className="px-4 py-2.5 text-xs text-[#64748B]">{inv.invoiceDate?.split("T")[0] ?? "—"}</td>
                                        <td className="px-4 py-2.5 text-xs font-medium text-[#0F172A]">{inv.tenant?.fullName ?? "—"}</td>
                                        <td className="px-4 py-2.5 text-xs font-semibold text-emerald-600">{formatUGX(inv.amount)}</td>
                                        <td className="px-4 py-2.5 text-xs text-[#64748B]">{inv.invoiceNumber}</td>
                                        <td className="px-4 py-2.5">
                                          <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700">
                                            Invoice
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot>
                                    <tr className="border-t border-[#E2E8F0] bg-slate-50">
                                      <td colSpan={2} className="px-4 py-2 text-xs font-bold text-[#0F172A]">Total</td>
                                      <td className="px-4 py-2 text-xs font-bold text-emerald-600">{formatUGX(totalCollections)}</td>
                                      <td colSpan={2} />
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            )}
                          </div>

                          {/* Expenses table */}
                          <div>
                            <div className="flex items-center gap-2 px-5 py-3 bg-slate-50/60">
                              <Receipt className="h-4 w-4 text-red-400" />
                              <span className="text-xs font-semibold text-[#0F172A] uppercase tracking-wide">
                                Expenses ({expenses.length})
                              </span>
                            </div>
                            {expenses.length === 0 ? (
                              <p className="px-5 py-4 text-xs text-[#94A3B8]">No expenses in this period.</p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full">
                                  <thead>
                                    <tr className="border-b border-[#F1F5F9]">
                                      {["Date", "Category", "Description", "Paid By", "Amount"].map((h) => (
                                        <th key={h} className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#F8FAFC]">
                                    {expenses.map((e) => (
                                      <tr key={e.id} className="hover:bg-slate-50/40">
                                        <td className="px-4 py-2.5 text-xs text-[#64748B]">{e.date?.split("T")[0] ?? "—"}</td>
                                        <td className="px-4 py-2.5">
                                          <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-[#475569]">{e.category}</span>
                                        </td>
                                        <td className="px-4 py-2.5 text-xs text-[#64748B] max-w-[180px] truncate">{e.description || "—"}</td>
                                        <td className="px-4 py-2.5 text-xs text-[#64748B]">{e.paidBy || "—"}</td>
                                        <td className="px-4 py-2.5 text-xs font-semibold text-red-500">{formatUGX(e.amount)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot>
                                    <tr className="border-t border-[#E2E8F0] bg-slate-50">
                                      <td colSpan={4} className="px-4 py-2 text-xs font-bold text-[#0F172A]">Total</td>
                                      <td className="px-4 py-2 text-xs font-bold text-red-500">{formatUGX(totalExpenses)}</td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── BALANCE SHEET ── */}
      {activeTab === "balance" && (
        <div className="space-y-4">
          {isLoadingBalance ? (
            <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
              <LoadingRows count={6} />
            </div>
          ) : balanceSheet ? (
            <>
              {/* Summary strip */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Total Assets", value: balanceSheet.totalAssets ?? 0, cls: "border-l-blue-500 text-blue-600" },
                  { label: "Total Liabilities", value: balanceSheet.totalLiabilities ?? 0, cls: "border-l-red-500 text-red-600" },
                  { label: "Total Equity", value: balanceSheet.totalEquity ?? 0, cls: "border-l-emerald-500 text-emerald-600" },
                ].map(({ label, value, cls }) => (
                  <div key={label} className={`rounded-xl border border-[#E2E8F0] bg-white p-4 border-l-4 ${cls} shadow-sm`}>
                    <p className="text-xs text-[#64748B] font-medium">{label}</p>
                    <p className={`mt-1.5 text-lg font-bold ${cls.split(" ")[1]}`}>{formatUGX(value)}</p>
                  </div>
                ))}
              </div>

              {/* Three columns */}
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { title: "Assets", data: balanceSheet.assets, total: balanceSheet.totalAssets, accent: "text-blue-600", border: "border-blue-500", bg: "bg-blue-50" },
                  { title: "Liabilities", data: balanceSheet.liabilities, total: balanceSheet.totalLiabilities, accent: "text-red-600", border: "border-red-500", bg: "bg-red-50" },
                  { title: "Equity", data: balanceSheet.equity, total: balanceSheet.totalEquity, accent: "text-emerald-600", border: "border-emerald-500", bg: "bg-emerald-50" },
                ].map(({ title, data, total, accent, border, bg }) => (
                  <div key={title} className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
                    <div className={`border-b border-[#E2E8F0] px-5 py-3 flex items-center gap-2`}>
                      <div className={`h-2.5 w-2.5 rounded-full ${border.replace("border-", "bg-")}`} />
                      <h3 className="text-sm font-semibold text-[#0F172A]">{title}</h3>
                    </div>
                    <div className="px-5 py-4 space-y-1">
                      {data && data.length > 0 ? (
                        data.map((row) => (
                          <div key={row.accountCode} className="flex items-center justify-between py-1.5 border-b border-[#F1F5F9] last:border-0">
                            <span className="text-xs text-[#64748B]">{row.accountName}</span>
                            <span className="text-xs font-medium text-[#0F172A]">{formatUGX(row.balance)}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-[#94A3B8] py-2">No data</p>
                      )}
                    </div>
                    <div className={`flex items-center justify-between border-t-2 border-[#E2E8F0] px-5 py-3 ${bg}`}>
                      <span className={`text-xs font-bold uppercase tracking-wider ${accent}`}>Total</span>
                      <span className={`text-sm font-bold ${accent}`}>{formatUGX(total ?? 0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
              <EmptyState message="No balance sheet data available for this period." />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LandlordReports;
