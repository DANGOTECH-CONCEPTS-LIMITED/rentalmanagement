import { useState, useEffect } from "react";
import { getImageUrl } from "@/lib/imageUrl";
import {
  MessageSquare, Filter, Eye, CheckCircle, XCircle, Clock, AlertCircle, FileText, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, Column } from "@/components/ui/data-table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";

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
        toast({ title: "Error", description: error.response?.data || "Failed to load complaints.", variant: "destructive" });
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
    const matchStatus = filterStatus === "all" || c.status.toLowerCase() === filterStatus.toLowerCase();
    const matchPriority = filterPriority === "all" || c.priority.toLowerCase() === filterPriority.toLowerCase();
    return matchSearch && matchStatus && matchPriority;
  });

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  const priorityBadge = (p: string) => {
    const map: Record<string, string> = {
      high: "bg-red-100 text-red-800 border-red-200",
      medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
      low: "bg-green-100 text-green-800 border-green-200",
    };
    return (
      <Badge variant="outline" className={map[p.toLowerCase()] ?? "bg-gray-100 text-gray-800 border-gray-200"}>
        {p.charAt(0).toUpperCase() + p.slice(1)}
      </Badge>
    );
  };

  const statusCell = (s: string) => {
    const upper = s.toUpperCase();
    const icons: Record<string, React.ReactNode> = {
      PENDING: <AlertCircle className="h-4 w-4 text-blue-500" />,
      IN_PROGRESS: <Clock className="h-4 w-4 text-yellow-500" />,
      RESOLVED: <CheckCircle className="h-4 w-4 text-green-500" />,
      REJECTED: <XCircle className="h-4 w-4 text-red-500" />,
    };
    const labels: Record<string, string> = {
      PENDING: "Pending", IN_PROGRESS: "In Progress", RESOLVED: "Resolved", REJECTED: "Rejected",
    };
    return (
      <div className="flex items-center gap-1.5">
        {icons[upper] ?? <AlertCircle className="h-4 w-4 text-gray-400" />}
        <span>{labels[upper] ?? s}</span>
      </div>
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
      key: "actions", header: "Actions", headerClassName: "text-right", className: "text-right",
      cell: (c) => (
        <Button variant="ghost" size="sm" className="text-blue-600" onClick={() => setSelected(c)}>
          <Eye className="h-4 w-4 mr-1" />View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <section className="page-hero">
        <div className="space-y-3">
          <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Admin
          </span>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">All Complaints</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              System-wide view of all tenant complaints across every property.
            </p>
          </div>
        </div>
      </section>

      <div className="data-surface p-0 overflow-hidden">
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
          headerRight={
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        />
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl rounded-[24px]">
          <DialogHeader>
            <DialogTitle>Complaint #{selected?.id}</DialogTitle>
            <DialogDescription>{selected?.subject}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Subject</p>
                  <p className="mt-1">{selected.subject}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</p>
                  <p className="mt-1">{selected.description}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Property</p>
                  <p className="mt-1">{selected.property?.name} — {selected.property?.address}</p>
                </div>
                <div className="flex gap-6">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</p>
                    <div className="mt-1">{statusCell(selected.status)}</div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Priority</p>
                    <div className="mt-1">{priorityBadge(selected.priority)}</div>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Submitted</p>
                  <p className="mt-1 flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {formatDate(selected.dateCreated)}
                  </p>
                </div>
                {selected.dateUpdated && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Last Updated</p>
                    <p className="mt-1 flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {formatDate(selected.dateUpdated)}
                    </p>
                  </div>
                )}
                {selected.resolutionDetails && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Resolution</p>
                    <p className="mt-1">{selected.resolutionDetails}</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Attachment</p>
                {selected.attachement ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span className="text-xs truncate">{selected.attachement.split("\\").pop()}</span>
                    </div>
                    <img
                      src={getImageUrl(selected.attachement)}
                      alt="Attachment"
                      className="w-full rounded-lg object-cover"
                    />
                  </div>
                ) : (
                  <p className="text-muted-foreground">No attachment</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AllComplaints;
