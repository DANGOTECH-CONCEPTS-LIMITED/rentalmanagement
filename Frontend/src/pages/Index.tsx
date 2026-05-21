import { Link } from "react-router-dom";
import {
  Home, Users, FileText, ArrowRight, Zap, CreditCard, Receipt,
  Wrench, FolderOpen, BarChart3, MessageSquare, ShieldCheck, CheckCircle2,
} from "lucide-react";

const features = [
  {
    category: "Payments",
    icon: CreditCard,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-100",
    name: "Rent Collection & Tracking",
    description: "Accept rent payments via card, mobile money, or bank transfer. Automatically track payment history, balance due, and arrears for every tenant.",
  },
  {
    category: "Invoicing",
    icon: Receipt,
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-100",
    name: "Invoice Management",
    description: "Generate, send, and manage tenant invoices automatically. Download PDF invoices and maintain a full billing history with status tracking.",
  },
  {
    category: "Maintenance",
    icon: Wrench,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-100",
    name: "Maintenance & Complaint Handling",
    description: "Tenants submit maintenance requests (plumbing, electrical, structural) via the complaints system. Landlords review, assign priority, and resolve issues with full status tracking.",
  },
  {
    category: "Documents",
    icon: FolderOpen,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    name: "Document Storage & Compliance",
    description: "Digital record-keeping to reduce paperwork audits. Set automated reminders for document renewals and compliance deadlines.",
  },
  {
    category: "Utility",
    icon: Zap,
    color: "text-yellow-600",
    bg: "bg-yellow-50",
    border: "border-yellow-100",
    name: "Utility Billing & Token Generation",
    description: "Manage electricity meters, generate prepaid tokens, and track utility payments per unit. Supports MTN and Airtel mobile money.",
  },
  {
    category: "Complaints",
    icon: MessageSquare,
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-100",
    name: "Tenant Complaint Handling",
    description: "Tenants can submit complaints directly from the app. Landlords receive, review, and resolve issues with status tracking and history.",
  },
  {
    category: "Reporting",
    icon: BarChart3,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    border: "border-indigo-100",
    name: "Analytics & Financial Reports",
    description: "Generate detailed reports on revenue, occupancy rates, expenses, and utility usage. Export to PDF or Excel for stakeholder review.",
  },
  {
    category: "Security",
    icon: ShieldCheck,
    color: "text-slate-600",
    bg: "bg-slate-50",
    border: "border-slate-100",
    name: "Role-Based Access Control",
    description: "Separate dashboards for Admin, Landlord, Tenant, and Utility roles. Each role sees only what they need — secure and audit-logged.",
  },
];

