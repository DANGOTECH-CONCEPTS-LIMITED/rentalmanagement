import { useState, useEffect } from "react";
import { getImageUrl } from "@/lib/imageUrl";
import {
  MessageSquare,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
  Calendar,
  AlertTriangle,
  X,
} from "lucide-react";
import { DataTable, Column } from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

const selCls =
  "h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-sm text-[#0F172A] shadow-sm outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 cursor-pointer";

interface Property {
  id: number;
  name: string;
  address: string;
  type: string;
}

interface Complaint {
  id: number;
  subject: string;
  description: string;
  priority: string;
  attachement: string;
  dateCreated: string;
  dateUpdated: string | null;
  status: string;
  resolutionDetails: string | null;
  propertyId: number;
  property: Property;
}

const AllComplaints = () => {
  const { toast } = useToast();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState<Complaint | null>(null);

  useEffect(() => {
    const fetchComplaints = async () => {
      setIsLoading(true);
      try {
        const { data } = await axios.get<Complaint[]>(`${apiUrl}/GetAllTenantComplaints`);
        setComplaints(data);
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.response?.data || "Failed to load complaints.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchComplaints();
  }, []);

  const filtered = complaints.filter((c) => {
    const matchSearch =
      c.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.property?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(c.id).includes(searchTerm);
    const matchStatus =
      filterStatus === "all" || c.status.toLowerCase() === filterStatus.toLowerCase();
    const matchPriority =
      filterPriority === "all" || c.priority.toLowerCase() === filterPriority.toLowerCase();
    return matchSearch && matchStatus && matchPriority;
  });

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const priorityBadge = (p: string) => {
    const lower = p.toLowerCase();
    if (lower === "high")
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-red-100 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
          <AlertTriangle className="h-3 w-3" />
          High
        </span>
      );
    if (lower === "medium")
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
          <AlertCircle className="h-3 w-3" />
          Medium
        </span>
      );
    if (lower === "low")
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
          Low
        </span>
      );
    return (
      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
        {p.charAt(0).toUpperCase() + p.slice(1)}
      </span>
    );
  };

  const statusCell = (s: string) => {
    const upper = s.toUpperCase();
    const map: Record<string, { icon: React.ReactNode; label: string; cls: string }> = {
      PENDING: {
        icon: <AlertCircle className="h-3.5 w-3.5" />,
        label: "Pending",
        cls: "border-blue-100 bg-blue-50 text-blue-700",
      },
      IN_PROGRESS: {
        icon: <Clock className="h-3.5 w-3.5" />,
        label: "In Progress",
        cls: "border-amber-100 bg-amber-50 text-amber-700",
      },
      RESOLVED: {
        icon: <CheckCircle className="h-3.5 w-3.5" />,
        label: "Resolved",
        cls: "border-emerald-100 bg-emerald-50 text-emerald-700",
      },
      REJECTED: {
        icon: <XCircle className="h-3.5 w-3.5" />,
        label: "Rejected",
        cls: "border-red-100 bg-red-50 text-red-700",
      },
    };
    const entry = map[upper];
    if (entry) {
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${entry.cls}`}
        >
          {entry.icon}
          {entry.label}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
        {s}
      </span>
    );
  };

  const columns: Column<Complaint>[] = [
    { key: "id", header: "#", cell: (c) => c.id },
    { key: "property", header: "Property", cell: (c) => c.property?.name ?? "—" },
    { key: "subject", header: "Subject", cell: (c) => c.subject },
    { key: "date", header: "Date", cell: (c) => formatDate(c.dateCreated) },
    { key: "priority", header: "Priority", cell: (c) => priorityBadge(c.priority) },
    { key: "status", header: "Status", cell: (c) => statusCell(c.status) },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "text-right",
      className: "text-right",
      cell: (c) => (
        <button
          onClick={() => setSelected(c)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#0F172A] hover:bg-blue-50 hover:border-blue-200 hover:text-[#1D4ED8] transition-colors shadow-sm"
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
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#1E3A5F] to-[#1D4ED8] px-8 py-8 text-white shadow-xl">
        <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-8 left-1/3 h-40 w-40 rounded-full bg-white/5" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-200">
              Admin Panel
            </span>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">All Complaints</h1>
            <p className="text-sm text-blue-200/80">
              System-wide view of all tenant complaints across every property
            </p>
          </div>
          <div className="rounded-xl border border-white/20 bg-white/10 p-3">
            <MessageSquare className="h-6 w-6 text-blue-200" />
          </div>
        </div>
      </section>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <select
              className={selCls + " pl-9"}
              style={{ width: "auto", minWidth: 160 }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <select
            className={selCls}
            style={{ width: "auto", minWidth: 160 }}
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          {(filterStatus !== "all" || filterPriority !== "all") && (
            <button
              onClick={() => {
                setFilterStatus("all");
                setFilterPriority("all");
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors h-11"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
        <DataTable
          data={filtered}
          columns={columns}
          loading={isLoading}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search by subject, property, or ID"
          label="complaint"
          pageSize={12}
          emptyMessage="No complaints found"
          emptyIcon={<MessageSquare className="h-10 w-10" />}
        />
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[90vh]"
            >
              {/* Modal header */}
              <div className="shrink-0 bg-gradient-to-r from-[#0F172A] to-[#1D4ED8] px-6 py-5 text-white flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">Complaint #{selected.id}</h2>
                  <p className="text-sm text-blue-200/80 mt-0.5">{selected.subject}</p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal body */}
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-1">
                        Subject
                      </p>
                      <p className="text-[#0F172A]">{selected.subject}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-1">
                        Description
                      </p>
                      <p className="text-[#0F172A]">{selected.description}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-1">
                        Property
                      </p>
                      <p className="text-[#0F172A]">
                        {selected.property?.name} — {selected.property?.address}
                      </p>
                    </div>
                    <div className="flex gap-6">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-1">
                          Status
                        </p>
                        {statusCell(selected.status)}
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-1">
                          Priority
                        </p>
                        {priorityBadge(selected.priority)}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-1">
                        Submitted
                      </p>
                      <p className="flex items-center gap-1.5 text-[#0F172A]">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        {formatDate(selected.dateCreated)}
                      </p>
                    </div>
                    {selected.dateUpdated && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-1">
                          Last Updated
                        </p>
                        <p className="flex items-center gap-1.5 text-[#0F172A]">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          {formatDate(selected.dateUpdated)}
                        </p>
                      </div>
                    )}
                    {selected.resolutionDetails && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-1">
                          Resolution
                        </p>
                        <p className="text-[#0F172A]">{selected.resolutionDetails}</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
                      Attachment
                    </p>
                    {selected.attachement ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-slate-500">
                          <FileText className="h-4 w-4" />
                          <span className="text-xs truncate">
                            {selected.attachement.split(/[/\\]/).pop()}
                          </span>
                        </div>
                        <img
                          src={getImageUrl(selected.attachement)}
                          alt="Attachment"
                          className="w-full rounded-xl object-cover border border-[#E2E8F0]"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = "flex";
                          }}
                        />
                        <div
                          style={{ display: "none" }}
                          className="flex h-24 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50"
                        >
                          <p className="text-xs text-slate-400">Image unavailable</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400">No attachment</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal footer */}
              <div className="shrink-0 border-t border-slate-100 px-6 py-4 flex items-center justify-end">
                <button
                  onClick={() => setSelected(null)}
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

export default AllComplaints;
