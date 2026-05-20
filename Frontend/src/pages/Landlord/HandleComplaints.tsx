import { useState, useEffect } from "react";
import { getImageUrl } from "@/lib/imageUrl";
import {
  MessageSquare, Filter, Eye, CheckCircle, XCircle,
  Clock, AlertCircle, FileText, Calendar, Home, X,
  ShieldAlert,
} from "lucide-react";
import { DataTable, Column } from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";

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
  priority: "low" | "medium" | "high";
  attachement: string;
  dateCreated: string;
  dateUpdated: string | null;
  status: string;
  resolutionDetails: string | null;
  propertyId: number;
  property: Property;
  tenantName?: string;
}

// ── Status badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const s = status.toUpperCase();
  if (s === "PENDING")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
        <AlertCircle className="h-3 w-3" /> Pending
      </span>
    );
  if (s === "IN_PROGRESS")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
        <Clock className="h-3 w-3" /> In Progress
      </span>
    );
  if (s === "RESOLVED")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
        <CheckCircle className="h-3 w-3" /> Resolved
      </span>
    );
  if (s === "REJECTED")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-100 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
        <XCircle className="h-3 w-3" /> Rejected
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
      {status}
    </span>
  );
};

// ── Priority badge ────────────────────────────────────────────────────────────
const PriorityBadge = ({ priority }: { priority: string }) => {
  const p = priority.toLowerCase();
  if (p === "high")
    return (
      <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-700">
        High
      </span>
    );
  if (p === "medium")
    return (
      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700">
        Medium
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
      Low
    </span>
  );
};

