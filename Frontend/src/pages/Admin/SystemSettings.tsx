import { useState } from "react";
import {
  Settings, Bell, Shield, Plug, Save, Building2, Mail, Phone,
  DollarSign, Clock, Calendar,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

const inputCls =
  "h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] shadow-sm outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10";
const selCls =
  "h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-sm text-[#0F172A] shadow-sm outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 cursor-pointer";

interface ToggleProps {
  checked: boolean;
  onToggle: () => void;
}

const Toggle = ({ checked, onToggle }: ToggleProps) => (
  <button
    onClick={onToggle}
    style={{
      width: 44,
      height: 24,
      borderRadius: 12,
      background: checked ? "#1D4ED8" : "#CBD5E1",
      transition: "background 0.2s",
      position: "relative",
      border: "none",
      cursor: "pointer",
      flexShrink: 0,
    }}
    aria-pressed={checked}
  >
    <span
      style={{
        position: "absolute",
        top: 2,
        left: checked ? 20 : 2,
        width: 20,
        height: 20,
        borderRadius: 10,
        background: "white",
        transition: "left 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }}
    />
  </button>
);

const settingLabels: Record<string, { label: string; desc: string }> = {
  emailNotifications: {
    label: "Email Notifications",
    desc: "Send notifications via email to tenants and landlords",
  },
  smsNotifications: {
    label: "SMS Notifications",
    desc: "Send notifications via SMS for urgent alerts",
  },
  paymentReminders: {
    label: "Payment Reminders",
    desc: "Automatically remind tenants about upcoming rent payments",
  },
  maintenanceAlerts: {
    label: "Maintenance Alerts",
    desc: "Notify landlords when maintenance requests are submitted",
  },
  leaseEndReminders: {
    label: "Lease End Reminders",
    desc: "Alert landlords and tenants before lease expiry",
  },
  marketingEmails: {
    label: "Marketing Emails",
    desc: "Send promotional and marketing communications",
  },
};

const tabs = [
  { id: "general", label: "General", icon: Settings },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
  { id: "integrations", label: "Integrations", icon: Plug },
];

const SystemSettings = () => {
  const [activeTab, setActiveTab] = useState("general");

  const [generalSettings, setGeneralSettings] = useState({
    companyName: "Property Management Co.",
    supportEmail: "support@property-mgmt.com",
    contactPhone: "256-123-4567",
    currency: "USD",
    timeZone: "America/New_York",
    dateFormat: "MM/DD/YYYY",
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    paymentReminders: true,
    maintenanceAlerts: true,
    leaseEndReminders: true,
    marketingEmails: false,
  });

  const handleGeneralSettingsChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setGeneralSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setGeneralSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleNotificationToggle = (setting: string) => {
    setNotificationSettings((prev) => ({
      ...prev,
      [setting]: !prev[setting as keyof typeof notificationSettings],
    }));
  };

  const saveSettings = (settingType: string) => {
    toast({
      title: "Settings Updated",
      description: `${settingType} settings have been saved successfully.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl px-8 py-8 text-white shadow-xl" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0f2044 45%, #1a3a6e 100%)" }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-200">
              Admin
            </span>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              System Settings
            </h1>
            <p className="text-sm text-blue-200/80">
              Configure system-wide settings and preferences
            </p>
          </div>
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10">
            <Settings className="h-8 w-8 text-blue-200" />
          </div>
        </div>
      </section>

      {/* Custom Tabs */}
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

      {/* Tab: General */}
      {activeTab === "general" && (
        <div className="space-y-5">
          {/* Company Info */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
            <div className="border-b border-[#E2E8F0] bg-slate-50/60 px-6 py-4 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                <Building2 className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">Company Information</h3>
                <p className="text-xs text-slate-400">Basic organization details</p>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
                    Company Name
                  </label>
                  <input
                    id="companyName"
                    name="companyName"
                    type="text"
                    value={generalSettings.companyName}
                    onChange={handleGeneralSettingsChange}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
                    Support Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      id="supportEmail"
                      name="supportEmail"
                      type="email"
                      value={generalSettings.supportEmail}
                      onChange={handleGeneralSettingsChange}
                      className={inputCls + " pl-10"}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
                    Contact Phone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      id="contactPhone"
                      name="contactPhone"
                      type="text"
                      value={generalSettings.contactPhone}
                      onChange={handleGeneralSettingsChange}
                      className={inputCls + " pl-10"}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Regional Settings */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
            <div className="border-b border-[#E2E8F0] bg-slate-50/60 px-6 py-4 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                <DollarSign className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">Regional Settings</h3>
                <p className="text-xs text-slate-400">Currency, timezone, and date format</p>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
                    Currency
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <select
                      value={generalSettings.currency}
                      onChange={(e) => handleSelectChange("currency", e.target.value)}
                      className={selCls + " pl-10"}
                    >
                      <option value="USD">USD (US Dollar)</option>
                      <option value="EUR">EUR (Euro)</option>
                      <option value="GBP">GBP (British Pound)</option>
                      <option value="CAD">CAD (Canadian Dollar)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
                    Time Zone
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <select
                      value={generalSettings.timeZone}
                      onChange={(e) => handleSelectChange("timeZone", e.target.value)}
                      className={selCls + " pl-10"}
                    >
                      <option value="America/New_York">Eastern Time (ET)</option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/Denver">Mountain Time (MT)</option>
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
                    Date Format
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <select
                      value={generalSettings.dateFormat}
                      onChange={(e) => handleSelectChange("dateFormat", e.target.value)}
                      className={selCls + " pl-10"}
                    >
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => saveSettings("General")}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1D4ED8] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1e40af] transition-colors"
            >
              <Save className="h-4 w-4" />
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Tab: Notifications */}
      {activeTab === "notifications" && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
            <div className="border-b border-[#E2E8F0] bg-slate-50/60 px-6 py-4 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                <Bell className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">Notification Preferences</h3>
                <p className="text-xs text-slate-400">Configure how and when notifications are sent</p>
              </div>
            </div>
            <div className="p-6 space-y-0 divide-y divide-[#F1F5F9]">
              {Object.keys(notificationSettings).map((setting) => {
                const meta = settingLabels[setting] ?? {
                  label: setting.replace(/([A-Z])/g, " $1"),
                  desc: `Enable ${setting.replace(/([A-Z])/g, " $1").toLowerCase()}`,
                };
                return (
                  <div
                    key={setting}
                    className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#0F172A]">{meta.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{meta.desc}</p>
                    </div>
                    <Toggle
                      checked={
                        notificationSettings[setting as keyof typeof notificationSettings]
                      }
                      onToggle={() => handleNotificationToggle(setting)}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => saveSettings("Notification")}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1D4ED8] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1e40af] transition-colors"
            >
              <Save className="h-4 w-4" />
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Tab: Security */}
      {activeTab === "security" && (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
          <div className="border-b border-[#E2E8F0] bg-slate-50/60 px-6 py-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100">
              <Shield className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">Security Settings</h3>
              <p className="text-xs text-slate-400">Configure system security settings</p>
            </div>
          </div>
          <div className="p-6">
            <p className="text-sm text-slate-500">Security settings coming soon.</p>
          </div>
        </div>
      )}

      {/* Tab: Integrations */}
      {activeTab === "integrations" && (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
          <div className="border-b border-[#E2E8F0] bg-slate-50/60 px-6 py-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100">
              <Plug className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">Integrations</h3>
              <p className="text-xs text-slate-400">Connect with third-party services</p>
            </div>
          </div>
          <div className="p-6">
            <p className="text-sm text-slate-500">Integration settings coming soon.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemSettings;
