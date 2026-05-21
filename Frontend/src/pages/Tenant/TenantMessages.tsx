import { useEffect, useState } from "react";
import axios from "axios";
import { Inbox, RefreshCw, MessageSquare, CheckCircle, XCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

const statusBadge = (success: boolean) =>
  success ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
      <CheckCircle className="h-3 w-3" /> Delivered
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
      <XCircle className="h-3 w-3" /> Failed
    </span>
  );

const TenantMessages = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState<string | null>(null);

  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const userData = JSON.parse(localStorage.getItem("user") || "{}");
  const token = userData?.token ?? null;
  const authHeader = { Authorization: `Bearer ${token}` };

  const fetchPhoneAndMessages = async () => {
    setLoading(true);
    try {
      // Fetch tenant profile to get phone number
      const profileRes = await axios.get(`${apiUrl}/GetTenantById/${userData.id}`, {
        headers: authHeader,
      });
      const tenantPhone: string = profileRes.data?.phoneNumber ?? "";
      setPhone(tenantPhone);

      if (!tenantPhone) {
        toast({ title: "No phone number on your profile", variant: "destructive" });
        return;
      }

      const logsRes = await axios.get(`${apiUrl}/GetSmsLogsByPhone/${encodeURIComponent(tenantPhone)}`, {
        headers: authHeader,
      });
      setLogs(Array.isArray(logsRes.data) ? logsRes.data : []);
    } catch {
      toast({ title: "Could not load messages", description: "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhoneAndMessages();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="relative rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0f2044 45%, #1a3a6e 100%)" }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="absolute inset-0 pointer-events-none">
        </div>
        <div className="relative px-6 py-6 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
                <Inbox className="h-4 w-4 text-white" />
              </div>
              <span className="text-blue-200 text-sm font-medium">My Inbox</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Messages</h1>
            <p className="text-blue-200 text-sm mt-1">
              SMS messages sent to{" "}
              <span className="font-semibold text-white">{phone ?? "your registered phone"}</span>
            </p>
          </div>
          <button
            onClick={fetchPhoneAndMessages}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors disabled:opacity-50 mt-1"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Messages list */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#E2E8F0]">
          <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
            <MessageSquare className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#0F172A]">Received Messages</h3>
            <p className="text-xs text-slate-500">{logs.length} message{logs.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
            </div>
            <p className="text-sm text-slate-500">Loading messages…</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center">
              <Inbox className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600">No messages yet</p>
            <p className="text-xs text-slate-400">Messages sent to your phone number will appear here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-[#E2E8F0]">
            {logs.map((log) => (
              <li key={log.id} className="px-5 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  {/* Left: icon + message */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MessageSquare className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-[#0F172A] leading-relaxed whitespace-pre-wrap break-words">
                        {log.message}
                      </p>
                      {log.reference && (
                        <p className="text-xs text-slate-400 mt-1">
                          Ref: <span className="font-medium text-slate-500">{log.reference}</span>
                        </p>
                      )}
                      <p className="text-xs text-slate-400 mt-0.5">
                        From: <span className="font-medium text-slate-500">{log.sentByRole || "System"}</span>
                      </p>
                    </div>
                  </div>
                  {/* Right: status + date */}
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    {statusBadge(log.success)}
                    <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="h-3 w-3" />
                      {new Date(log.sentAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default TenantMessages;
