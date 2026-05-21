import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { DataTable, Column } from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";
import { Download, Eye, FileText, Copy, Check, X, Activity, Server, FolderOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const inputCls = 'h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] shadow-sm outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10';
const selCls = 'h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-sm text-[#0F172A] shadow-sm outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 cursor-pointer';

interface HttpLogEntry {
  id: number;
  request?: string | null;
  response?: string | null;
  status?: string | null;
  errorMessage?: string | null;
  requestType?: string | null;
  requestUrl?: string | null;
  createdAt?: string;
}

interface SerilogFileEntry {
  fileName: string;
  sizeBytes: number;
  lastModified?: string;
}

interface SerilogFileContent extends SerilogFileEntry {
  content: string;
}

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

const prettyJson = (raw?: string | null): string => {
  if (!raw) return "";
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
};

const methodBadgeClass = (method?: string | null) => {
  const m = (method || "").toUpperCase();
  if (m === "GET") return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  if (m === "POST") return "bg-blue-50 text-blue-700 border border-blue-200";
  if (m === "PUT") return "bg-amber-50 text-amber-700 border border-amber-200";
  if (m === "DELETE") return "bg-red-50 text-red-700 border border-red-200";
  if (m === "PATCH") return "bg-purple-50 text-purple-700 border border-purple-200";
  return "bg-slate-50 text-slate-600 border border-slate-200";
};

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
    >
      {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
};

const HttpLogs = () => {
  const today = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(today.getDate() - 7);

  const [activeTab, setActiveTab] = useState<"database" | "files">("database");
  const [startDate, setStartDate] = useState(toInputDate(weekAgo));
  const [endDate, setEndDate] = useState(toInputDate(today));
  const [searchTerm, setSearchTerm] = useState("");
  const [logs, setLogs] = useState<HttpLogEntry[]>([]);
  const [selectedLog, setSelectedLog] = useState<HttpLogEntry | null>(null);
  const [methodFilter, setMethodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serilogFiles, setSerilogFiles] = useState<SerilogFileEntry[]>([]);
  const [selectedSerilogFile, setSelectedSerilogFile] = useState<SerilogFileContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSerilogFiles, setIsLoadingSerilogFiles] = useState(false);
  const [isLoadingSerilogContent, setIsLoadingSerilogContent] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
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

  const formatSize = (sizeBytes: number) => {
    if (sizeBytes < 1024) return `${sizeBytes} B`;
    if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const fetchLogs = async () => {
    const token = getToken();
    if (!token) {
      toast({ title: "Error", description: "Authentication token not found.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const response = await axios.get<HttpLogEntry[]>(`${apiUrl}/GetRequestResponseByDate`, {
        params: { startDate, endDate },
        headers: { Authorization: `Bearer ${token}`, accept: "*/*" },
      });
      const sortedLogs = [...(response.data ?? [])].sort(
        (l, r) => new Date(r.createdAt ?? 0).getTime() - new Date(l.createdAt ?? 0).getTime()
      );
      setLogs(sortedLogs);
      setCurrentPage(1);
    } catch (error) {
      console.error("Error fetching HTTP logs:", error);
      toast({ title: "Error", description: "Failed to retrieve HTTP logs.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSerilogFiles = async () => {
    const token = getToken();
    if (!token) return;
    setIsLoadingSerilogFiles(true);
    try {
      const response = await axios.get<SerilogFileEntry[]>(`${apiUrl}/GetSerilogLogFiles`, {
        headers: { Authorization: `Bearer ${token}`, accept: "*/*" },
      });
      setSerilogFiles(response.data ?? []);
    } catch (error) {
      console.error("Error fetching Serilog files:", error);
      toast({ title: "Error", description: "Failed to retrieve raw Serilog log files.", variant: "destructive" });
    } finally {
      setIsLoadingSerilogFiles(false);
    }
  };

  const fetchSerilogFileContent = async (fileName: string) => {
    const token = getToken();
    if (!token) return;
    setIsLoadingSerilogContent(true);
    try {
      const response = await axios.get<SerilogFileContent>(`${apiUrl}/GetSerilogLogFileContent`, {
        params: { fileName },
        headers: { Authorization: `Bearer ${token}`, accept: "*/*" },
      });
      setSelectedSerilogFile(response.data);
    } catch (error) {
      console.error("Error fetching Serilog file content:", error);
      toast({ title: "Error", description: "Failed to retrieve selected log file.", variant: "destructive" });
    } finally {
      setIsLoadingSerilogContent(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchSerilogFiles();
  }, []);

  const availableMethods = useMemo(
    () => Array.from(new Set(logs.map((log) => log.requestType).filter(Boolean))).sort(),
    [logs]
  );

  const availableStatuses = useMemo(
    () => Array.from(new Set(logs.map((log) => log.status).filter(Boolean))).sort(),
    [logs]
  );

  const filteredLogs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesMethod = methodFilter === "all" || log.requestType === methodFilter;
      const matchesStatus = statusFilter === "all" || log.status === statusFilter;
      const matchesQuery =
        !query ||
        [log.requestType, log.requestUrl, log.status, log.errorMessage, log.request, log.response, formatDate(log.createdAt)]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      return matchesMethod && matchesStatus && matchesQuery;
    });
  }, [logs, methodFilter, searchTerm, statusFilter]);

  const exportLogsCsv = () => {
    if (filteredLogs.length === 0) return;
    const csvRows = [
      ["Date", "Method", "Request URL", "Status", "Error", "Request", "Response"].map(escapeCsvCell).join(","),
      ...filteredLogs.map((log) =>
        [formatDate(log.createdAt), log.requestType || "", log.requestUrl || "", log.status || "", log.errorMessage || "", log.request || "", log.response || ""]
          .map(escapeCsvCell).join(",")
      ),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `http-logs-${startDate}-to-${endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: "database" as const, label: "HTTP Request / Response", icon: Activity },
    { id: "files" as const, label: "Raw Serilog Files", icon: FolderOpen },
  ];

  const logColumns: Column<HttpLogEntry>[] = [
    { key: "date", header: "Date", cell: (l) => <span className="text-xs text-slate-600">{formatDate(l.createdAt)}</span> },
    {
      key: "method", header: "Method",
      cell: (l) => l.requestType ? (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold font-mono ${methodBadgeClass(l.requestType)}`}>
          {l.requestType}
        </span>
      ) : <span className="text-slate-400">—</span>
    },
    { key: "url", header: "Request URL", className: "max-w-[360px] truncate font-mono text-xs", cell: (l) => l.requestUrl || "-" },
    { key: "status", header: "Status", cell: (l) => l.status || "-" },
    { key: "error", header: "Error", className: "max-w-[240px] truncate text-xs text-red-600", cell: (l) => l.errorMessage || "-" },
    {
      key: "actions", header: "Actions",
      cell: (l) => (
        <button
          onClick={() => setSelectedLog(l)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F172A] shadow-sm transition-colors hover:bg-slate-50"
        >
          <Eye className="h-3.5 w-3.5" />View
        </button>
      ),
    },
  ];

  const serilogColumns: Column<SerilogFileEntry>[] = [
    { key: "name", header: "File Name", cell: (f) => <span className="font-mono text-xs">{f.fileName}</span> },
    { key: "modified", header: "Last Modified", cell: (f) => formatDate(f.lastModified) },
    { key: "size", header: "Size", cell: (f) => formatSize(f.sizeBytes) },
    {
      key: "actions", header: "Actions",
      cell: (f) => (
        <button
          onClick={() => fetchSerilogFileContent(f.fileName)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F172A] shadow-sm transition-colors hover:bg-slate-50"
        >
          <FileText className="h-3.5 w-3.5" />Open
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
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-200">Admin</span>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">HTTP Logs</h1>
            <p className="text-sm text-blue-200/80">Retrieve and inspect outbound HTTP requests and responses by date range.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-center">
              <p className="text-xs text-blue-200/70">Total Logs</p>
              <p className="text-2xl font-bold">{logs.length}</p>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-center">
              <p className="text-xs text-blue-200/70">Filtered</p>
              <p className="text-2xl font-bold">{filteredLogs.length}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Custom Tabs */}
      <div className="flex gap-1 rounded-xl border border-[#E2E8F0] bg-slate-50 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${activeTab === t.id ? "bg-white shadow-sm text-[#1D4ED8]" : "text-slate-500 hover:text-slate-700"}`}
          >
            <t.icon className="h-4 w-4" />{t.label}
          </button>
        ))}
      </div>

      {/* HTTP Logs Tab */}
      {activeTab === "database" && (
        <div className="space-y-4">
          {/* Filters Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 md:grid-cols-[repeat(2,minmax(0,180px))_repeat(2,minmax(0,180px))_minmax(0,1fr)_auto]">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Start date</label>
                <input
                  type="date"
                  className={inputCls}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={endDate || undefined}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">End date</label>
                <input
                  type="date"
                  className={inputCls}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || undefined}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Method</label>
                <select className={selCls} value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
                  <option value="all">All methods</option>
                  {availableMethods.map((method) => (
                    <option key={method} value={method!}>{method}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Status</label>
                <select className={selCls} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">All statuses</option>
                  {availableStatuses.map((status) => (
                    <option key={status} value={status!}>{status}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={fetchLogs}
                  className="h-11 flex-1 rounded-xl bg-[#1D4ED8] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1E40AF]"
                >
                  Retrieve Logs
                </button>
                <button
                  onClick={exportLogsCsv}
                  disabled={filteredLogs.length === 0}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-4 text-sm font-semibold text-[#0F172A] shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="h-4 w-4" />Export CSV
                </button>
              </div>
            </div>
          </div>

          {/* Logs Table */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <DataTable
              data={filteredLogs}
              columns={logColumns}
              loading={isLoading}
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Search by URL, method, status, or content"
              label="log"
              emptyMessage="No request/response logs found for the selected criteria"
              minWidth="860px"
            />
          </div>
        </div>
      )}

      {/* Serilog Tab */}
      {activeTab === "files" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#0F172A]">Serilog Files</h2>
              <p className="text-sm text-slate-500">Browse raw API file logs written to the backend logs folder.</p>
            </div>
            <button
              onClick={fetchSerilogFiles}
              className="inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-semibold text-[#0F172A] shadow-sm transition-colors hover:bg-slate-50"
            >
              <Server className="h-4 w-4" />Retrieve Files
            </button>
          </div>
          <DataTable
            data={serilogFiles}
            columns={serilogColumns}
            loading={isLoadingSerilogFiles}
            label="file"
            emptyMessage="No raw Serilog log files were found"
          />
        </div>
      )}

      {/* Log Detail Modal */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[90vh]"
            >
              <div className="shrink-0 bg-gradient-to-r from-[#0F172A] to-[#1D4ED8] px-6 py-5 text-white flex items-center justify-between">
                <h2 className="text-lg font-bold">Log Details</h2>
                <button onClick={() => setSelectedLog(null)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                {/* Metadata strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  {[
                    { label: "Date", value: formatDate(selectedLog.createdAt) },
                    {
                      label: "Method",
                      value: selectedLog.requestType ? (
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold font-mono ${methodBadgeClass(selectedLog.requestType)}`}>
                          {selectedLog.requestType}
                        </span>
                      ) : "—"
                    },
                    { label: "Status", value: selectedLog.status || "—" },
                    { label: "Error", value: selectedLog.errorMessage || "None" },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-0.5">{label}</p>
                      <p className="font-medium text-slate-800">{value}</p>
                    </div>
                  ))}
                </div>
                {/* URL row */}
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Request URL</p>
                  <p className="font-mono text-slate-800 break-all">{selectedLog.requestUrl || "—"}</p>
                </div>

                {/* Request & Response */}
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-700">Request Body</h3>
                      {selectedLog.request && <CopyButton text={prettyJson(selectedLog.request)} />}
                    </div>
                    <pre className="max-h-[380px] overflow-auto whitespace-pre-wrap break-all rounded-xl bg-slate-950 p-4 text-xs text-slate-50 leading-relaxed">
                      {prettyJson(selectedLog.request) || <span className="text-slate-500 italic">No request payload recorded.</span>}
                    </pre>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-700">Response Body</h3>
                      {selectedLog.response && <CopyButton text={prettyJson(selectedLog.response)} />}
                    </div>
                    <pre className="max-h-[380px] overflow-auto whitespace-pre-wrap break-all rounded-xl bg-slate-950 p-4 text-xs text-slate-50 leading-relaxed">
                      {prettyJson(selectedLog.response) || <span className="text-slate-500 italic">No response payload recorded.</span>}
                    </pre>
                  </div>
                </div>
              </div>
              <div className="shrink-0 border-t border-slate-100 px-6 py-4 flex justify-end gap-2">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Serilog File Content Modal */}
      <AnimatePresence>
        {(!!selectedSerilogFile || isLoadingSerilogContent) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[90vh]"
            >
              <div className="shrink-0 bg-gradient-to-r from-[#0F172A] to-[#1D4ED8] px-6 py-5 text-white flex items-center justify-between">
                <h2 className="text-lg font-bold">{selectedSerilogFile?.fileName || "Raw Serilog Log File"}</h2>
                <button
                  onClick={() => setSelectedSerilogFile(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                {isLoadingSerilogContent ? (
                  <div className="py-8 text-center text-slate-500">Loading file content...</div>
                ) : selectedSerilogFile ? (
                  <>
                    <div className="grid gap-4 md:grid-cols-3">
                      {[
                        { label: "File", value: selectedSerilogFile.fileName },
                        { label: "Modified", value: formatDate(selectedSerilogFile.lastModified) },
                        { label: "Size", value: formatSize(selectedSerilogFile.sizeBytes) },
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
                          <span className="font-semibold text-slate-700">{label}: </span>
                          <span className="text-slate-600">{value}</span>
                        </div>
                      ))}
                    </div>
                    <pre className="max-h-[560px] overflow-auto whitespace-pre-wrap break-all rounded-xl bg-slate-950 p-4 text-xs text-slate-50">
                      {selectedSerilogFile.content || "No file content available."}
                    </pre>
                  </>
                ) : null}
              </div>
              <div className="shrink-0 border-t border-slate-100 px-6 py-4 flex justify-end gap-2">
                <button
                  onClick={() => setSelectedSerilogFile(null)}
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

export default HttpLogs;