// ── KPI card ──────────────────────────────────────────────────────────────────
interface KpiProps {
  label: string; value: number; icon: React.ElementType;
  iconBg: string; iconColor: string; accent: string;
}
const KpiCard = ({ label, value, icon: Icon, iconBg, iconColor, accent }: KpiProps) => (
  <div className={`rounded-2xl border-l-4 border border-slate-200 bg-white p-5 shadow-sm ${accent}`}>
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-1.5 text-2xl font-bold text-[#0F172A]">{value}</p>
      </div>
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
    </div>
  </div>
);

// ── Detail row ────────────────────────────────────────────────────────────────
const DetailRow = ({
  icon: Icon, label, value,
}: {
  icon: React.ElementType; label: string; value: React.ReactNode;
}) => (
  <div className="flex items-start gap-3 border-b border-slate-100 py-3 last:border-0">
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100">
      <Icon className="h-3.5 w-3.5 text-slate-500" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <div className="mt-0.5 text-sm text-[#0F172A]">{value}</div>
    </div>
  </div>
);

// ── Component ─────────────────────────────────────────────────────────────────
const HandleComplaints = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  const user = localStorage.getItem("user");
  let token = "";
  let id = "";
  try {
    if (user) {
      const userData = JSON.parse(user);
      token = userData.token;
      id = userData.id;
    }
  } catch (error) {
    console.error("Error parsing user data:", error);
  }

  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const fetchComplaints = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${apiUrl}/GetAllTenantComplaintsByLandlordId/${id}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}`, Accept: "*/*" },
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setComplaints(
          data.map((c: Complaint, i: number) => ({ ...c, tenantName: `Tenant ${i + 1}` }))
        );
      } catch (error) {
        console.error("Error fetching complaints:", error);
        toast({ title: "Error loading complaints", description: "Could not retrieve complaints.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchComplaints();
  }, [toast, token]);

  const filteredComplaints = complaints.filter(
    (c) =>
      (c.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.tenantName && c.tenantName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        c.id.toString().includes(searchTerm)) &&
      (filterStatus === "all" || c.status.toLowerCase() === filterStatus.toLowerCase()) &&
      (filterPriority === "all" || c.priority === filterPriority)
  );

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  const pendingCount    = complaints.filter(c => c.status.toUpperCase() === "PENDING").length;
  const inProgressCount = complaints.filter(c => c.status.toUpperCase() === "IN_PROGRESS").length;
  const resolvedCount   = complaints.filter(c => c.status.toUpperCase() === "RESOLVED").length;
  const rejectedCount   = complaints.filter(c => c.status.toUpperCase() === "REJECTED").length;

  const selectCls =
    "h-9 rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm text-[#0F172A] shadow-sm " +
    "outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 cursor-pointer";

  const complaintColumns: Column<Complaint>[] = [
    {
      key: "id",
      header: "ID",
      headerClassName: "w-16",
      cell: (c) => (
        <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-600">
          #{c.id}
        </span>
      ),
    },
    {
      key: "property",
      header: "Property",
      cell: (c) => (
        <span className="flex items-center gap-1.5 text-sm text-slate-600">
          <Home className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          {c.property.name}
        </span>
      ),
    },
    {
      key: "subject",
      header: "Subject",
      cell: (c) => (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100">
            <MessageSquare className="h-3.5 w-3.5 text-slate-500" />
          </div>
          <span className="text-sm font-medium text-[#0F172A] line-clamp-1">{c.subject}</span>
        </div>
      ),
    },
    {
      key: "date",
      header: "Submitted",
      cell: (c) => (
        <span className="flex items-center gap-1.5 text-sm text-slate-500">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          {formatDate(c.dateCreated)}
        </span>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      cell: (c) => <PriorityBadge priority={c.priority} />,
    },
    {
      key: "status",
      header: "Status",
      cell: (c) => <StatusBadge status={c.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "text-right",
      className: "text-right",
      cell: (c) => (
        <button
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-[#1D4ED8] hover:bg-blue-50 transition-colors"
          onClick={() => setSelectedComplaint(c)}
        >
          <Eye className="h-3.5 w-3.5" /> View
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">

      {/* ── Hero banner ── */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#1E3A5F] to-[#1D4ED8] px-8 py-8 text-white shadow-xl">
        <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-8 left-1/3 h-40 w-40 rounded-full bg-white/5" />
        <div className="relative space-y-3">
          <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-200">
            Landlord Support
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Tenant Complaints</h1>
            <p className="mt-1 text-sm text-blue-200">
              Review incoming complaints, filter by urgency, and inspect attachments without leaving the page.
            </p>
          </div>
          {/* Inline stats */}
          <div className="flex flex-wrap gap-3 pt-1">
            {[
              { label: "Total",       value: complaints.length },
              { label: "Pending",     value: pendingCount,    color: "text-blue-300" },
              { label: "In Progress", value: inProgressCount, color: "text-amber-300" },
              { label: "Resolved",    value: resolvedCount,   color: "text-emerald-300" },
              { label: "Rejected",    value: rejectedCount,   color: "text-red-300" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-1.5">
                <span className={`text-sm font-bold ${s.color ?? "text-white"}`}>{s.value}</span>
                <span className="text-xs text-blue-200">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Pending"     value={pendingCount}    icon={AlertCircle}  iconBg="bg-blue-50"    iconColor="text-blue-600"    accent="border-l-blue-500" />
        <KpiCard label="In Progress" value={inProgressCount} icon={Clock}        iconBg="bg-amber-50"   iconColor="text-amber-600"   accent="border-l-amber-500" />
        <KpiCard label="Resolved"    value={resolvedCount}   icon={CheckCircle}  iconBg="bg-emerald-50" iconColor="text-emerald-600" accent="border-l-emerald-500" />
        <KpiCard label="Rejected"    value={rejectedCount}   icon={XCircle}      iconBg="bg-red-50"     iconColor="text-red-500"     accent="border-l-red-400" />
      </div>

      {/* ── Table ── */}
      <DataTable
        data={filteredComplaints}
        columns={complaintColumns}
        loading={loading}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by subject, tenant, or complaint ID…"
        label="complaint"
        pageSize={10}
        emptyMessage="No complaints found"
        emptyIcon={<MessageSquare className="h-6 w-6 text-slate-300" />}
        headerRight={
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select className={selectCls} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
            </select>
            <select className={selectCls} value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
              <option value="all">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        }
      />

      {/* ── Complaint Details Modal ── */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

            {/* Header */}
            <div className="relative shrink-0 bg-gradient-to-r from-[#0F172A] to-[#1D4ED8] px-6 py-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-300">
                    Complaint #{selectedComplaint.id}
                  </p>
                  <h2 className="mt-0.5 text-xl font-bold leading-snug">{selectedComplaint.subject}</h2>
                </div>
                <button
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                  onClick={() => setSelectedComplaint(null)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge status={selectedComplaint.status} />
                <PriorityBadge priority={selectedComplaint.priority} />
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 gap-0 sm:grid-cols-2">

                {/* Left column */}
                <div className="border-r border-slate-100 px-6 py-4 space-y-0">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Details</p>
                  <DetailRow icon={Home} label="Property" value={`${selectedComplaint.property.name} — ${selectedComplaint.property.address}`} />
                  <DetailRow
                    icon={MessageSquare}
                    label="Description"
                    value={<span className="leading-relaxed text-slate-600">{selectedComplaint.description}</span>}
                  />
                  <DetailRow icon={Calendar} label="Date Submitted" value={formatDate(selectedComplaint.dateCreated)} />
                  {selectedComplaint.dateUpdated && (
                    <DetailRow icon={Calendar} label="Last Updated" value={formatDate(selectedComplaint.dateUpdated)} />
                  )}
                  {selectedComplaint.resolutionDetails && (
                    <DetailRow icon={CheckCircle} label="Resolution" value={selectedComplaint.resolutionDetails} />
                  )}
                </div>

                {/* Right column — attachment */}
                <div className="px-6 py-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Attachment</p>
                  {selectedComplaint.attachement ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                        <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="text-xs text-slate-600 truncate">
                          {selectedComplaint.attachement.split("\\").pop()}
                        </span>
                      </div>
                      <div className="overflow-hidden rounded-xl border border-slate-200">
                        <img
                          src={getImageUrl(selectedComplaint.attachement)}
                          alt="Attachment"
                          className="w-full object-cover"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
                      <div className="text-center">
                        <FileText className="mx-auto h-8 w-8 text-slate-300" />
                        <p className="mt-1 text-xs text-slate-400">No attachment</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer: action buttons */}
            <div className="shrink-0 flex items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
              <button
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                onClick={() => setSelectedComplaint(null)}
              >
                Close
              </button>

              {/* Status action buttons */}
              <div className="flex items-center gap-2">
                {(selectedComplaint.status.toUpperCase() === "PENDING" ||
                  selectedComplaint.status.toUpperCase() === "IN_PROGRESS") && (
                  <>
                    {selectedComplaint.status.toUpperCase() === "PENDING" && (
                      <button className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors">
                        <Clock className="h-3.5 w-3.5" /> Mark In Progress
                      </button>
                    )}
                    <button className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors">
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </button>
                    <button className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors">
                      <CheckCircle className="h-3.5 w-3.5" /> Resolve
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HandleComplaints;
