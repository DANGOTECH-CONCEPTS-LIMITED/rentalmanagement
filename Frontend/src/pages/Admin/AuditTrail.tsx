import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable, Column } from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";
import { Eye, Download } from "lucide-react";

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

const formatDate = (dateValue?: string) => {
  if (!dateValue) {
    return "-";
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

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
    if (filteredLogs.length === 0) {
      return;
    }

    const csvRows = [
      [
        "Date",
        "User",
        "Role",
        "Method",
        "Route",
        "Action",
        "Status",
        "Source IP",
        "Description",
        "Request Data",
      ]
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
      cell: (log) => formatDate(log.createdAt),
    },
    {
      key: "user",
      header: "User",
      cell: (log) => log.userId,
    },
    {
      key: "role",
      header: "Role",
      cell: (log) => log.userRole || "-",
    },
    {
      key: "method",
      header: "Method",
      cell: (log) => log.httpMethod,
    },
    {
      key: "route",
      header: "Route",
      className: "max-w-[240px] truncate",
      cell: (log) => log.route,
    },
    {
      key: "action",
      header: "Action",
      className: "max-w-[200px] truncate",
      cell: (log) => log.action,
    },
    {
      key: "status",
      header: "Status",
      cell: (log) => log.resultStatus || "-",
    },
    {
      key: "details",
      header: "Details",
      cell: (log) => (
        <Button variant="outline" size="sm" onClick={() => setSelectedEntry(log)}>
          <Eye className="mr-2 h-4 w-4" />
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Trail</h1>
        <p className="text-muted-foreground">
          Review user activity, action type, and request details captured by the audit trail.
        </p>
      </div>

      <Card className="p-4 space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[180px_180px_1fr_1fr_auto]">
          <div className="space-y-2">
            <Label htmlFor="start-date">Start date</Label>
            <Input id="start-date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} max={endDate || undefined} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-date">End date</Label>
            <Input id="end-date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} min={startDate || undefined} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-filter">User ID</Label>
            <Input id="user-filter" value={userFilter} onChange={(event) => setUserFilter(event.target.value)} placeholder="Filter by user ID" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="action-filter">Action</Label>
            <Input id="action-filter" value={actionFilter} onChange={(event) => setActionFilter(event.target.value)} placeholder="Filter by action" />
          </div>
          <div className="flex flex-col justify-end gap-2">
            <Button onClick={fetchAuditTrail} className="w-full md:w-auto">
              Refresh
            </Button>
            <Button variant="outline" onClick={exportCsv} disabled={filteredLogs.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4 mb-4">
          <div className="space-y-2">
            <Label htmlFor="route-filter">Route</Label>
            <Input id="route-filter" value={routeFilter} onChange={(event) => setRouteFilter(event.target.value)} placeholder="Filter by route" />
          </div>
        </div>

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
      </Card>

      <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Entry Details</DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="p-4 text-sm space-y-2">
                  <p><span className="font-medium">Date:</span> {formatDate(selectedEntry.createdAt)}</p>
                  <p><span className="font-medium">User ID:</span> {selectedEntry.userId}</p>
                  <p><span className="font-medium">User Name:</span> {selectedEntry.userName || "-"}</p>
                  <p><span className="font-medium">Role:</span> {selectedEntry.userRole || "-"}</p>
                </Card>
                <Card className="p-4 text-sm space-y-2">
                  <p><span className="font-medium">Method:</span> {selectedEntry.httpMethod}</p>
                  <p><span className="font-medium">Route:</span> {selectedEntry.route}</p>
                  <p><span className="font-medium">Action:</span> {selectedEntry.action}</p>
                  <p><span className="font-medium">Status:</span> {selectedEntry.resultStatus || "-"}</p>
                </Card>
                <Card className="p-4 text-sm space-y-2">
                  <p><span className="font-medium">IP:</span> {selectedEntry.sourceIp || "-"}</p>
                  <p><span className="font-medium">Description:</span> {selectedEntry.description || "-"}</p>
                </Card>
              </div>
              <Card className="p-4">
                <h3 className="font-semibold">Request Data</h3>
                <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap break-all rounded-md bg-slate-950 p-4 text-xs text-slate-50">
                  {selectedEntry.requestData || "No request data available."}
                </pre>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditTrail;
