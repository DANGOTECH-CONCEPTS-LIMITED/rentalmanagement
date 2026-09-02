import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ChevronsLeft, ChevronsRight, Eye, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const statusClass = (status?: string | null) => {
  if (!status) return "bg-white/10 text-white border-white/20";
  const s = status.toLowerCase();
  if (s.includes("success") || s.includes("ok"))
    return "bg-green-500/20 text-green-300 border-green-500/30";
  if (s.includes("fail") || s.includes("error"))
    return "bg-red-500/20 text-red-300 border-red-500/30";
  if (s.includes("pend"))
    return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
  return "bg-white/10 text-white border-white/20";
};

const methodClass = (method?: string | null) => {
  if (!method) return "bg-white/10 text-white border-white/20";
  switch (method.toUpperCase()) {
    case "GET":
      return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    case "POST":
      return "bg-blue-500/20 text-blue-300 border-blue-500/30";
    case "PUT":
      return "bg-amber-500/20 text-amber-300 border-amber-500/30";
    case "PATCH":
      return "bg-orange-500/20 text-orange-300 border-orange-500/30";
    case "DELETE":
      return "bg-red-500/20 text-red-300 border-red-500/30";
    default:
      return "bg-white/10 text-white border-white/20";
  }
};

const roleClass = (role?: string | null) => {
  if (!role) return "bg-white/10 text-white border-white/20";
  const r = role.toLowerCase();
  if (r.includes("admin"))
    return "bg-purple-500/20 text-purple-300 border-purple-500/30";
  if (r.includes("landlord"))
    return "bg-blue-500/20 text-blue-300 border-blue-500/30";
  if (r.includes("utility") || r.includes("util") || r.includes("payment"))
    return "bg-orange-500/20 text-orange-300 border-orange-500/30";
  return "bg-white/10 text-white border-white/20";
};

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
  const [selectedEntry, setSelectedEntry] = useState<AuditTrailEntry | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const rowsPerPage = 10;

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
      toast({
        title: "Error",
        description: "Authentication token not found.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.get<AuditTrailEntry[]>(
        `${apiUrl}/GetAuditTrail`,
        {
          params: {
            startDate,
            endDate,
            userId: userFilter,
            action: actionFilter,
            route: routeFilter,
          },
          headers: { Authorization: `Bearer ${token}`, accept: "*/*" },
        },
      );

      const sortedLogs = [...(response.data ?? [])].sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      );
      setLogs(sortedLogs);
      setCurrentPage(1);
    } catch (error) {
      console.error("Error fetching audit trail:", error);
      toast({
        title: "Error",
        description: "Failed to retrieve audit trail.",
        variant: "destructive",
      });
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
        [
          log.userId,
          log.userName,
          log.userRole,
          log.httpMethod,
          log.route,
          log.action,
          log.description,
          log.requestData,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      return matchesQuery;
    });
  }, [logs, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / rowsPerPage));
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredLogs.slice(startIndex, startIndex + rowsPerPage);
  }, [currentPage, filteredLogs]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

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
          .join(","),
      ),
    ];

    const blob = new Blob([csvRows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-trail-${startDate}-to-${endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="dark text-white min-h-full space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Audit Trail
        </h1>
        <p className="text-blue-200">
          Review user activity, action type, and request details captured by the
          audit trail.
        </p>
      </div>

      <Card className="p-4 space-y-4 bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[180px_180px_1fr_1fr_auto]">
          <div className="space-y-2">
            <Label className="text-blue-100" htmlFor="start-date">
              Start date
            </Label>
            <Input
              id="start-date"
              type="date"
              variant="dark"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              max={endDate || undefined}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-blue-100" htmlFor="end-date">
              End date
            </Label>
            <Input
              id="end-date"
              type="date"
              variant="dark"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              min={startDate || undefined}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-blue-100" htmlFor="user-filter">
              User ID
            </Label>
            <Input
              id="user-filter"
              variant="dark"
              value={userFilter}
              onChange={(event) => setUserFilter(event.target.value)}
              placeholder="Filter by user ID"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-blue-100" htmlFor="action-filter">
              Action
            </Label>
            <Input
              id="action-filter"
              variant="dark"
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
              placeholder="Filter by action"
            />
          </div>
          <div className="flex flex-col justify-end gap-2">
            <Button
              onClick={fetchAuditTrail}
              className="w-full md:w-auto bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 shadow-lg"
            >
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={exportCsv}
              disabled={filteredLogs.length === 0}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
          <div className="space-y-2">
            <Label className="text-blue-100" htmlFor="route-filter">
              Route
            </Label>
            <Input
              id="route-filter"
              variant="dark"
              value={routeFilter}
              onChange={(event) => setRouteFilter(event.target.value)}
              placeholder="Filter by route"
            />
          </div>
          <div className="space-y-2 md:col-span-2 xl:col-span-3">
            <Label className="text-blue-100" htmlFor="search-term">
              Search
            </Label>
            <Input
              id="search-term"
              variant="dark"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by user, route, action, description"
            />
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
        {isLoading ? (
          <div className="py-8 text-center text-blue-200">
            Loading audit trail...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-8 text-center text-blue-200">
            No audit entries found for the selected criteria.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-blue-200">
                Showing {filteredLogs.length} matching audit entries.
              </p>
              <p className="text-sm text-blue-200">
                Page {currentPage} of {totalPages}
              </p>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{formatDate(log.createdAt)}</TableCell>
                      <TableCell>{log.userId}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={roleClass(log.userRole)}
                        >
                          {log.userRole || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={methodClass(log.httpMethod)}
                        >
                          {log.httpMethod}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[240px] truncate">
                        {log.route}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {log.action}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={statusClass(log.resultStatus)}
                        >
                          {log.resultStatus || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedEntry(log)}
                          className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex justify-end">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                    disabled={currentPage === 1}
                    className="text-white hover:bg-white/10"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-blue-200">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setCurrentPage((page) => Math.min(totalPages, page + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="text-white hover:bg-white/10"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      <Dialog
        open={!!selectedEntry}
        onOpenChange={(open) => !open && setSelectedEntry(null)}
      >
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto bg-slate-900/95 border border-white/20 text-white rounded-[28px]">
          <DialogHeader>
            <DialogTitle className="text-white">
              Audit Entry Details
            </DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="p-4 text-sm space-y-2 bg-white/5 border border-white/10 rounded-2xl">
                  <p>
                    <span className="font-medium">Date:</span>{" "}
                    {formatDate(selectedEntry.createdAt)}
                  </p>
                  <p>
                    <span className="font-medium">User ID:</span>{" "}
                    {selectedEntry.userId}
                  </p>
                  <p>
                    <span className="font-medium">User Name:</span>{" "}
                    {selectedEntry.userName || "-"}
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="font-medium">Role:</span>{" "}
                    <Badge
                      variant="outline"
                      className={roleClass(selectedEntry.userRole)}
                    >
                      {selectedEntry.userRole || "-"}
                    </Badge>
                  </p>
                </Card>
                <Card className="p-4 text-sm space-y-2 bg-white/5 border border-white/10 rounded-2xl">
                  <p className="flex items-center gap-2">
                    <span className="font-medium">Method:</span>{" "}
                    <Badge
                      variant="outline"
                      className={methodClass(selectedEntry.httpMethod)}
                    >
                      {selectedEntry.httpMethod}
                    </Badge>
                  </p>
                  <p>
                    <span className="font-medium">Route:</span>{" "}
                    {selectedEntry.route}
                  </p>
                  <p>
                    <span className="font-medium">Action:</span>{" "}
                    {selectedEntry.action}
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="font-medium">Status:</span>{" "}
                    <Badge
                      variant="outline"
                      className={statusClass(selectedEntry.resultStatus)}
                    >
                      {selectedEntry.resultStatus || "-"}
                    </Badge>
                  </p>
                </Card>
                <Card className="p-4 text-sm space-y-2 bg-white/5 border border-white/10 rounded-2xl">
                  <p>
                    <span className="font-medium">IP:</span>{" "}
                    {selectedEntry.sourceIp || "-"}
                  </p>
                  <p>
                    <span className="font-medium">Description:</span>{" "}
                    {selectedEntry.description || "-"}
                  </p>
                </Card>
              </div>
              <Card className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                <h3 className="font-semibold">Request Data</h3>
                <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap break-all rounded-md bg-slate-950/80 border border-white/10 p-4 text-xs text-blue-100">
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
