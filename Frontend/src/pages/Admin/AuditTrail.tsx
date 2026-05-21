import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { DataTable, Column } from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";
import { Eye, Download, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface AuditTrailEntry {
  id: number;
  createdAt: string;
  userId: string;
  userName?: string | null;
  userRole?: string | null;
  httpMethod: string;
  route: string;
  action: string;
  requestData?: string | null;
  resultStatus?: string | null;
  sourceIp?: string | null;
  description?: string | null;
}

const inputCls =
  "h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] shadow-sm outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10";

const formatDate = (dateValue?: string) => {
  if (!dateValue) return "-";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "-";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

const toInputDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const methodColor: Record<string, string> = {
  GET: "bg-blue-50 border-blue-100 text-blue-700",
  POST: "bg-emerald-50 border-emerald-100 text-emerald-700",
  PUT: "bg-amber-50 border-amber-100 text-amber-700",
  DELETE: "bg-red-50 border-red-100 text-red-700",
};

const MethodPill = ({ method }: { method: string }) => (
  <span
    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold font-mono ${
      methodColor[method] ?? "bg-slate-50 border-slate-200 text-slate-600"
    }`}
  >
    {method}
  </span>
);

const AuditTrail = () => {
  const today = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(today.getDate() - 7);

  const [startDate, setStartDate] = useState(toInputDate(weekAgo));
  const [endDate, setEndDate] = useState(toInputDate(today));
  const [searchTerm, setSearchTerm] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [routeFilter, setRouteFilter] = useState("");
  const [logs, setLogs] = useState<AuditTrailEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<AuditTrailEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const getToken = () => {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser).token : null;
  };

  const escapeCsvCell = (value: string | number) => {
    const normalized = String(value ?? "");
    return `"${normalized.replace(/"/g, '""')}"`;
  };

  const fetchAuditTrail = async () => {
    const token = getToken();
    if (!token) {
      toast({ title: "Error", description: "Authentication token not found.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const response = await axios.get<AuditTrailEntry[]>(`${apiUrl}/GetAuditTrail`, {
        params: { startDate, endDate, userId: userFilter, action: actionFilter, route: routeFilter },
        headers: { Authorization: `Bearer ${token}`, accept: "*/*" },
      });
      const sortedLogs = [...(response.data ?? [])].sort(
        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );
      setLogs(sortedLogs);
    } catch (error) {
      console.error("Error fetching audit trail:", error);
      toast({ title: "Error", description: "Failed to retrieve audit trail.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditTrail();
  }, []);

  const filteredLogs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesQuery =
        !query ||
        [log.userId, log.userName, log.userRole, log.httpMethod, log.route, log.action, log.description, log.requestData]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      return matchesQuery;
    });
  }, [logs, searchTerm]);

  const exportCsv = () => {
    if (filteredLogs.length === 0) return;
    const csvRows = [
      ["Date", "User", "Role", "Method", "Route", "Action", "Status", "Source IP", "Description", "Request Data"]
        .map(escapeCsvCell)
        .join(","),
      ...filteredLogs.map((log) =>
        [
          formatDate(log.createdAt),
          log.userId,
          log.userRole || "",
          log.httpMethod,
          log.route,
          log.action,
          log.resultStatus || "",
          log.sourceIp || "",
          log.description || "",
          log.requestData || "",
        ]
          .map(escapeCsvCell)
          .join(",")
      ),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-trail-${startDate}-to-${endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const columns: Column<AuditTrailEntry>[] = [
    {
      key: "date",
      header: "Date",
      cell: (log) => <span className="text-xs text-slate-500 whitespace-nowrap">{formatDate(log.createdAt)}</span>,
    },
    {
      key: "user",
      header: "User",
      cell: (log) => <span className="text-sm font-medium text-slate-800">{log.userId}</span>,
    },
    {
      key: "role",
      header: "Role",
      cell: (log) => <span className="text-sm text-slate-600">{log.userRole || "-"}</span>,
    },
    {
      key: "method",
      header: "Method",
      cell: (log) => <MethodPill method={log.httpMethod} />,
    },
    {
      key: "route",
      header: "Route",
      className: "max-w-[240px] truncate",
      cell: (log) => <span className="text-xs font-mono text-slate-600">{log.route}</span>,
    },
    {
      key: "action",
      header: "Action",
      className: "max-w-[200px] truncate",
      cell: (log) => <span className="text-sm text-slate-700">{log.action}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (log) => <span className="text-sm text-slate-600">{log.resultStatus || "-"}</span>,
    },
    {
      key: "details",
      header: "Details",
      cell: (log) => (
        <button
          onClick={() => setSelectedEntry(log)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
        >
          <Eye className="h-3.5 w-3.5" />
          View
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl px-8 py-8 text-white shadow-xl" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0f2044 45%, #1a3a6e 100%)" }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-200">
              <ShieldCheck className="h-3 w-3" />
              Admin
            </span>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Audit Trail</h1>
            <p className="text-sm text-blue-200/80">
              Review user activity, action type, and request details captured by the audit trail.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-center">
              <p className="text-2xl font-bold">{logs.length}</p>
              <p className="text-[11px] text-blue-200/80 uppercase tracking-wider">Total Entries</p>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-center">
              <p className="text-2xl font-bold">{filteredLogs.length}</p>
              <p className="text-[11px] text-blue-200/80 uppercase tracking-wider">Filtered</p>
            </div>
          </div>
        </div>
      </section>

      {/* Filters Card */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[180px_180px_1fr_1fr_auto]">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Start Date</label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={endDate || undefined}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">End Date</label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate || undefined}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">User ID</label>
            <input
              id="user-filter"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              placeholder="Filter by user ID"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Action</label>
            <input
              id="action-filter"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              placeholder="Filter by action"
              className={inputCls}
            />
          </div>
          <div className="flex flex-col justify-end gap-2">
            <button
              onClick={fetchAuditTrail}
              className="h-11 rounded-xl bg-[#1D4ED8] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1D4ED8]/90 disabled:opacity-60"
            >
              Refresh
            </button>
            <button
              onClick={exportCsv}
              disabled={filteredLogs.length === 0}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-5 text-sm font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-40"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Route filter */}
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Route</label>
            <input
              id="route-filter"
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value)}
              placeholder="Filter by route"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm p-4">
        <DataTable
          data={filteredLogs}
          columns={columns}
          loading={isLoading}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search by user, route, action, description"
          label="audit entry"
          emptyMessage="No audit entries found for the selected criteria."
        />
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedEntry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="shrink-0 bg-gradient-to-r from-[#0F172A] to-[#1D4ED8] px-6 py-5 text-white flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-300">Audit Trail</p>
                  <h2 className="text-lg font-bold">Entry Details</h2>
                </div>
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  {/* User Info */}
                  <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm p-4 text-sm space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-3">User Info</p>
                    <p><span className="font-medium text-slate-700">Date:</span> <span className="text-slate-600">{formatDate(selectedEntry.createdAt)}</span></p>
                    <p><span className="font-medium text-slate-700">User ID:</span> <span className="text-slate-600">{selectedEntry.userId}</span></p>
                    <p><span className="font-medium text-slate-700">Name:</span> <span className="text-slate-600">{selectedEntry.userName || "-"}</span></p>
                    <p><span className="font-medium text-slate-700">Role:</span> <span className="text-slate-600">{selectedEntry.userRole || "-"}</span></p>
                  </div>

                  {/* Request Info */}
                  <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm p-4 text-sm space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-3">Request Info</p>
                    <p className="flex items-center gap-2">
                      <span className="font-medium text-slate-700">Method:</span>
                      <MethodPill method={selectedEntry.httpMethod} />
                    </p>
                    <p><span className="font-medium text-slate-700">Route:</span> <span className="text-xs font-mono text-slate-600 break-all">{selectedEntry.route}</span></p>
                    <p><span className="font-medium text-slate-700">Action:</span> <span className="text-slate-600">{selectedEntry.action}</span></p>
                    <p><span className="font-medium text-slate-700">Status:</span> <span className="text-slate-600">{selectedEntry.resultStatus || "-"}</span></p>
                  </div>

                  {/* Meta Info */}
                  <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm p-4 text-sm space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-3">Meta Info</p>
                    <p><span className="font-medium text-slate-700">Source IP:</span> <span className="text-slate-600">{selectedEntry.sourceIp || "-"}</span></p>
                    <p><span className="font-medium text-slate-700">Description:</span> <span className="text-slate-600">{selectedEntry.description || "-"}</span></p>
                  </div>
                </div>

                {/* Request Data */}
                <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-3">Request Data</p>
                  <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap break-all rounded-xl bg-slate-950 p-4 text-xs text-slate-50">
                    {selectedEntry.requestData || "No request data available."}
                  </pre>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="shrink-0 border-t border-slate-100 px-6 py-4 flex items-center justify-end gap-2">
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AuditTrail;
