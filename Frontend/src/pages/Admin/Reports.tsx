import { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import {
  Download, BarChart2, TrendingUp, PieChart as PieChartIcon, Home, DollarSign, Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const COLORS = ["#1D4ED8","#00C49F","#FFBB28","#FF8042","#8884d8","#82ca9d","#f97316"];

interface Payment {
  id: number;
  amount: number;
  paymentDate: string;
  paymentStatus: string;
  paymentMethod?: string;
  paymentType?: string;
}

interface Property {
  id: number;
  name: string;
  type?: string;
  numberOfRooms: number;
}

interface Tenant {
  id: number;
  active: boolean;
  dateMovedIn?: string;
}

const tabs = [
  { id: "overview", label: "Overview", icon: BarChart2 },
  { id: "financials", label: "Financials", icon: DollarSign },
  { id: "occupancy", label: "Occupancy", icon: TrendingUp },
  { id: "properties", label: "Properties", icon: Home },
];

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K`
  : n.toFixed(0);

const Reports = () => {
  const { toast } = useToast();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const user = localStorage.getItem("user");
  const token = user ? JSON.parse(user).token : null;
  const authHeader = { Authorization: `Bearer ${token}` };

  const [timeframe, setTimeframe] = useState("yearly");
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(true);

  const [payments, setPayments] = useState<Payment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const currentQuarter = Math.floor(currentMonth / 3);

  useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true);
      try {
        const [paymentsRes, propertiesRes, tenantsRes] = await Promise.allSettled([
          axios.get(`${apiUrl}/GetAllPayments`, { headers: authHeader }),
          axios.get(`${apiUrl}/GetAllProperties`, { headers: authHeader }),
          axios.get(`${apiUrl}/GetAllTenants`, { headers: authHeader }),
        ]);
        if (paymentsRes.status === "fulfilled") setPayments(paymentsRes.value.data ?? []);
        if (propertiesRes.status === "fulfilled") setProperties(propertiesRes.value.data ?? []);
        if (tenantsRes.status === "fulfilled") setTenants(tenantsRes.value.data ?? []);
      } catch {
        toast({ title: "Error loading report data", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, []);

  const monthIndices = useMemo(() => {
    if (timeframe === "monthly") return [currentMonth];
    if (timeframe === "quarterly") {
      const start = currentQuarter * 3;
      return [start, start + 1, start + 2];
    }
    return [0,1,2,3,4,5,6,7,8,9,10,11];
  }, [timeframe, currentMonth, currentQuarter]);

  const yearPayments = useMemo(() =>
    payments.filter(p => new Date(p.paymentDate).getFullYear() === currentYear),
    [payments, currentYear]
  );

  const filteredPayments = useMemo(() =>
    yearPayments.filter(p => monthIndices.includes(new Date(p.paymentDate).getMonth())),
    [yearPayments, monthIndices]
  );

  const totalRevenue = useMemo(() =>
    filteredPayments.reduce((s, p) => s + (p.amount ?? 0), 0),
    [filteredPayments]
  );

  const totalRooms = useMemo(() =>
    properties.reduce((s, p) => s + (p.numberOfRooms ?? 0), 0),
    [properties]
  );

  const activeTenants = useMemo(() => tenants.filter(t => t.active).length, [tenants]);

  const avgOccupancy = totalRooms > 0
    ? Math.min(Math.round((activeTenants / totalRooms) * 100), 100)
    : 0;

  const propertyTypeCount = useMemo(() =>
    new Set(properties.map(p => p.type ?? "Unknown").filter(Boolean)).size,
    [properties]
  );

  const peakMonth = useMemo(() => {
    const byMonth: Record<number, number> = {};
    yearPayments.forEach(p => {
      const m = new Date(p.paymentDate).getMonth();
      byMonth[m] = (byMonth[m] ?? 0) + p.amount;
    });
    const entries = Object.entries(byMonth);
    if (!entries.length) return "—";
    const peak = entries.reduce((a, b) => (Number(a[1]) > Number(b[1]) ? a : b));
    return MONTHS[parseInt(peak[0])];
  }, [yearPayments]);

  const monthlyRevenue = useMemo(() =>
    monthIndices.map(i => {
      const amount = yearPayments
        .filter(p => new Date(p.paymentDate).getMonth() === i)
        .reduce((s, p) => s + (p.amount ?? 0), 0);
      return { month: MONTHS[i], amount: Math.round(amount) };
    }),
    [yearPayments, monthIndices]
  );

  const occupancyChart = useMemo(() =>
    monthIndices.map(i => {
      const endOfMonth = new Date(currentYear, i + 1, 0);
      const occupied = tenants.filter(t => {
        if (!t.dateMovedIn) return t.active;
        return new Date(t.dateMovedIn) <= endOfMonth;
      }).length;
      const rate = totalRooms > 0 ? Math.min(Math.round((occupied / totalRooms) * 100), 100) : 0;
      return { month: MONTHS[i], rate };
    }),
    [tenants, monthIndices, currentYear, totalRooms]
  );

  const propertyTypeData = useMemo(() => {
    const counts: Record<string, number> = {};
    properties.forEach(p => {
      const t = p.type || "Unknown";
      counts[t] = (counts[t] ?? 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [properties]);

  const paymentMethodData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredPayments.forEach(p => {
      const m = p.paymentMethod || "Unknown";
      counts[m] = (counts[m] ?? 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredPayments]);

  const revenueByType = useMemo(() => {
    const totals: Record<string, number> = {};
    filteredPayments.forEach(p => {
      const t = p.paymentType || "Other";
      totals[t] = (totals[t] ?? 0) + p.amount;
    });
    return Object.entries(totals).map(([name, amount]) => ({ name, amount: Math.round(amount) }));
  }, [filteredPayments]);

  const handleExport = () => {
    const rows = [
      ["Month", "Revenue (UGX)"],
      ...monthlyRevenue.map(r => [r.month, r.amount]),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reports-${timeframe}-${currentYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#1D4ED8]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#1E3A5F] to-[#1D4ED8] px-8 py-8 text-white shadow-xl">
        <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-8 left-1/3 h-40 w-40 rounded-full bg-white/5" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-200">
              Admin
            </span>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Reports &amp; Analytics
            </h1>
            <p className="text-sm text-blue-200/80">
              View performance metrics and generate reports
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="h-10 rounded-xl border border-white/20 bg-white/10 px-3.5 text-sm text-white shadow-sm outline-none transition-all focus:border-white/40 focus:ring-2 focus:ring-white/20 cursor-pointer"
            >
              <option value="monthly" className="text-[#0F172A]">Monthly</option>
              <option value="quarterly" className="text-[#0F172A]">Quarterly</option>
              <option value="yearly" className="text-[#0F172A]">Yearly</option>
            </select>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export Data
            </button>
          </div>
        </div>
      </section>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 border-l-4 border-l-blue-500 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Avg Occupancy</p>
              <p className="mt-1.5 text-2xl font-bold text-[#0F172A]">{avgOccupancy}%</p>
              <p className="text-xs text-slate-400 mt-1">{activeTenants} active / {totalRooms} rooms</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 border-l-4 border-l-green-500 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Revenue</p>
              <p className="mt-1.5 text-2xl font-bold text-[#0F172A]">UGX {fmt(totalRevenue)}</p>
              <p className="text-xs text-slate-400 mt-1">{filteredPayments.length} payments</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 border-l-4 border-l-purple-500 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Property Types</p>
              <p className="mt-1.5 text-2xl font-bold text-[#0F172A]">{propertyTypeCount}</p>
              <p className="text-xs text-slate-400 mt-1">{properties.length} total properties</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50">
              <PieChartIcon className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 border-l-4 border-l-orange-500 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Peak Month</p>
              <p className="mt-1.5 text-2xl font-bold text-[#0F172A]">{peakMonth}</p>
              <p className="text-xs text-slate-400 mt-1">Highest revenue {currentYear}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50">
              <BarChart2 className="h-5 w-5 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-[#E2E8F0] bg-slate-50 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              activeTab === t.id
                ? "bg-white shadow-sm text-[#1D4ED8]"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <t.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Occupancy Chart */}
            <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
              <div className="border-b border-[#E2E8F0] bg-slate-50/60 px-6 py-4">
                <h3 className="text-sm font-bold text-[#0F172A]">Occupancy Rate</h3>
                <p className="text-xs text-slate-400">Monthly occupancy percentage</p>
              </div>
              <div className="p-6">
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={occupancyChart}>
                      <defs>
                        <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1D4ED8" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#1D4ED8" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
                      <Tooltip formatter={(v) => [`${v}%`, "Occupancy"]} />
                      <Area type="monotone" dataKey="rate" stroke="#1D4ED8" strokeWidth={2} fill="url(#colorRate)" dot={{ r: 3 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Revenue Chart */}
            <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
              <div className="border-b border-[#E2E8F0] bg-slate-50/60 px-6 py-4">
                <h3 className="text-sm font-bold text-[#0F172A]">Monthly Revenue</h3>
                <p className="text-xs text-slate-400">Collected payments in UGX</p>
              </div>
              <div className="p-6">
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => fmt(v)} />
                      <Tooltip formatter={(v: number) => [`UGX ${fmt(v)}`, "Revenue"]} />
                      <Bar dataKey="amount" fill="#1D4ED8" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Property Distribution */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
            <div className="border-b border-[#E2E8F0] bg-slate-50/60 px-6 py-4">
              <h3 className="text-sm font-bold text-[#0F172A]">Property Distribution</h3>
              <p className="text-xs text-slate-400">Properties by type</p>
            </div>
            <div className="p-6">
              {propertyTypeData.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-10">No property data available.</p>
              ) : (
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={propertyTypeData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {propertyTypeData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Financials */}
      {activeTab === "financials" && (
        <div className="space-y-6">
          {/* Revenue by Payment Type */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
            <div className="border-b border-[#E2E8F0] bg-slate-50/60 px-6 py-4">
              <h3 className="text-sm font-bold text-[#0F172A]">Revenue by Payment Type</h3>
              <p className="text-xs text-slate-400">UGX collected per payment type</p>
            </div>
            <div className="p-6">
              {revenueByType.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-10">No payment data for this period.</p>
              ) : (
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueByType} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => fmt(v)} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={100} />
                      <Tooltip formatter={(v: number) => [`UGX ${fmt(v)}`, "Revenue"]} />
                      <Bar dataKey="amount" fill="#00C49F" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Payment Methods Breakdown */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
            <div className="border-b border-[#E2E8F0] bg-slate-50/60 px-6 py-4">
              <h3 className="text-sm font-bold text-[#0F172A]">Payment Methods</h3>
              <p className="text-xs text-slate-400">Number of transactions by method</p>
            </div>
            <div className="p-6">
              {paymentMethodData.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-10">No payment data for this period.</p>
              ) : (
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={paymentMethodData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {paymentMethodData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Revenue summary table */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
            <div className="border-b border-[#E2E8F0] bg-slate-50/60 px-6 py-4">
              <h3 className="text-sm font-bold text-[#0F172A]">Monthly Revenue Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-slate-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Month</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Revenue (UGX)</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyRevenue.map((r, i) => (
                    <tr key={i} className="border-b border-[#E2E8F0] hover:bg-slate-50/50">
                      <td className="px-6 py-3 font-medium text-[#0F172A]">{r.month}</td>
                      <td className="px-6 py-3 text-right text-[#0F172A]">{r.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="bg-blue-50">
                    <td className="px-6 py-3 font-bold text-[#0F172A]">Total</td>
                    <td className="px-6 py-3 text-right font-bold text-[#1D4ED8]">{totalRevenue.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Occupancy */}
      {activeTab === "occupancy" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Active Tenants</p>
              <p className="text-3xl font-bold text-[#1D4ED8]">{activeTenants}</p>
            </div>
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Total Rooms</p>
              <p className="text-3xl font-bold text-[#0F172A]">{totalRooms}</p>
            </div>
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Occupancy Rate</p>
              <p className="text-3xl font-bold text-green-600">{avgOccupancy}%</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
            <div className="border-b border-[#E2E8F0] bg-slate-50/60 px-6 py-4">
              <h3 className="text-sm font-bold text-[#0F172A]">Occupancy Over Time</h3>
              <p className="text-xs text-slate-400">Estimated monthly occupancy based on tenant move-in dates</p>
            </div>
            <div className="p-6">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={occupancyChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
                    <Tooltip formatter={(v) => [`${v}%`, "Occupancy"]} />
                    <Line type="monotone" dataKey="rate" stroke="#1D4ED8" strokeWidth={2} dot={{ r: 4, fill: "#1D4ED8" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Properties */}
      {activeTab === "properties" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
              <div className="border-b border-[#E2E8F0] bg-slate-50/60 px-6 py-4">
                <h3 className="text-sm font-bold text-[#0F172A]">Properties by Type</h3>
                <p className="text-xs text-slate-400">Distribution of property categories</p>
              </div>
              <div className="p-6">
                {propertyTypeData.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-10">No properties registered.</p>
                ) : (
                  <div className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={propertyTypeData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {propertyTypeData.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
              <div className="border-b border-[#E2E8F0] bg-slate-50/60 px-6 py-4">
                <h3 className="text-sm font-bold text-[#0F172A]">Rooms per Property Type</h3>
                <p className="text-xs text-slate-400">Total room capacity by type</p>
              </div>
              <div className="p-6">
                {propertyTypeData.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-10">No properties registered.</p>
                ) : (
                  <div className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={(() => {
                        const rooms: Record<string, number> = {};
                        properties.forEach(p => {
                          const t = p.type || "Unknown";
                          rooms[t] = (rooms[t] ?? 0) + (p.numberOfRooms ?? 0);
                        });
                        return Object.entries(rooms).map(([name, rooms]) => ({ name, rooms }));
                      })()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="rooms" fill="#FFBB28" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Properties list */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
            <div className="border-b border-[#E2E8F0] bg-slate-50/60 px-6 py-4">
              <h3 className="text-sm font-bold text-[#0F172A]">All Properties</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-slate-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Type</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Rooms</th>
                  </tr>
                </thead>
                <tbody>
                  {properties.length === 0 ? (
                    <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-400">No properties found.</td></tr>
                  ) : properties.map(p => (
                    <tr key={p.id} className="border-b border-[#E2E8F0] hover:bg-slate-50/50">
                      <td className="px-6 py-3 font-medium text-[#0F172A]">{p.name}</td>
                      <td className="px-6 py-3 text-slate-500">{p.type || "—"}</td>
                      <td className="px-6 py-3 text-right text-slate-700">{p.numberOfRooms}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
