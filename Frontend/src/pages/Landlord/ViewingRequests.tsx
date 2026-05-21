import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  Eye, RefreshCw, CheckCircle, XCircle, Clock,
  Calendar, Phone, Mail, MessageSquare, Building2, User,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ViewingRequest {
  id: number;
  propertyId: number;
  tenantId: number;
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  preferredDate: string;
  message: string;
  status: string;
  createdAt: string;
  property?: { name: string; address: string };
}

const statusConfig: Record<string, { label: string; bg: string; text: string; border: string; icon: React.ReactNode }> = {
  Pending: {
    label: "Pending",
    bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200",
    icon: <Clock className="h-3 w-3" />,
  },
  Confirmed: {
    label: "Confirmed",
    bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200",
    icon: <CheckCircle className="h-3 w-3" />,
  },
  Rejected: {
    label: "Rejected",
    bg: "bg-red-50", text: "text-red-700", border: "border-red-200",
    icon: <XCircle className="h-3 w-3" />,
  },
};

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = statusConfig[status] ?? statusConfig.Pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
};

const ViewingRequests = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<ViewingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [filter, setFilter] = useState<"All" | "Pending" | "Confirmed" | "Rejected">("All");

  const userData = JSON.parse(localStorage.getItem("user") ?? "{}");
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const authHeader = { Authorization: `Bearer ${userData?.token}` };

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(
        `${apiUrl}/GetViewingRequestsByLandlordId/${userData.id}`,
        { headers: authHeader }
      );
      setRequests(Array.isArray(data) ? data : []);
    } catch {
      toast({ title: "Failed to load viewing requests", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, []);

  const updateStatus = async (id: number, status: "Confirmed" | "Rejected") => {
    setUpdating(id);
    try {
      await axios.put(
        `${apiUrl}/UpdateViewingRequestStatus/${id}`,
        { status },
        { headers: authHeader }
      );
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
      toast({ title: `Request ${status.toLowerCase()} successfully.` });
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    } finally {
      setUpdating(null);
    }
  };

  const filtered = filter === "All" ? requests : requests.filter(r => r.status === filter);
  const pendingCount = requests.filter(r => r.status === "Pending").length;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="relative rounded-2xl overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0f2044 45%, #1a3a6e 100%)" }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative px-6 py-6 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
                <Eye className="h-4 w-4 text-white" />
              </div>
              <span className="text-blue-200 text-sm font-medium">Property Management</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
              Viewing Requests
            </h1>
            <p className="text-blue-200 text-sm mt-1">
              {pendingCount > 0
                ? <><span className="font-semibold text-amber-300">{pendingCount} pending</span> request{pendingCount !== 1 ? "s" : ""} awaiting your response</>
                : "Manage tenant viewing requests for your properties"}
            </p>
          </div>
          <button onClick={fetchRequests} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors disabled:opacity-50 mt-1">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["All", "Pending", "Confirmed", "Rejected"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
              filter === f
                ? "bg-[#1d4ed8] text-white border-[#1d4ed8]"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
          >
            {f}
            {f === "Pending" && pendingCount > 0 && (
              <span className="ml-1.5 bg-amber-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-400">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white rounded-xl border border-slate-200">
          <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center">
            <Eye className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-600">No {filter !== "All" ? filter.toLowerCase() : ""} viewing requests</p>
          <p className="text-xs text-slate-400">Tenant requests will appear here when submitted.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map(req => (
            <div key={req.id}
              className={`bg-white rounded-xl border overflow-hidden transition-shadow hover:shadow-md ${
                req.status === "Pending" ? "border-amber-200 shadow-amber-50 shadow-sm" : "border-slate-200"
              }`}>
              {/* Card header */}
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <Building2 className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {req.property?.name ?? `Property #${req.propertyId}`}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">{req.property?.address ?? ""}</p>
                  </div>
                </div>
                <StatusBadge status={req.status} />
              </div>

              {/* Card body */}
              <div className="px-4 py-3 space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="text-sm font-medium text-slate-800">{req.tenantName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="text-xs text-slate-600">{req.tenantPhone || "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="text-xs text-slate-600 truncate">{req.tenantEmail || "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="text-xs text-slate-600 font-medium">
                    Preferred: {new Date(req.preferredDate).toLocaleDateString("en-UG", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
                {req.message && (
                  <div className="flex items-start gap-2 mt-1">
                    <MessageSquare className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-500 italic line-clamp-2">"{req.message}"</p>
                  </div>
                )}
              </div>

              {/* Actions — only for pending */}
              {req.status === "Pending" && (
                <div className="px-4 pb-4 flex gap-2">
                  <button
                    onClick={() => updateStatus(req.id, "Confirmed")}
                    disabled={updating === req.id}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold text-white transition-all disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #059669 0%, #10b981 100%)" }}
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    {updating === req.id ? "Updating…" : "Confirm"}
                  </button>
                  <button
                    onClick={() => updateStatus(req.id, "Rejected")}
                    disabled={updating === req.id}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold text-white transition-all disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)" }}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    {updating === req.id ? "Updating…" : "Reject"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ViewingRequests;
