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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronsLeft,
  ChevronsRight,
  Download,
  Eye,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const httpMethodClass = (method?: string | null) => {
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

const httpStatusClass = (status?: string | number | null) => {
  if (status === undefined || status === null || status === "")
    return "bg-white/10 text-white border-white/20";
  const s = Number(status);
  if (Number.isNaN(s)) {
    const str = String(status).toLowerCase();
    if (str.includes("success") || str.includes("ok"))
      return "bg-green-500/20 text-green-300 border-green-500/30";
    if (str.includes("fail") || str.includes("error"))
      return "bg-red-500/20 text-red-300 border-red-500/30";
    return "bg-white/10 text-white border-white/20";
  }
  if (s >= 200 && s < 300)
    return "bg-green-500/20 text-green-300 border-green-500/30";
  if (s >= 300 && s < 400)
    return "bg-amber-500/20 text-amber-300 border-amber-500/30";
  if (s >= 400 && s < 500)
    return "bg-orange-500/20 text-orange-300 border-orange-500/30";
  if (s >= 500) return "bg-red-500/20 text-red-300 border-red-500/30";
  return "bg-white/10 text-white border-white/20";
};

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

const HttpLogs = () => {
  const today = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(today.getDate() - 7);

  const [startDate, setStartDate] = useState(toInputDate(weekAgo));
  const [endDate, setEndDate] = useState(toInputDate(today));
  const [searchTerm, setSearchTerm] = useState("");
  const [logs, setLogs] = useState<HttpLogEntry[]>([]);
  const [selectedLog, setSelectedLog] = useState<HttpLogEntry | null>(null);
  const [methodFilter, setMethodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serilogFiles, setSerilogFiles] = useState<SerilogFileEntry[]>([]);
  const [selectedSerilogFile, setSelectedSerilogFile] =
    useState<SerilogFileContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSerilogFiles, setIsLoadingSerilogFiles] = useState(false);
  const [isLoadingSerilogContent, setIsLoadingSerilogContent] = useState(false);
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

  const formatSize = (sizeBytes: number) => {
    if (sizeBytes < 1024) {
      return `${sizeBytes} B`;
    }

    if (sizeBytes < 1024 * 1024) {
      return `${(sizeBytes / 1024).toFixed(1)} KB`;
    }

    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const fetchLogs = async () => {
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
      const response = await axios.get<HttpLogEntry[]>(
        `${apiUrl}/GetRequestResponseByDate`,
        {
          params: { startDate, endDate },
          headers: {
            Authorization: `Bearer ${token}`,
            accept: "*/*",
          },
        },
      );

      const sortedLogs = [...(response.data ?? [])].sort(
        (left, right) =>
          new Date(right.createdAt ?? 0).getTime() -
          new Date(left.createdAt ?? 0).getTime(),
      );

      setLogs(sortedLogs);
      setCurrentPage(1);
    } catch (error) {
      console.error("Error fetching HTTP logs:", error);
      toast({
        title: "Error",
        description: "Failed to retrieve HTTP logs.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSerilogFiles = async () => {
    const token = getToken();

    if (!token) {
      return;
    }

    setIsLoadingSerilogFiles(true);

    try {
      const response = await axios.get<SerilogFileEntry[]>(
        `${apiUrl}/GetSerilogLogFiles`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            accept: "*/*",
          },
        },
      );

      setSerilogFiles(response.data ?? []);
    } catch (error) {
      console.error("Error fetching Serilog files:", error);
      toast({
        title: "Error",
        description: "Failed to retrieve raw Serilog log files.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSerilogFiles(false);
    }
  };

  const fetchSerilogFileContent = async (fileName: string) => {
    const token = getToken();

    if (!token) {
      return;
    }

    setIsLoadingSerilogContent(true);

    try {
      const response = await axios.get<SerilogFileContent>(
        `${apiUrl}/GetSerilogLogFileContent`,
        {
          params: { fileName },
          headers: {
            Authorization: `Bearer ${token}`,
            accept: "*/*",
          },
        },
      );

      setSelectedSerilogFile(response.data);
    } catch (error) {
      console.error("Error fetching Serilog file content:", error);
      toast({
        title: "Error",
        description: "Failed to retrieve selected log file.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSerilogContent(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchSerilogFiles();
  }, []);

  const availableMethods = useMemo(
    () =>
      Array.from(
        new Set(logs.map((log) => log.requestType).filter(Boolean)),
      ).sort(),
    [logs],
  );

  const availableStatuses = useMemo(
    () =>
      Array.from(new Set(logs.map((log) => log.status).filter(Boolean))).sort(),
    [logs],
  );

  const filteredLogs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesMethod =
        methodFilter === "all" || log.requestType === methodFilter;
      const matchesStatus =
        statusFilter === "all" || log.status === statusFilter;
      const matchesQuery =
        !query ||
        [
          log.requestType,
          log.requestUrl,
          log.status,
          log.errorMessage,
          log.request,
          log.response,
          formatDate(log.createdAt),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      return matchesMethod && matchesStatus && matchesQuery;
    });
  }, [logs, methodFilter, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / rowsPerPage));

  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredLogs.slice(startIndex, startIndex + rowsPerPage);
  }, [currentPage, filteredLogs]);

  useEffect(() => {
    setCurrentPage(1);
  }, [methodFilter, searchTerm, statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const exportLogsCsv = () => {
    if (filteredLogs.length === 0) {
      return;
    }

    const csvRows = [
      [
        "Date",
        "Method",
        "Request URL",
        "Status",
        "Error",
        "Request",
        "Response",
      ]
        .map(escapeCsvCell)
        .join(","),
      ...filteredLogs.map((log) =>
        [
          formatDate(log.createdAt),
          log.requestType || "",
          log.requestUrl || "",
          log.status || "",
          log.errorMessage || "",
          log.request || "",
          log.response || "",
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
    link.download = `http-logs-${startDate}-to-${endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="dark text-white min-h-full space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          HTTP Logs
        </h1>
        <p className="text-blue-200">
          Retrieve and inspect outbound HTTP requests and responses by date
          range.
        </p>
      </div>

      <Tabs defaultValue="database" className="space-y-4">
        <TabsList className="bg-white/10 border border-white/20 p-1 rounded-xl">
          <TabsTrigger
            value="database"
            className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-lg text-blue-100"
          >
            HTTP Request / Response
          </TabsTrigger>
          <TabsTrigger
            value="files"
            className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-lg text-blue-100"
          >
            Raw Serilog Files
          </TabsTrigger>
        </TabsList>

        <TabsContent value="database" className="space-y-4">
          <Card className="p-4 space-y-4 bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="start-date" className="text-blue-100">
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
                <Label htmlFor="end-date" className="text-blue-100">
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
                <Label className="text-blue-100">Method</Label>
                <Select value={methodFilter} onValueChange={setMethodFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All methods" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All methods</SelectItem>
                    {availableMethods.map((method) => (
                      <SelectItem key={method} value={method!}>
                        {method}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-blue-100">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {availableStatuses.map((status) => (
                      <SelectItem key={status} value={status!}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="log-search" className="text-blue-100">
                  Search logs
                </Label>
                <Input
                  id="log-search"
                  variant="dark"
                  placeholder="Search by URL, method, status, or content"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  onClick={fetchLogs}
                  className="w-full md:w-auto bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 shadow-lg"
                >
                  Retrieve Logs
                </Button>
                <Button
                  variant="outline"
                  onClick={exportLogsCsv}
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
            {isLoading ? (
              <div className="py-8 text-center text-blue-200">
                Loading logs...
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="py-8 text-center text-blue-200">
                No request/response logs found for the selected criteria.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-blue-200">
                    Showing {filteredLogs.length} matching log entries.
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
                        <TableHead>Method</TableHead>
                        <TableHead>Request URL</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Error</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>{formatDate(log.createdAt)}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={httpMethodClass(log.requestType)}
                            >
                              {log.requestType || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[360px] truncate">
                            {log.requestUrl || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={httpStatusClass(log.status)}
                            >
                              {log.status || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[240px] truncate">
                            {log.errorMessage || "-"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedLog(log)}
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
                          setCurrentPage((page) =>
                            Math.min(totalPages, page + 1),
                          )
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
        </TabsContent>

        <TabsContent value="files" className="space-y-4">
          <Card className="p-4 space-y-4 bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Serilog Files</h2>
                <p className="text-sm text-blue-200">
                  Browse raw API file logs written to the backend logs folder.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={fetchSerilogFiles}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                Retrieve Files
              </Button>
            </div>

            {isLoadingSerilogFiles ? (
              <div className="py-8 text-center text-blue-200">
                Loading file logs...
              </div>
            ) : serilogFiles.length === 0 ? (
              <div className="py-8 text-center text-blue-200">
                No raw Serilog log files were found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Last Modified</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {serilogFiles.map((file) => (
                      <TableRow key={file.fileName}>
                        <TableCell>{file.fileName}</TableCell>
                        <TableCell>{formatDate(file.lastModified)}</TableCell>
                        <TableCell>{formatSize(file.sizeBytes)}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              fetchSerilogFileContent(file.fileName)
                            }
                            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            Open
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={!!selectedLog}
        onOpenChange={(open) => !open && setSelectedLog(null)}
      >
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto bg-slate-900/95 border border-white/20 text-white rounded-[28px]">
          <DialogHeader>
            <DialogTitle className="text-white">
              HTTP Request / Response Log
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="font-medium">Date:</span>{" "}
                      {formatDate(selectedLog.createdAt)}
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="font-medium">Method:</span>{" "}
                      <Badge
                        variant="outline"
                        className={httpMethodClass(selectedLog.requestType)}
                      >
                        {selectedLog.requestType || "-"}
                      </Badge>
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="font-medium">Status:</span>{" "}
                      <Badge
                        variant="outline"
                        className={httpStatusClass(selectedLog.status)}
                      >
                        {selectedLog.status || "-"}
                      </Badge>
                    </p>
                    <p>
                      <span className="font-medium">URL:</span>{" "}
                      {selectedLog.requestUrl || "-"}
                    </p>
                    <p>
                      <span className="font-medium">Error:</span>{" "}
                      {selectedLog.errorMessage || "-"}
                    </p>
                  </div>
                </Card>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="p-4 space-y-2 bg-white/5 border border-white/10 rounded-2xl">
                  <h3 className="font-semibold">Request</h3>
                  <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-all rounded-md bg-slate-950/80 border border-white/10 p-4 text-xs text-blue-100">
                    {selectedLog.request || "No request payload recorded."}
                  </pre>
                </Card>

                <Card className="p-4 space-y-2 bg-white/5 border border-white/10 rounded-2xl">
                  <h3 className="font-semibold">Response</h3>
                  <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-all rounded-md bg-slate-950/80 border border-white/10 p-4 text-xs text-blue-100">
                    {selectedLog.response || "No response payload recorded."}
                  </pre>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!selectedSerilogFile || isLoadingSerilogContent}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedSerilogFile(null);
          }
        }}
      >
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto bg-slate-900/95 border border-white/20 text-white rounded-[28px]">
          <DialogHeader>
            <DialogTitle className="text-white">
              {selectedSerilogFile?.fileName || "Raw Serilog Log File"}
            </DialogTitle>
          </DialogHeader>
          {isLoadingSerilogContent ? (
            <div className="py-8 text-center text-blue-200">
              Loading file content...
            </div>
          ) : selectedSerilogFile ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="p-4 text-sm bg-white/5 border border-white/10 rounded-2xl">
                  <span className="font-medium">File:</span>{" "}
                  {selectedSerilogFile.fileName}
                </Card>
                <Card className="p-4 text-sm bg-white/5 border border-white/10 rounded-2xl">
                  <span className="font-medium">Modified:</span>{" "}
                  {formatDate(selectedSerilogFile.lastModified)}
                </Card>
                <Card className="p-4 text-sm bg-white/5 border border-white/10 rounded-2xl">
                  <span className="font-medium">Size:</span>{" "}
                  {formatSize(selectedSerilogFile.sizeBytes)}
                </Card>
              </div>
              <Card className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                <pre className="max-h-[560px] overflow-auto whitespace-pre-wrap break-all rounded-md bg-slate-950/80 border border-white/10 p-4 text-xs text-blue-100">
                  {selectedSerilogFile.content || "No file content available."}
                </pre>
              </Card>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HttpLogs;