const roles = [
  {
    title: "Admin Dashboard",
    icon: Home,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    accent: "border-t-blue-600",
    desc: "Full platform control — manage landlords, properties, users, and view system-wide analytics.",
    items: ["Register landlords and properties", "Generate analytics reports", "Manage system users", "View audit trail & HTTP logs"],
    itemColor: "text-blue-500",
  },
  {
    title: "Landlord Dashboard",
    icon: Users,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    accent: "border-t-emerald-600",
    desc: "Manage your portfolio — register tenants, track payments, handle complaints, and generate invoices.",
    items: ["Register tenants and assign units", "Manage rental contracts", "Track payments & expenses", "Utility charge configuration"],
    itemColor: "text-emerald-500",
  },
  {
    title: "Tenant Dashboard",
    icon: FileText,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    accent: "border-t-amber-600",
    desc: "Self-service tenant portal — view property details, make payments, download invoices, and submit complaints.",
    items: ["View property & lease details", "Make rent payments", "Download invoices", "Submit and track complaints"],
    itemColor: "text-amber-500",
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1D4ED8]">
              <Home className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-bold text-[#0F172A]">Marple Properties</span>
          </div>
          <Link
            to="/"
            className="flex items-center gap-2 rounded-xl bg-[#1D4ED8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e40af] transition-colors"
          >
            Sign In <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-16 space-y-24">

        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl px-8 py-16 text-white shadow-2xl md:px-14 md:py-20" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0f2044 45%, #1a3a6e 100%)" }}>
          <div className="pointer-events-none absolute -right-16 -top-16 h-80 w-80 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute -bottom-12 left-1/3 h-60 w-60 rounded-full bg-white/5" />

          <div className="relative grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div className="space-y-7">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-200">
                Rental Operations Platform
              </span>
              <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
                Property Management<br />
                <span className="text-blue-300">Workflow System</span>
              </h1>
              <p className="max-w-xl text-base text-slate-300 md:text-lg leading-relaxed">
                A unified workspace for property administration, landlord operations, tenant service, utility management, and audit visibility.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-[#1D4ED8] hover:bg-blue-50 transition-colors shadow-sm"
                >
                  Sign In to Dashboard <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <p className="text-xs text-slate-400">
                Demo: admin@example.com · landlord@example.com · tenant@example.com
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: "3", label: "Role dashboards", sub: "Admin, Landlord, Tenant" },
                { value: "8+", label: "Platform features", sub: "Payments, Utility, Reports…" },
                { value: "100%", label: "Role-based access", sub: "Secure & audited" },
                { value: "Real-time", label: "Data sync", sub: "Live payment tracking" },
              ].map(s => (
                <div key={s.label} className="rounded-2xl border border-white/15 bg-white/10 p-4">
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="mt-0.5 text-sm font-medium text-white">{s.label}</p>
                  <p className="mt-0.5 text-xs text-blue-300">{s.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Role cards */}
        <section className="space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">Three Dashboards, One Platform</h2>
            <p className="mt-2 text-sm text-slate-500 max-w-xl mx-auto">Each role gets a purpose-built workspace tailored to their responsibilities.</p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {roles.map(r => (
              <div key={r.title} className={`rounded-2xl border-t-4 border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow ${r.accent}`}>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${r.iconBg} mb-4`}>
                  <r.icon className={`h-6 w-6 ${r.iconColor}`} />
                </div>
                <h3 className="text-base font-bold text-[#0F172A] mb-1">{r.title}</h3>
                <p className="text-sm text-slate-500 mb-4 leading-relaxed">{r.desc}</p>
                <ul className="space-y-2">
                  {r.items.map(item => (
                    <li key={item} className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${r.itemColor}`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Features table */}
        <section className="space-y-8">
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-600">
              Platform Capabilities
            </span>
            <h2 className="mt-3 text-2xl font-bold text-[#0F172A] tracking-tight">Everything You Need to Manage Properties</h2>
            <p className="mt-2 text-sm text-slate-500 max-w-xl mx-auto">A comprehensive suite of tools covering the full property management lifecycle.</p>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 w-36">Category</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 w-64">Feature</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Description</th>
                </tr>
              </thead>
              <tbody>
                {features.map((f, i) => (
                  <tr key={f.category} className={`border-b border-slate-100 last:border-0 hover:bg-blue-50/30 transition-colors ${i % 2 === 0 ? "" : "bg-slate-50/40"}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${f.bg}`}>
                          <f.icon className={`h-4 w-4 ${f.color}`} />
                        </div>
                        <span className={`text-sm font-semibold ${f.color}`}>{f.category}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-slate-800">{f.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-500 leading-relaxed">{f.description}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {features.map(f => (
              <div key={f.category} className={`rounded-2xl border ${f.border} bg-white p-5 shadow-sm`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${f.bg}`}>
                    <f.icon className={`h-4 w-4 ${f.color}`} />
                  </div>
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wider ${f.color}`}>{f.category}</p>
                    <p className="text-sm font-bold text-slate-800">{f.name}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="rounded-3xl bg-gradient-to-br from-[#0F172A] to-[#1D4ED8] px-8 py-12 text-center text-white shadow-xl">
          <h2 className="text-2xl font-bold mb-2">Ready to get started?</h2>
          <p className="text-blue-200 text-sm mb-6 max-w-sm mx-auto">Sign in to access your dashboard and start managing properties with ease.</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-[#1D4ED8] hover:bg-blue-50 transition-colors shadow-sm"
          >
            Sign In to Dashboard <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-8">
        <div className="mx-auto max-w-7xl px-6 py-6 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#1D4ED8]">
              <Home className="h-3 w-3 text-white" />
            </div>
            <span className="font-semibold text-slate-600">Marple Properties</span>
          </div>
          <p>© {new Date().getFullYear()} Marple Properties Platform. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
