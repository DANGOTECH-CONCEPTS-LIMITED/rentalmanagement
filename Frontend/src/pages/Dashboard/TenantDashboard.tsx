import React, { useEffect, useRef, useState } from "react";
import {
  Home, Calendar, DollarSign, FileText, CreditCard, Smartphone,
  Wallet, ArrowRight, Clock, CheckCircle2, ChevronRight, Building2,
  TrendingUp, AlertCircle,
} from "lucide-react";
import DashboardExportToolbar from "@/components/common/DashboardExportToolbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useCurrencyFormatter } from "@/hooks/use-currency-formatter";
import { toast } from "@/hooks/use-toast";
import axios from "axios";
import { exportDashboardPdf, exportDashboardWorkbook } from "@/lib/dashboard-export";

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const daysUntil = (dateStr?: string) => {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
};

const KpiCard = ({
  label, value, sub, icon: Icon, iconBg, iconColor, badge,
}: {
  label: string; value: string | number; sub?: string;
  icon: any; iconBg: string; iconColor: string; badge?: React.ReactNode;
}) => (
  <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
      {badge}
    </div>
    <div className="mt-4">
      <p className="text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="mt-0.5 text-sm font-medium text-slate-500">{label}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  </div>
);

const PaymentMethodCard = ({
  icon: Icon, label, desc, color, bg, onClick,
}: {
  icon: any; label: string; desc: string; color: string; bg: string; onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="group flex flex-col items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
  >
    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${bg}`}>
      <Icon className={`h-6 w-6 ${color}`} />
    </div>
    <div className="flex-1">
      <p className="font-semibold text-slate-900">{label}</p>
      <p className="mt-0.5 text-xs text-slate-500">{desc}</p>
    </div>
    <div className={`flex items-center gap-1 text-xs font-semibold ${color}`}>
      Pay now <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
    </div>
  </button>
);

const TenantDashboard = () => {
  const navigate = useNavigate();
  const formatCurrency = useCurrencyFormatter();
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const user = localStorage.getItem("user");
  if (!user) throw new Error("No user found in localStorage");
  const userData = JSON.parse(user);
  const firstName = userData.fullName?.split(" ")[0] ?? "Tenant";

  useEffect(() => {
    fetchTenant();
  }, []);

  const fetchTenant = async () => {
    const apiUrl = import.meta.env.VITE_API_BASE_URL;
    const token = userData?.token;
    try {
      const { data } = await axios.get(`${apiUrl}/GetTenantById/${userData.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTenant(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data ?? "Failed to load tenant details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentMethodSelect = (method: string) =>
    navigate(`/tenant-dashboard/make-payment?method=${method}`);

  const nextPayment = tenant?.nextPaymentDate;
  const days = daysUntil(nextPayment);
  const rent = tenant?.property?.price ?? 0;
  const currency = tenant?.property?.currency ?? "UGX";
  const propertyName = tenant?.property?.propertyName ?? tenant?.property?.name ?? "—";

  const isUrgent = days !== null && days <= 3;
  const isSoon = days !== null && days <= 7 && days > 3;

  const handleExportPdf = async () => {
    if (!dashboardRef.current) return;
    try {
      await exportDashboardPdf(dashboardRef.current, { fileNamePrefix: "tenant-dashboard-overview" });
      toast({ title: "Export Successful", description: "Dashboard exported to PDF." });
    } catch (error) {
      toast({ title: "Export Failed", description: error instanceof Error ? error.message : "Export failed.", variant: "destructive" });
    }
  };

  const handleExportExcel = async () => {
    try {
      await exportDashboardWorkbook({
        title: "Tenant Dashboard",
        fileNamePrefix: "tenant-dashboard-overview",
        metadata: [
          { label: "Tenant Name", value: tenant?.fullName ?? userData?.fullName ?? "N/A" },
          { label: "Property Name", value: propertyName },
          { label: "Next Payment Date", value: nextPayment?.split("T")[0] ?? "N/A" },
        ],
        summary: [
          { label: "Current Property", value: 1 },
          { label: "Monthly Rent", value: rent },
          { label: "Currency", value: currency },
        ],
        sections: [
          {
            sheetName: "Tenant Details",
            columns: ["Field", "Value"],
            rows: [
              ["Tenant ID", tenant?.id ?? userData?.id ?? "N/A"],
              ["Name", tenant?.fullName ?? userData?.fullName ?? "N/A"],
              ["Email", tenant?.email ?? userData?.email ?? "N/A"],
              ["Phone", tenant?.phoneNumber ?? "N/A"],
              ["Property", propertyName],
              ["Monthly Rent", rent],
              ["Currency", currency],
              ["Next Payment Date", nextPayment?.split("T")[0] ?? "N/A"],
            ],
          },
        ],
      });
      toast({ title: "Export Successful", description: "Dashboard exported to Excel." });
    } catch (error) {
      toast({ title: "Export Failed", description: error instanceof Error ? error.message : "Export failed.", variant: "destructive" });
    }
  };

  return (
    <div ref={dashboardRef} className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl p-7 text-white shadow-xl" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0f2044 45%, #1a3a6e 100%)" }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        {/* background decoration */}

        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-200">{greeting()},</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{firstName}</h1>
            {propertyName !== "—" && (
              <div className="mt-3 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-300" />
                <span className="text-sm text-blue-100">{propertyName}</span>
              </div>
            )}
          </div>

          {/* Rent due chip */}
          <div className={`rounded-2xl px-4 py-3 text-sm ${isUrgent ? "bg-red-500/20 border border-red-400/30" : isSoon ? "bg-amber-500/20 border border-amber-400/30" : "bg-white/10 border border-white/20"}`}>
            <p className="text-xs font-medium text-blue-200 mb-0.5">Next Payment</p>
            <p className="font-bold text-white text-base">
              {nextPayment ? new Date(nextPayment).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : loading ? "Loading…" : "—"}
            </p>
            {days !== null && (
              <p className={`text-xs mt-0.5 font-medium ${isUrgent ? "text-red-300" : isSoon ? "text-amber-300" : "text-blue-200"}`}>
                {days === 0 ? "Due today!" : `${days} day${days !== 1 ? "s" : ""} remaining`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Export toolbar */}
      <div className="flex justify-end">
        <DashboardExportToolbar onExportExcel={handleExportExcel} onExportPdf={handleExportPdf} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Monthly Rent"
          value={loading ? "…" : `${currency} ${rent.toLocaleString()}`}
          sub="Current lease amount"
          icon={DollarSign}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <KpiCard
          label="Next Due Date"
          value={loading ? "…" : nextPayment ? new Date(nextPayment).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}
          sub={days !== null ? `${days} days away` : ""}
          icon={Calendar}
          iconBg={isUrgent ? "bg-red-50" : "bg-amber-50"}
          iconColor={isUrgent ? "text-red-500" : "text-amber-500"}
          badge={
            isUrgent ? (
              <Badge className="bg-red-50 text-red-600 border-red-200 text-[10px]">Urgent</Badge>
            ) : isSoon ? (
              <Badge className="bg-amber-50 text-amber-600 border-amber-200 text-[10px]">Soon</Badge>
            ) : undefined
          }
        />
        <KpiCard
          label="Current Property"
          value={loading ? "…" : propertyName !== "—" ? propertyName : "—"}
          sub="Your residence"
          icon={Home}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <KpiCard
          label="Documents"
          value="5"
          sub="Lease, receipts & more"
          icon={FileText}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
        />
      </div>

      {/* Payment Methods */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Make a Payment</p>
              <p className="text-xs text-slate-400">Choose your preferred payment method</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/tenant-dashboard/payment-history")}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            View history <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-3">
          <PaymentMethodCard
            icon={CreditCard}
            label="Credit / Debit Card"
            desc="Pay securely with Visa or Mastercard"
            color="text-blue-600"
            bg="bg-blue-50"
            onClick={() => handlePaymentMethodSelect("card")}
          />
          <PaymentMethodCard
            icon={Smartphone}
            label="Mobile Money"
            desc="MTN or Airtel Mobile Money"
            color="text-emerald-600"
            bg="bg-emerald-50"
            onClick={() => handlePaymentMethodSelect("mobile_money")}
          />
          <PaymentMethodCard
            icon={Wallet}
            label="Bank Transfer"
            desc="Direct bank deposit or transfer"
            color="text-violet-600"
            bg="bg-violet-50"
            onClick={() => handlePaymentMethodSelect("bank_transfer")}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Payment History", desc: "View past payments", path: "/tenant-dashboard/payment-history", icon: Clock, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "My Invoices", desc: "View & download invoices", path: "/tenant-dashboard/invoices", icon: FileText, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "My Complaints", desc: "Submit or track issues", path: "/tenant-dashboard/submit-complaint", icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Available Units", desc: "Browse open properties", path: "/tenant-dashboard/available-properties", icon: Home, color: "text-violet-600", bg: "bg-violet-50" },
        ].map(({ label, desc, path, icon: Icon, color, bg }) => (
          <button
            key={label}
            onClick={() => navigate(path)}
            className="group flex flex-col items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">{label}</p>
              <p className="mt-0.5 text-xs text-slate-500">{desc}</p>
            </div>
            <ChevronRight className={`h-4 w-4 ${color} transition-transform group-hover:translate-x-0.5`} />
          </button>
        ))}
      </div>
    </div>
  );
};

export default TenantDashboard;
