import { useState } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const incomeData = [
  { month: "Jan", rent: 1200000, utility: 80000, other: 50000 },
  { month: "Feb", rent: 1200000, utility: 95000, other: 0 },
  { month: "Mar", rent: 1350000, utility: 90000, other: 100000 },
  { month: "Apr", rent: 1400000, utility: 85000, other: 0 },
  { month: "May", rent: 1850000, utility: 120000, other: 0 },
];

const expenseData = [
  { month: "Jan", maintenance: 60000, utilities: 40000, insurance: 200000, cleaning: 30000, taxes: 75000, other: 20000 },
  { month: "Feb", maintenance: 45000, utilities: 50000, insurance: 0, cleaning: 30000, taxes: 0, other: 0 },
  { month: "Mar", maintenance: 120000, utilities: 45000, insurance: 0, cleaning: 35000, taxes: 0, other: 15000 },
  { month: "Apr", maintenance: 35000, utilities: 48000, insurance: 0, cleaning: 30000, taxes: 0, other: 0 },
  { month: "May", maintenance: 85000, utilities: 120000, insurance: 0, cleaning: 45000, taxes: 0, other: 0 },
];

const EXPENSE_COLORS = ["#3b82f6", "#f59e0b", "#8b5cf6", "#10b981", "#ef4444", "#6b7280"];
const EXPENSE_KEYS = ["maintenance", "utilities", "insurance", "cleaning", "taxes", "other"];

const profitData = incomeData.map((inc, i) => {
  const totalIncome = inc.rent + inc.utility + inc.other;
  const exp = expenseData[i];
  const totalExpense = Object.values(exp).slice(1).reduce((s: number, v) => s + (v as number), 0);
  return { month: inc.month, income: totalIncome, expense: totalExpense, profit: totalIncome - totalExpense };
});

const tenantHistory = [
  { id: 1, name: "John Mwangi", property: "Sunset Apartments", unit: "A1", moveIn: "2024-01-15", moveOut: null, status: "Active", occupation: "Teacher", rentPaid: 12, rentMissed: 0 },
  { id: 2, name: "Alice Kago", property: "Sunset Apartments", unit: "A2", moveIn: "2023-06-01", moveOut: "2025-03-31", status: "Left", occupation: "Nurse", rentPaid: 18, rentMissed: 2 },
  { id: 3, name: "Sarah Nakato", property: "Greenview Estate", unit: "B1", moveIn: "2024-04-01", moveOut: null, status: "Active", occupation: "Engineer", rentPaid: 12, rentMissed: 0 },
  { id: 4, name: "Peter Otieno", property: "Greenview Estate", unit: "B2", moveIn: "2024-07-01", moveOut: null, status: "Pending Payment", occupation: "Driver", rentPaid: 8, rentMissed: 2 },
  { id: 5, name: "Mary Auma", property: "Palm Court", unit: "C2", moveIn: "2023-11-01", moveOut: null, status: "Active", occupation: "Business", rentPaid: 17, rentMissed: 1 },
];

const pieData = [
  { name: "Maintenance", value: 345000 },
  { name: "Utilities", value: 303000 },
  { name: "Insurance", value: 200000 },
  { name: "Cleaning", value: 170000 },
  { name: "Taxes", value: 75000 },
  { name: "Other", value: 35000 },
];

const formatUGX = (n: number) => `UGX ${n.toLocaleString()}`;

const statusColors: Record<string, string> = {
  Active: "default",
  Left: "secondary",
  "Pending Payment": "destructive",
};

