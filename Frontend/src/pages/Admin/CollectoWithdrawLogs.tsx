import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { useCurrencyFormatter } from "@/hooks/use-currency-formatter";
import { Download, Eye, ArrowDownLeft } from "lucide-react";
import { DataTable, Column } from "@/components/ui/data-table";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface CollectoWithdrawHistoryEntry {
  id: number;
  reference: string;
  amount: number;
  withdrawTo: string;
  requestedByEmail: string;
  requestedByRole: string;
  endpointRequestUrl: string;
  endpointRequestPayload: string;
  endpointResponsePayload: string;
  endpointStatus: string;
  collectoRequestUrl: string;
  collectoRequestPayload: string;
  collectoResponsePayload: string;
  collectoHttpStatusCode: number;
  collectoStatus: string;
  isSuccess: boolean;
  errorMessage: string;
  createdAt: string;
}

const inputCls =
  "h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] shadow-sm outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10";
const selCls =
  "h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-sm text-[#0F172A] shadow-sm outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 cursor-pointer";

const formatDate = (dateValue?: string) => {
  if (!dateValue) return "-";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

const toInputDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    SUCCESS: "bg-emerald-50 border-emerald-100 text-emerald-700",
    PENDING: "bg-amber-50 border-amber-100 text-amber-700",
    FAILED: "bg-red-50 border-red-100 text-red-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
        map[status?.toUpperCase()] ?? "bg-slate-50 border-slate-200 text-slate-600"
      }`}
    >
      {status}
    </span>
  );
};

const CollectoWithdrawLogs = () => {
  const { toast } = useToast();
  const formatCurrency = useCurrencyFormatter();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const today = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(today.getDate() - 7);

  const [startDate, setStartDate] = useState(toInputDate(weekAgo));
  const [endDate, setEndDate] = useState(toInputDate(today));
  const [entries, setEntries] = useState<CollectoWithdrawHistoryEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [destinationFilter, setDestinationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<CollectoWithdrawHistoryEntry | null>(null);

  const getToken = () => {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser).token : null;
  };

  const escapeCsvCell = (value: string | number | boolean) => {
    const normalized = String(value ?? "");
    return `"${normalized.replace(/"/g, '""')}"`;
  };

  const fetchHistory = async () => {
    const token = getToken();
    if (!token) {
      toast({ title: "Error", description: "Authentication token not found.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const response = await axios.get<CollectoWithdrawHistoryEntry[]>(
        `${apiUrl}/GetCollectoWalletWithdrawalHistory`,
        {
          params: { startDate, endDate },
          headers: { Authorization: `Bearer ${token}`, accept: "*/*" },
        }
      );
      setEntries(response.data ?? []);
    } catch (error) {
      console.error("Error fetching Collecto withdrawal history:", error);
      toast({ title: "Error", description: "Failed to retrieve Collecto wallet withdrawal history.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const filteredEntries = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return entries.filter((entry) => {
      const matchesDestination =
        destinationFilter === "all" || entry.withdrawTo.toLowerCase() === destinationFilter.toLowerCase();
      const matchesStatus =
        statusFilter === "all" || entry.endpointStatus.toLowerCase() === statusFilter.toLowerCase();
      const matchesQuery =
        !query ||
        [
          entry.reference,
          entry.withdrawTo,
          entry.requestedByEmail,
          entry.endpointStatus,
          entry.collectoStatus,
          entry.errorMessage,
          entry.endpointRequestPayload,
          entry.endpointResponsePayload,
          entry.collectoRequestPayload,
          entry.collectoResponsePayload,
          formatDate(entry.createdAt),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      return matchesDestination && matchesStatus && matchesQuery;
    });
  }, [destinationFilter, entries, searchTerm, statusFilter]);

  const exportCsv = () => {
    if (filteredEntries.length === 0) return;
    const csvRows = [
      ["Date", "Reference", "Amount", "Withdraw To", "Requested By", "Endpoint Status", "Collecto Status", "Collecto HTTP Status", "Error"]
        .map(escapeCsvCell)
        .join(","),
      ...filteredEntries.map((entry) =>
        [
          formatDate(entry.createdAt),
          entry.reference,
          entry.amount,
          entry.withdrawTo,
          entry.requestedByEmail,
          entry.endpointStatus,
          entry.collectoStatus,
          entry.collectoHttpStatusCode,
          entry.errorMessage,
        ]
          .map(escapeCsvCell)
          .join(",")
      ),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `collecto-wallet-withdrawals-${startDate}-to-${endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const successCount = useMemo(() => entries.filter((e) => e.isSuccess).length, [entries]);
  const failedCount = useMemo(() => entries.filter((e) => !e.isSuccess).length, [entries]);

  const columns: Column<CollectoWithdrawHistoryEntry>[] = [
    {
      key: "createdAt",
      header: "Date",
      cell: (row) => <span className="text-xs text-slate-500 whitespace-nowrap">{formatDate(row.createdAt)}</span>,
    },
    {
      key: "reference",
      header: "Reference",
      cell: (row) => <span className="text-xs font-mono text-slate-700">{row.reference}</span>,
    },
    {
      key: "withdrawTo",
      header: "Withdraw To",
      cell: (row) => (
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
          {row.withdrawTo}
        </span>
      ),
    },
    {
      key: "requestedByEmail",
      header: "Requested By",
      cell: (row) => <span className="max-w-[240px] truncate block text-sm text-slate-600">{row.requestedByEmail}</span>,
    },
    {
      key: "endpointStatus",
      header: "Endpoint",
      cell: (row) => statusBadge(row.endpointStatus),
    },
    {
      key: "collectoStatus",
      header: "Collecto",
      cell: (row) => statusBadge(row.collectoStatus),
    },
    {
      key: "amount",
      header: "Amount",
      headerClassName: "text-right",
      className: "text-right font-medium",
      cell: (row) => <span className="font-semibold text-slate-800">{formatCurrency(row.amount)}</span>,
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <button
          onClick={() => setSelectedEntry(row)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
        >
          <Eye className="h-3.5 w-3.5" />
          View
        </button>
      ),
    },
  ];

  const filterControls = (
    <button
      onClick={exportCsv}
      disabled={filteredEntries.length === 0}
      className="inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-40"
    >
      <Download className="h-4 w-4" />
      Export CSV
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl px-8 py-8 text-white shadow-xl" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0f2044 45%, #1a3a6e 100%)" }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-200">
              <ArrowDownLeft className="h-3 w-3" />
              Admin
            </span>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Collecto Withdraw Logs</h1>
            <p className="text-sm text-blue-200/80">
              Review every admin withdraw request sent through the local endpoint and the downstream Collecto wallet call it triggered.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-center">
              <p className="text-2xl font-bold">{successCount}</p>
              <p className="text-[11px] text-emerald-300 uppercase tracking-wider">Successful</p>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-center">
              <p className="text-2xl font-bold">{failedCount}</p>
              <p className="text-[11px] text-red-300 uppercase tracking-wider">Failed</p>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-center">
              <p className="text-2xl font-bold">{entries.length}</p>
              <p className="text-[11px] text-blue-200/80 uppercase tracking-wider">Total</p>
            </div>
          </div>
        </div>
      </section>

      {/* Filters Card */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm p-5">
        <div className="grid gap-4 md:grid-cols-[repeat(2,minmax(0,180px))_repeat(2,minmax(0,180px))_auto]">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Start Date</label>
            <input
              id="collecto-start-date"
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
              id="collecto-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate || undefined}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Destination</label>
            <select
              className={selCls}
              value={destinationFilter}
              onChange={(e) => setDestinationFilter(e.target.value)}
            >
              <option value="all">All destinations</option>
              <option value="BULK">BULK</option>
              <option value="flexipay">FLEXIPAY</option>
              <option value="SMS">SMS</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Status</label>
            <select
              className={selCls}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchHistory}
              className="h-11 w-full rounded-xl bg-[#1D4ED8] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1D4ED8]/90"
            >
              Retrieve Logs
            </button>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm p-4">
        <DataTable
          data={filteredEntries}
          columns={columns}
          loading={isLoading}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search by reference, payload, user, or error"
          label="withdrawal record"
          emptyMessage="No withdrawal history found for the selected criteria."
          headerRight={filterControls}
          minWidth="900px"
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
              className="flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="shrink-0 bg-gradient-to-r from-[#0F172A] to-[#1D4ED8] px-6 py-5 text-white flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-300">Collecto Withdrawals</p>
                  <h2 className="text-lg font-bold">Withdraw Log Details</h2>
                </div>
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                {/* Summary chips */}
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Reference</p>
                    <p className="mt-2 font-semibold text-slate-950 text-sm break-all">{selectedEntry.reference}</p>
                  </div>
                  <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Amount</p>
                    <p className="mt-2 font-semibold text-slate-950">{formatCurrency(selectedEntry.amount)}</p>
                  </div>
                  <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Destination</p>
                    <p className="mt-2 font-semibold text-slate-950">{selectedEntry.withdrawTo}</p>
                  </div>
                </div>

                {/* Endpoint logs */}
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Local endpoint */}
                  <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm p-5 space-y-4">
                    <div>
                      <h3 className="font-semibold text-slate-950">Local Endpoint Log</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Request made to `/withdrawFromCollectoWallet`</p>
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-700 w-28 shrink-0">Status:</span>
                        {statusBadge(selectedEntry.endpointStatus)}
                      </div>
                      <p><span className="font-medium text-slate-700">URL:</span> <span className="text-xs text-slate-600 break-all">{selectedEntry.endpointRequestUrl}</span></p>
                      <p><span className="font-medium text-slate-700">Requested By:</span> <span className="text-slate-600">{selectedEntry.requestedByEmail}</span></p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B]">Request Payload</label>
                      <pre className="max-h-56 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">{selectedEntry.endpointRequestPayload || "-"}</pre>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B]">Response Payload</label>
                      <pre className="max-h-56 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">{selectedEntry.endpointResponsePayload || "-"}</pre>
                    </div>
                  </div>

                  {/* Collecto endpoint */}
                  <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm p-5 space-y-4">
                    <div>
                      <h3 className="font-semibold text-slate-950">Collecto Endpoint Log</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Outbound request made to the Collecto `withdrawFromWallet` endpoint</p>
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-700 w-28 shrink-0">Status:</span>
                        {statusBadge(selectedEntry.collectoStatus)}
                      </div>
                      <p><span className="font-medium text-slate-700">HTTP Status:</span> <span className="text-slate-600">{selectedEntry.collectoHttpStatusCode}</span></p>
                      <p><span className="font-medium text-slate-700">URL:</span> <span className="text-xs text-slate-600 break-all">{selectedEntry.collectoRequestUrl || "-"}</span></p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B]">Request Payload</label>
                      <pre className="max-h-56 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">{selectedEntry.collectoRequestPayload || "-"}</pre>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B]">Response Payload</label>
                      <pre className="max-h-56 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">{selectedEntry.collectoResponsePayload || "-"}</pre>
                    </div>
                  </div>
                </div>

                {/* Error message */}
                {selectedEntry.errorMessage && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                    <p className="font-semibold text-red-700">Error</p>
                    <pre className="mt-2 whitespace-pre-wrap text-sm text-red-700">{selectedEntry.errorMessage}</pre>
                  </div>
                )}
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

export default CollectoWithdrawLogs;
