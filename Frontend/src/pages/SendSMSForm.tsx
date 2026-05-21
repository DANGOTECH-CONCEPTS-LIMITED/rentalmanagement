import { useState, useEffect } from "react";
import { Phone, Send, MessageSquare, Hash, CheckCircle2, AlertCircle, Info, History, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const MAX_CHARS = 160;

interface SmsLog {
  id: number;
  phone: string;
  message: string;
  reference: string;
  sentByEmail: string;
  sentByRole: string;
  success: boolean;
  sentAt: string;
}

const TABS = ["compose", "history"] as const;
type Tab = typeof TABS[number];

const SendSMSForm = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("compose");
  const [formData, setFormData] = useState({ phone: "", message: "", reference: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const { token, role } = (() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      return { token: u.token || "", role: (u.systemRoleId === 1 ? "admin" : "landlord") };
    } catch {
      return { token: "", role: "landlord" };
    }
  })();

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const endpoint = role === "admin" ? "/GetAllSmsLogs" : "/GetMySmsSentLogs";
      const res = await fetch(`${apiUrl}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}`, accept: "*/*" },
      });
      if (!res.ok) throw new Error("Failed to load history");
      setLogs(await res.json());
    } catch {
      toast({ title: "Could not load SMS history", variant: "destructive" });
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "history") fetchLogs();
  }, [activeTab]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === "message" && value.length > MAX_CHARS) return;
    setFormData((p) => ({ ...p, [name]: value }));
    if (sent) setSent(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phone.trim() || !formData.message.trim()) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${apiUrl}/sendSingleSms`, {
        method: "POST",
        headers: {
          accept: "*/*",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: formData.phone,
          message: formData.message,
          reference: formData.reference || "SMS Notification",
        }),
      });

      if (!response.ok) throw new Error(`Error ${response.status}`);

      setSent(true);
      toast({ title: "SMS Sent", description: `Message delivered to ${formData.phone}` });
      setFormData({ phone: "", message: "", reference: "" });
    } catch (error: any) {
      toast({ title: "Failed to Send", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const charsLeft = MAX_CHARS - formData.message.length;
  const charColor = charsLeft <= 20 ? "text-red-500" : charsLeft <= 50 ? "text-amber-500" : "text-slate-400";

  const fmtDate = (d: string) =>
    new Date(d).toLocaleString("en-UG", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#1E3A5F] to-[#1D4ED8] px-8 py-8 text-white shadow-xl">
        <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-8 left-1/3 h-40 w-40 rounded-full bg-white/5" />
        <div className="relative space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-200">
            <MessageSquare className="h-3 w-3" /> Messaging
          </span>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">SMS Center</h1>
          <p className="text-sm text-blue-200/80">
            Send real-time SMS notifications and view message history.
          </p>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-[#E2E8F0] bg-slate-50 p-1 w-fit">
        {([["compose", Send, "Compose"], ["history", History, "Sent History"]] as const).map(([id, Icon, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === id ? "bg-white shadow-sm text-[#1D4ED8]" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* COMPOSE TAB */}
      {activeTab === "compose" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Compose panel */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 border-b border-[#E2E8F0] bg-slate-50/60 px-6 py-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1D4ED8]">
                <Send className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0F172A]">Compose Message</p>
                <p className="text-xs text-slate-400">Fill in recipient details and message content</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                  Phone Number <span className="text-red-400">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    name="phone"
                    type="tel"
                    placeholder="256705687760"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="pl-9 h-11 font-mono text-sm"
                  />
                </div>
                <p className="text-xs text-slate-400">Full international format without + (e.g. 256XXXXXXXXX)</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Reference</Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    name="reference"
                    placeholder="e.g. Payment Reminder, Invoice #123"
                    value={formData.reference}
                    onChange={handleChange}
                    className="pl-9 h-11 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                    Message <span className="text-red-400">*</span>
                  </Label>
                  <span className={`text-xs font-medium tabular-nums ${charColor}`}>
                    {charsLeft} / {MAX_CHARS}
                  </span>
                </div>
                <Textarea
                  name="message"
                  placeholder="Type your message here…"
                  value={formData.message}
                  onChange={handleChange}
                  rows={5}
                  required
                  className="resize-none text-sm leading-relaxed"
                />
                <div className="h-1 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-1 rounded-full transition-all duration-200 ${
                      charsLeft <= 20 ? "bg-red-400" : charsLeft <= 50 ? "bg-amber-400" : "bg-[#1D4ED8]"
                    }`}
                    style={{ width: `${((MAX_CHARS - charsLeft) / MAX_CHARS) * 100}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
                <p className="text-xs text-slate-400">Fields marked <span className="text-red-400">*</span> are required.</p>
                <Button
                  type="submit"
                  disabled={isLoading || !formData.phone.trim() || !formData.message.trim()}
                  className="gap-2 bg-[#1D4ED8] hover:bg-[#1e40af] text-white min-w-[140px]"
                >
                  {isLoading ? (
                    <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Sending…</>
                  ) : sent ? (
                    <><CheckCircle2 className="h-4 w-4" /> Sent!</>
                  ) : (
                    <><Send className="h-4 w-4" /> Send SMS</>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* SMS Preview */}
            <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
              <div className="border-b border-[#E2E8F0] bg-slate-50/60 px-5 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Preview</p>
              </div>
              <div className="flex justify-center px-6 py-6">
                <div className="w-56 rounded-3xl border-4 border-slate-800 bg-slate-800 shadow-xl overflow-hidden">
                  <div className="flex items-center justify-between bg-slate-800 px-4 py-1.5">
                    <span className="text-[10px] text-slate-400 font-medium">9:41</span>
                    <div className="flex gap-1 items-center">
                      <div className="h-1.5 w-4 rounded-full bg-slate-400" />
                      <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    </div>
                  </div>
                  <div className="bg-slate-100 min-h-[200px] p-3 space-y-2">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-7 w-7 rounded-full bg-[#1D4ED8] flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-white">NY</span>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-slate-800">Nyumba Yo</p>
                        <p className="text-[9px] text-slate-400">{formData.phone || "256XXXXXXXXX"}</p>
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-3 py-2 shadow-sm">
                        <p className="text-[10px] leading-relaxed text-slate-700 break-words">
                          {formData.message || "Your message will appear here…"}
                        </p>
                        <p className="mt-1 text-[8px] text-slate-400 text-right">
                          {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-500 shrink-0" />
                <p className="text-sm font-semibold text-blue-700">Tips</p>
              </div>
              <ul className="space-y-2 text-xs text-blue-600 leading-relaxed">
                <li className="flex gap-2"><span className="mt-0.5 shrink-0 text-blue-400">•</span>State the purpose in the first sentence.</li>
                <li className="flex gap-2"><span className="mt-0.5 shrink-0 text-blue-400">•</span>Use the Reference field to trace messages later.</li>
                <li className="flex gap-2"><span className="mt-0.5 shrink-0 text-blue-400">•</span>Keep under 160 characters to avoid multi-part SMS charges.</li>
                <li className="flex gap-2"><span className="mt-0.5 shrink-0 text-blue-400">•</span>Use full international format without the + sign.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 leading-relaxed">
                This action sends a real SMS. Administrator and Landlord accounts can use this feature.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === "history" && (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
          <div className="border-b border-[#E2E8F0] bg-slate-50/60 px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">
                {role === "admin" ? "All Sent Messages" : "My Sent Messages"}
              </h3>
              <p className="text-xs text-slate-400">
                {role === "admin" ? "All SMS messages sent across the platform" : "Messages you have sent to tenants"}
              </p>
            </div>
            <button
              onClick={fetchLogs}
              disabled={logsLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${logsLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {logsLoading ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1D4ED8] border-t-transparent" />
              <p className="text-sm text-slate-400">Loading message history…</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                <MessageSquare className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-500">No messages sent yet</p>
              <p className="text-xs text-slate-400">Messages you send will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-slate-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Message</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Reference</th>
                    {role === "admin" && <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Sent By</th>}
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-[#E2E8F0] hover:bg-slate-50/50">
                      <td className="px-6 py-3">
                        {log.success ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" /> Sent
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                            <AlertCircle className="h-3 w-3" /> Failed
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 font-mono text-xs text-[#0F172A]">{log.phone}</td>
                      <td className="px-6 py-3 max-w-xs">
                        <p className="truncate text-slate-600 text-xs">{log.message}</p>
                      </td>
                      <td className="px-6 py-3 text-xs text-slate-500">{log.reference || "—"}</td>
                      {role === "admin" && (
                        <td className="px-6 py-3 text-xs text-slate-500">
                          <p className="truncate max-w-[160px]">{log.sentByEmail}</p>
                          <p className="text-slate-400">{log.sentByRole}</p>
                        </td>
                      )}
                      <td className="px-6 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtDate(log.sentAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SendSMSForm;