const LandlordReports = () => {
  const [period, setPeriod] = useState("2025");

  const totalIncome = profitData.reduce((s, d) => s + d.income, 0);
  const totalExpense = profitData.reduce((s, d) => s + d.expense, 0);
  const netProfit = totalIncome - totalExpense;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Income, expenses, profit & loss and tenant history</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />Export
          </Button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Income", value: formatUGX(totalIncome), color: "text-green-600" },
          { label: "Total Expenses", value: formatUGX(totalExpense), color: "text-red-600" },
          { label: "Net Profit", value: formatUGX(netProfit), color: netProfit >= 0 ? "text-blue-600" : "text-red-700" },
          { label: "Active Tenants", value: tenantHistory.filter((t) => t.status === "Active").length, color: "text-purple-600" },
        ].map((k) => (
          <div key={k.label} className="glass-card rounded-xl p-4">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className={`text-xl font-bold mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="income">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="expense">Expense</TabsTrigger>
          <TabsTrigger value="pnl">Profit & Loss</TabsTrigger>
          <TabsTrigger value="tenants">Tenant History</TabsTrigger>
        </TabsList>

        {/* INCOME TAB */}
        <TabsContent value="income" className="space-y-4 mt-4">
          <div className="glass-card rounded-xl p-4">
            <h2 className="font-medium mb-4">Monthly Income Breakdown</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={incomeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                <Tooltip formatter={(v: number) => formatUGX(v)} />
                <Legend />
                <Bar dataKey="rent" fill="#3b82f6" name="Rent" radius={[4, 4, 0, 0]} />
                <Bar dataKey="utility" fill="#10b981" name="Utility" radius={[4, 4, 0, 0]} />
                <Bar dataKey="other" fill="#f59e0b" name="Other" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="glass-card rounded-xl p-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead><TableHead>Rent</TableHead><TableHead>Utility</TableHead><TableHead>Other</TableHead><TableHead className="font-semibold">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomeData.map((r) => (
                  <TableRow key={r.month}>
                    <TableCell>{r.month}</TableCell>
                    <TableCell>{formatUGX(r.rent)}</TableCell>
                    <TableCell>{formatUGX(r.utility)}</TableCell>
                    <TableCell>{formatUGX(r.other)}</TableCell>
                    <TableCell className="font-semibold text-green-600">{formatUGX(r.rent + r.utility + r.other)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-slate-50 font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell>{formatUGX(incomeData.reduce((s, r) => s + r.rent, 0))}</TableCell>
                  <TableCell>{formatUGX(incomeData.reduce((s, r) => s + r.utility, 0))}</TableCell>
                  <TableCell>{formatUGX(incomeData.reduce((s, r) => s + r.other, 0))}</TableCell>
                  <TableCell className="text-green-700">{formatUGX(totalIncome)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* EXPENSE TAB */}
        <TabsContent value="expense" className="space-y-4 mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="glass-card rounded-xl p-4">
              <h2 className="font-medium mb-4">Monthly Expenses</h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={expenseData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatUGX(v)} />
                  <Legend />
                  {EXPENSE_KEYS.map((k, i) => (
                    <Bar key={k} dataKey={k} fill={EXPENSE_COLORS[i]} name={k.charAt(0).toUpperCase() + k.slice(1)} stackId="a" />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="glass-card rounded-xl p-4">
              <h2 className="font-medium mb-4">Expense Distribution</h2>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((_, i) => <Cell key={i} fill={EXPENSE_COLORS[i % EXPENSE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatUGX(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        {/* PROFIT & LOSS TAB */}
        <TabsContent value="pnl" className="space-y-4 mt-4">
          <div className="glass-card rounded-xl p-4">
            <h2 className="font-medium mb-4">Profit & Loss Overview</h2>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={profitData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                <Tooltip formatter={(v: number) => formatUGX(v)} />
                <Legend />
                <Line type="monotone" dataKey="income" stroke="#3b82f6" strokeWidth={2} name="Income" dot />
                <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} name="Expense" dot />
                <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" name="Net Profit" dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="glass-card rounded-xl p-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead><TableHead>Income</TableHead><TableHead>Expenses</TableHead><TableHead>Net Profit</TableHead><TableHead>Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profitData.map((r) => (
                  <TableRow key={r.month}>
                    <TableCell>{r.month}</TableCell>
                    <TableCell className="text-green-600">{formatUGX(r.income)}</TableCell>
                    <TableCell className="text-red-600">{formatUGX(r.expense)}</TableCell>
                    <TableCell className={r.profit >= 0 ? "text-blue-600 font-semibold" : "text-red-700 font-semibold"}>{formatUGX(r.profit)}</TableCell>
                    <TableCell>{r.income > 0 ? `${((r.profit / r.income) * 100).toFixed(1)}%` : "—"}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-slate-50 font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-green-700">{formatUGX(totalIncome)}</TableCell>
                  <TableCell className="text-red-700">{formatUGX(totalExpense)}</TableCell>
                  <TableCell className={netProfit >= 0 ? "text-blue-700" : "text-red-800"}>{formatUGX(netProfit)}</TableCell>
                  <TableCell>{((netProfit / totalIncome) * 100).toFixed(1)}%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* TENANT HISTORY TAB */}
        <TabsContent value="tenants" className="space-y-4 mt-4">
          <div className="glass-card rounded-xl p-4 overflow-x-auto">
            <h2 className="font-medium mb-4">Tenant History</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Property / Unit</TableHead>
                  <TableHead>Occupation</TableHead>
                  <TableHead>Move In</TableHead>
                  <TableHead>Move Out</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rent Paid</TableHead>
                  <TableHead>Missed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenantHistory.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>{t.property} — {t.unit}</TableCell>
                    <TableCell>{t.occupation}</TableCell>
                    <TableCell>{new Date(t.moveIn).toLocaleDateString()}</TableCell>
                    <TableCell>{t.moveOut ? new Date(t.moveOut).toLocaleDateString() : <span className="text-muted-foreground">Current</span>}</TableCell>
                    <TableCell>
                      <Badge variant={statusColors[t.status] as any}>{t.status}</Badge>
                    </TableCell>
                    <TableCell className="text-green-600 font-medium">{t.rentPaid}</TableCell>
                    <TableCell className={t.rentMissed > 0 ? "text-red-600 font-medium" : ""}>{t.rentMissed}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LandlordReports;
