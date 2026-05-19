import { useState, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, Column } from "@/components/ui/data-table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
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

interface BalanceSheetDto {
  asOf?: string;
  assets?: Record<string, number>;
  liabilities?: Record<string, number>;
  equity?: Record<string, number>;
  totalAssets?: number;
  totalLiabilities?: number;
  totalEquity?: number;
}

const formatUGX = (n: number) => `UGX ${(n ?? 0).toLocaleString()}`;

const currentYear = new Date().getFullYear();
const years = [currentYear, currentYear - 1, currentYear - 2].map(String);

const yearRange = (year: string) => ({
  from: `${year}-01-01`,
  to: `${year}-12-31`,
});

const LandlordReports = () => {
  const { toast } = useToast();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const [period, setPeriod] = useState(String(currentYear));
  const [profit, setProfit] = useState<ProfitDto | null>(null);
  const [trialBalance, setTrialBalance] = useState<TrialBalanceDto | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetDto | null>(null);
  const [isLoadingProfit, setIsLoadingProfit] = useState(false);
  const [isLoadingTrial, setIsLoadingTrial] = useState(false);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  const fetchProfit = async (year: string) => {
    setIsLoadingProfit(true);
    const { from, to } = yearRange(year);
    try {
      const { data } = await axios.get<ProfitDto>(`${apiUrl}/api/Accounting/profit`, { params: { from, to } });
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

  useEffect(() => {
    fetchProfit(period);
    fetchTrialBalance(period);
    fetchBalanceSheet(period);
  }, [period]);

  const monthly = profit?.monthlyBreakdown ?? [];

  const expenseBreakdown = profit?.expenseBreakdown
    ? Object.entries(profit.expenseBreakdown).map(([name, value]) => ({ name, value }))
    : [];

  const totalIncome = profit?.totalIncome ?? 0;
  const totalExpenses = profit?.totalExpenses ?? 0;
  const netProfit = profit?.netProfit ?? (totalIncome - totalExpenses);

  const trialRows: TrialBalanceRow[] = trialBalance?.rows ?? [];

  const trialCols: Column<TrialBalanceRow>[] = [
    { key: "code", header: "Account Code", cell: (r) => r.accountCode },
    { key: "name", header: "Account Name", cell: (r) => r.accountName },
    { key: "debit", header: "Debit", cell: (r) => formatUGX(r.debit) },
    { key: "credit", header: "Credit", cell: (r) => formatUGX(r.credit) },
    {
      key: "balance", header: "Balance",
      cell: (r) => (
        <span className={r.balance >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
          {formatUGX(r.balance)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Income, expenses, profit & loss and accounting reports</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => { fetchProfit(period); fetchTrialBalance(period); fetchBalanceSheet(period); }}>
            <RefreshCw className="mr-2 h-4 w-4" />Refresh
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />Export
          </Button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Income", value: formatUGX(totalIncome), color: "text-green-600" },
          { label: "Total Expenses", value: formatUGX(totalExpenses), color: "text-red-600" },
          { label: "Net Profit", value: formatUGX(netProfit), color: netProfit >= 0 ? "text-blue-600" : "text-red-700" },
        ].map((k) => (
          <div key={k.label} className="glass-card rounded-xl p-4">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className={`text-xl font-bold mt-1 ${k.color}`}>
              {isLoadingProfit ? <span className="animate-pulse">Loading...</span> : k.value}
            </p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="pnl">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="pnl">Profit & Loss</TabsTrigger>
          <TabsTrigger value="expense">Expense Breakdown</TabsTrigger>
          <TabsTrigger value="trial">Trial Balance</TabsTrigger>
          <TabsTrigger value="balance">Balance Sheet</TabsTrigger>
        </TabsList>

        {/* PROFIT & LOSS TAB */}
        <TabsContent value="pnl" className="space-y-4 mt-4">
          {monthly.length > 0 ? (
            <>
              <div className="glass-card rounded-xl p-4">
                <h2 className="font-medium mb-4">Monthly Profit & Loss</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                    <Tooltip formatter={(v: number) => formatUGX(v)} />
                    <Legend />
                    <Line type="monotone" dataKey="income" stroke="#3b82f6" strokeWidth={2} name="Income" dot />
                    <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Expenses" dot />
                    <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" name="Net Profit" dot />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="glass-card rounded-xl p-4">
                <DataTable
                  data={monthly.map((m) => ({ ...m, margin: m.income > 0 ? `${((m.profit / m.income) * 100).toFixed(1)}%` : "—" }))}
                  columns={[
                    { key: "month", header: "Month", cell: (r) => r.month },
                    { key: "income", header: "Income", cell: (r) => <span className="text-green-600">{formatUGX(r.income)}</span> },
                    { key: "expenses", header: "Expenses", cell: (r) => <span className="text-red-600">{formatUGX(r.expenses)}</span> },
                    { key: "profit", header: "Net Profit", cell: (r) => <span className={r.profit >= 0 ? "text-blue-600 font-semibold" : "text-red-700 font-semibold"}>{formatUGX(r.profit)}</span> },
                    { key: "margin", header: "Margin", cell: (r: any) => r.margin },
                  ]}
                  label="month"
                  emptyMessage="No monthly breakdown available."
                />
              </div>
            </>
          ) : (
            <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
              {isLoadingProfit ? "Loading profit data..." : "No profit & loss data available for this period."}
            </div>
          )}
        </TabsContent>

        {/* EXPENSE BREAKDOWN TAB */}
        <TabsContent value="expense" className="space-y-4 mt-4">
          {expenseBreakdown.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="glass-card rounded-xl p-4">
                <h2 className="font-medium mb-4">Expense Distribution</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={expenseBreakdown} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {expenseBreakdown.map((_, i) => <Cell key={i} fill={EXPENSE_COLORS[i % EXPENSE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatUGX(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="glass-card rounded-xl p-4">
                <h2 className="font-medium mb-4">Expense Categories</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={expenseBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => formatUGX(v)} />
                    <Bar dataKey="value" name="Amount" radius={[4, 4, 0, 0]}>
                      {expenseBreakdown.map((_, i) => <Cell key={i} fill={EXPENSE_COLORS[i % EXPENSE_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
              {isLoadingProfit ? "Loading expense data..." : "No expense breakdown available for this period."}
            </div>
          )}
        </TabsContent>

        {/* TRIAL BALANCE TAB */}
        <TabsContent value="trial" className="space-y-4 mt-4">
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium">Trial Balance — {period}</h2>
              {trialBalance && (
                <div className="flex gap-4 text-sm">
                  <span>Total Debits: <span className="font-semibold">{formatUGX(trialBalance.totalDebits)}</span></span>
                  <span>Total Credits: <span className="font-semibold">{formatUGX(trialBalance.totalCredits)}</span></span>
                </div>
              )}
            </div>
            {isLoadingTrial ? (
              <div className="text-center text-muted-foreground py-8">Loading trial balance...</div>
            ) : (
              <DataTable
                data={trialRows}
                columns={trialCols}
                label="account"
                emptyMessage="No trial balance data available for this period."
              />
            )}
          </div>
        </TabsContent>

        {/* BALANCE SHEET TAB */}
        <TabsContent value="balance" className="space-y-4 mt-4">
          {isLoadingBalance ? (
            <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">Loading balance sheet...</div>
          ) : balanceSheet ? (
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { title: "Assets", data: balanceSheet.assets, total: balanceSheet.totalAssets, color: "text-blue-600" },
                { title: "Liabilities", data: balanceSheet.liabilities, total: balanceSheet.totalLiabilities, color: "text-red-600" },
                { title: "Equity", data: balanceSheet.equity, total: balanceSheet.totalEquity, color: "text-green-600" },
              ].map(({ title, data, total, color }) => (
                <div key={title} className="glass-card rounded-xl p-4">
                  <h3 className="font-semibold mb-3">{title}</h3>
                  {data && Object.entries(data).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm py-1 border-b last:border-0">
                      <span className="text-muted-foreground">{k}</span>
                      <span>{formatUGX(v as number)}</span>
                    </div>
                  ))}
                  <div className={`flex justify-between font-bold mt-3 pt-2 border-t ${color}`}>
                    <span>Total</span>
                    <span>{formatUGX(total ?? 0)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
              No balance sheet data available for this period.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LandlordReports;
