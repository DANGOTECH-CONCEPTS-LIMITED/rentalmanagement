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
import { DataTablePagination } from "@/components/common/DataTablePagination";
import { useToast } from "@/hooks/use-toast";
import { Download, Eye, FileText } from "lucide-react";

interface HttpLogEntry {
  id: number;
  request?: string | null;
  response?: string | null;
  status?: string | null;
  errorMessage?: string | null;
  requestType?: string | null;
  requestUrl?: string | null;
  source?: string | null;
  createdAt?: string;
}

interface SerilogFileEntry {
  fileName: string;
  sizeBytes: number;
  lastModified?: string;
}

interface SerilogFileContent extends SerilogFileEntry {
  content: string;
  truncated?: boolean;
}

interface DbServiceLog {
  id: number;
  serviceName: string;
  logDate: string;
  logLevel: string;
  message: string;
  exception?: string | null;
  sourceType?: string | null;
  sourceIdentifier?: string | null;
  rawContent?: string | null;
}

interface DbServiceLogPage {
  items: DbServiceLog[];
  page: number;
  pageSize: number;
  total: number;
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
  const [sourceFilter, setSourceFilter] = useState("all");
  const [serilogFiles, setSerilogFiles] = useState<SerilogFileEntry[]>([]);
  const [selectedSerilogFile, setSelectedSerilogFile] =
    useState<SerilogFileContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSerilogFiles, setIsLoadingSerilogFiles] = useState(false);
  const [isLoadingSerilogContent, setIsLoadingSerilogContent] = useState(false);
  const [dbLogs, setDbLogs] = useState<DbServiceLog[]>([]);
  const [dbTotal, setDbTotal] = useState(0);
  const [dbPage, setDbPage] = useState(1);
  const [dbPageSize, setDbPageSize] = useState(50);
  const [dbSource, setDbSource] = useState("all");
  const [dbSearch, setDbSearch] = useState("");
  const [isLoadingDbLogs, setIsLoadingDbLogs] = useState(false);
  const [dbLogsLoaded, setDbLogsLoaded] = useState(false);
  const [selectedDbLog, setSelectedDbLog] = useState<DbServiceLog | null>(null);
  const [isImportingLogs, setIsImportingLogs] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const [rowsPerPage, setRowsPerPage] = useState(10);

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
        }
      );

      const sortedLogs = [...(response.data ?? [])].sort(
        (left, right) =>
          new Date(right.createdAt ?? 0).getTime() -
          new Date(left.createdAt ?? 0).getTime()
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
        }
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
        }
      );

      setSelectedSerilogFile(response.data);
    } catch (error) {
      console.error("Error fetching Serilog file content:", error);
      const serverMessage =
        axios.isAxiosError(error) && typeof error.response?.data?.message === "string"
          ? error.response.data.message
          : null;
      const serverDetail =
        axios.isAxiosError(error) && typeof error.response?.data?.error === "string"
          ? error.response.data.error
          : null;
      toast({
        title: "Error",
        description: [serverMessage, serverDetail].filter(Boolean).join(" ") ||
          "Failed to retrieve selected log file.",
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

  // Reads log events persisted in the database, so earlier days stay inspectable after rotation.
  const fetchDbLogs = async (page = 1) => {
    const token = getToken();

    if (!token) {
      return;
    }

    setIsLoadingDbLogs(true);

    try {
      const response = await axios.get<DbServiceLogPage>(
        `${apiUrl}/GetDbServiceLogs`,
        {
          params: {
            startDate,
            endDate,
            ...(dbSource !== "all" ? { sourceType: dbSource } : {}),
            ...(dbSearch.trim() ? { search: dbSearch.trim() } : {}),
            page,
            pageSize: dbPageSize,
          },
          headers: {
            Authorization: `Bearer ${token}`,
            accept: "*/*",
          },
        }
      );

      setDbLogs(response.data.items ?? []);
      setDbTotal(response.data.total ?? 0);
      setDbPage(response.data.page ?? page);
    } catch (error) {
      console.error("Error fetching database service logs:", error);
      const message =
        axios.isAxiosError(error) && typeof error.response?.data?.message === "string"
          ? error.response.data.message
          : "Failed to retrieve previous logs.";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setIsLoadingDbLogs(false);
    }
  };

  const importSerilogLogs = async (fileName?: string) => {
    const token = getToken();

    if (!token) {
      return;
    }

    setIsImportingLogs(true);

    try {
      const response = await axios.post(
        `${apiUrl}/ImportSerilogLogsToDb`,
        null,
        {
          params: fileName ? { fileName } : {},
          headers: {
            Authorization: `Bearer ${token}`,
            accept: "*/*",
          },
        }
      );

      const result = response.data ?? {};
      toast({
        title: "Import complete",
        description: `${result.eventsImported ?? 0} new event(s) stored from ${result.filesProcessed ?? 0} file(s); ${result.eventsSkipped ?? 0} already present.`,
      });
      await fetchDbLogs(1);
    } catch (error) {
      console.error("Error importing Serilog files:", error);
      const message =
        axios.isAxiosError(error) && typeof error.response?.data?.message === "string"
          ? error.response.data.message
          : "Failed to import Serilog log files.";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setIsImportingLogs(false);
    }
  };

  const availableMethods = useMemo(
    () => Array.from(new Set(logs.map((log) => log.requestType).filter(Boolean))).sort(),
    [logs]
  );

  const availableStatuses = useMemo(
    () => Array.from(new Set(logs.map((log) => log.status).filter(Boolean))).sort(),
    [logs]
  );

  const availableSources = useMemo(
    () => Array.from(new Set(logs.map((log) => log.source).filter(Boolean))).sort(),
    [logs]
  );

  const filteredLogs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesMethod =
        methodFilter === "all" || log.requestType === methodFilter;
      const matchesStatus =
        statusFilter === "all" || log.status === statusFilter;
      const matchesSource =
        sourceFilter === "all" || log.source === sourceFilter;
      const matchesQuery =
        !query ||
        [
          log.requestType,
          log.requestUrl,
          log.status,
          log.errorMessage,
          log.request,
          log.response,
          log.source,
          formatDate(log.createdAt),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      return matchesMethod && matchesStatus && matchesSource && matchesQuery;
    });
  }, [logs, methodFilter, searchTerm, statusFilter, sourceFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / rowsPerPage));

  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredLogs.slice(startIndex, startIndex + rowsPerPage);
  }, [currentPage, filteredLogs, rowsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [methodFilter, searchTerm, statusFilter, sourceFilter]);

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
          .join(",")
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">HTTP Logs</h1>
        <p className="text-muted-foreground">
          Retrieve and inspect outbound HTTP requests and responses by date range.
        </p>
      </div>

      <Tabs
        defaultValue="database"
        className="space-y-4"
        onValueChange={(value) => {
          if (value === "previous" && !dbLogsLoaded) {
            setDbLogsLoaded(true);
            void fetchDbLogs(1);
          }
        }}
      >
        <TabsList>
          <TabsTrigger value="database">HTTP Request / Response</TabsTrigger>
          <TabsTrigger value="files">Raw Serilog Files</TabsTrigger>
          <TabsTrigger value="previous">Previous Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="database" className="space-y-4">
          <Card className="p-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-[repeat(2,minmax(0,180px))_repeat(2,minmax(0,180px))_minmax(0,1fr)_auto]">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  max={endDate || undefined}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  min={startDate || undefined}
                />
              </div>
              <div className="space-y-2">
                <Label>Method</Label>
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
                <Label>Status</Label>
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
              <div className="space-y-2">
                <Label>Source</Label>
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sources</SelectItem>
                    {availableSources.map((source) => (
                      <SelectItem key={source} value={source!}>
                        {source}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="log-search">Search logs</Label>
                <Input
                  id="log-search"
                  placeholder="Search by URL, method, status, or content"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={fetchLogs} className="w-full md:w-auto">
                  Retrieve Logs
                </Button>
                <Button
                  variant="outline"
                  onClick={exportLogsCsv}
                  disabled={filteredLogs.length === 0}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading logs...</div>
            ) : filteredLogs.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No request/response logs found for the selected criteria.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {filteredLogs.length} matching log entries.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Source</TableHead>
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
                          <TableCell>{log.requestType || "-"}</TableCell>
                          <TableCell>{log.source || "-"}</TableCell>
                          <TableCell className="max-w-[360px] truncate">
                            {log.requestUrl || "-"}
                          </TableCell>
                          <TableCell>{log.status || "-"}</TableCell>
                          <TableCell className="max-w-[240px] truncate">
                            {log.errorMessage || "-"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedLog(log)}
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

                <DataTablePagination
                  page={currentPage}
                  pageSize={rowsPerPage}
                  totalCount={filteredLogs.length}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(nextSize) => {
                    setRowsPerPage(nextSize);
                    setCurrentPage(1);
                  }}
                  itemLabel="log entries"
                  className="rounded-lg border"
                />
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="previous" className="space-y-4">
          <Card className="p-4 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Previous logs</h2>
                <p className="text-sm text-muted-foreground">
                  Log events persisted in the database, so earlier days stay available after Serilog
                  rotates or deletes its raw file. Use “Import log files to DB” to load every file
                  still present in the server&apos;s logs folder.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => void importSerilogLogs()}
                disabled={isImportingLogs}
              >
                {isImportingLogs ? "Importing..." : "Import log files to DB"}
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-[180px_180px_180px_minmax(0,1fr)_auto]">
              <div className="space-y-2">
                <Label htmlFor="db-start-date">Start date</Label>
                <Input
                  id="db-start-date"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  max={endDate || undefined}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="db-end-date">End date</Label>
                <Input
                  id="db-end-date"
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  min={startDate || undefined}
                />
              </div>
              <div className="space-y-2">
                <Label>Source</Label>
                <Select value={dbSource} onValueChange={setDbSource}>
                  <SelectTrigger>
                    <SelectValue placeholder="All sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sources</SelectItem>
                    <SelectItem value="SerilogSink">SerilogSink</SelectItem>
                    <SelectItem value="SerilogFile">SerilogFile</SelectItem>
                    <SelectItem value="ApplicationError">ApplicationError</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="db-log-search">Search message, exception or raw content</Label>
                <Input
                  id="db-log-search"
                  value={dbSearch}
                  onChange={(event) => setDbSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void fetchDbLogs(1);
                  }}
                  placeholder="e.g. DANGO_B_20261106_49"
                />
              </div>
              <Button onClick={() => void fetchDbLogs(1)} disabled={isLoadingDbLogs}>
                {isLoadingDbLogs ? "Searching..." : "Search"}
              </Button>
            </div>

            {isLoadingDbLogs ? (
              <div className="py-8 text-center text-muted-foreground">Loading previous logs...</div>
            ) : dbLogs.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No stored log events for this range. Import the log files to persist earlier days.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dbLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="whitespace-nowrap">{formatDate(log.logDate)}</TableCell>
                          <TableCell>{log.logLevel || "-"}</TableCell>
                          <TableCell>{log.sourceType || "-"}</TableCell>
                          <TableCell>{log.serviceName || "-"}</TableCell>
                          <TableCell className="max-w-[420px] truncate">{log.message || "-"}</TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm" onClick={() => setSelectedDbLog(log)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <DataTablePagination
                  page={dbPage}
                  pageSize={dbPageSize}
                  totalCount={dbTotal}
                  onPageChange={(nextPage) => void fetchDbLogs(nextPage)}
                  onPageSizeChange={(nextSize) => {
                    setDbPageSize(nextSize);
                    void fetchDbLogs(1);
                  }}
                  itemLabel="log events"
                  className="rounded-lg border"
                />
              </>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="files" className="space-y-4">
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Serilog Files</h2>
                <p className="text-sm text-muted-foreground">
                  Browse raw API file logs written to the backend logs folder.
                </p>
              </div>
              <Button variant="outline" onClick={fetchSerilogFiles}>
                Retrieve Files
              </Button>
            </div>

            {isLoadingSerilogFiles ? (
              <div className="py-8 text-center text-muted-foreground">Loading file logs...</div>
            ) : serilogFiles.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
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
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => fetchSerilogFileContent(file.fileName)}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              Open
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void importSerilogLogs(file.fileName)}
                              disabled={isImportingLogs}
                            >
                              Import
                            </Button>
                          </div>
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

      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>HTTP Request / Response Log</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="p-4">
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Date:</span> {formatDate(selectedLog.createdAt)}</p>
                    <p><span className="font-medium">Method:</span> {selectedLog.requestType || "-"}</p>
                    <p><span className="font-medium">Status:</span> {selectedLog.status || "-"}</p>
                    <p><span className="font-medium">Source:</span> {selectedLog.source || "-"}</p>
                    <p><span className="font-medium">URL:</span> {selectedLog.requestUrl || "-"}</p>
                    <p><span className="font-medium">Error:</span> {selectedLog.errorMessage || "-"}</p>
                  </div>
                </Card>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="p-4 space-y-2">
                  <h3 className="font-semibold">Request</h3>
                  <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-all rounded-md bg-slate-950 p-4 text-xs text-slate-50">
                    {selectedLog.request || "No request payload recorded."}
                  </pre>
                </Card>

                <Card className="p-4 space-y-2">
                  <h3 className="font-semibold">Response</h3>
                  <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-all rounded-md bg-slate-950 p-4 text-xs text-slate-50">
                    {selectedLog.response || "No response payload recorded."}
                  </pre>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedDbLog} onOpenChange={(open) => !open && setSelectedDbLog(null)}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Stored log event</DialogTitle>
          </DialogHeader>
          {selectedDbLog && (
            <div className="space-y-4">
              <Card className="p-4">
                <div className="grid gap-2 text-sm md:grid-cols-2">
                  <p><span className="font-medium">Date:</span> {formatDate(selectedDbLog.logDate)}</p>
                  <p><span className="font-medium">Level:</span> {selectedDbLog.logLevel || "-"}</p>
                  <p><span className="font-medium">Source:</span> {selectedDbLog.sourceType || "-"}</p>
                  <p><span className="font-medium">Service:</span> {selectedDbLog.serviceName || "-"}</p>
                  <p><span className="font-medium">Identifier:</span> {selectedDbLog.sourceIdentifier || "-"}</p>
                </div>
              </Card>

              <Card className="p-4 space-y-2">
                <h3 className="font-semibold">Message</h3>
                <pre className="max-h-[240px] overflow-auto whitespace-pre-wrap break-all rounded-md bg-slate-950 p-4 text-xs text-slate-50">
                  {selectedDbLog.message || "No message recorded."}
                </pre>
              </Card>

              {selectedDbLog.exception && (
                <Card className="p-4 space-y-2">
                  <h3 className="font-semibold">Exception</h3>
                  <pre className="max-h-[320px] overflow-auto whitespace-pre-wrap break-all rounded-md bg-slate-950 p-4 text-xs text-slate-50">
                    {selectedDbLog.exception}
                  </pre>
                </Card>
              )}

              {selectedDbLog.rawContent && (
                <Card className="p-4 space-y-2">
                  <h3 className="font-semibold">Raw content</h3>
                  <pre className="max-h-[320px] overflow-auto whitespace-pre-wrap break-all rounded-md bg-slate-950 p-4 text-xs text-slate-50">
                    {selectedDbLog.rawContent}
                  </pre>
                </Card>
              )}
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
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedSerilogFile?.fileName || "Raw Serilog Log File"}
            </DialogTitle>
          </DialogHeader>
          {isLoadingSerilogContent ? (
            <div className="py-8 text-center text-muted-foreground">Loading file content...</div>
          ) : selectedSerilogFile ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="p-4 text-sm">
                  <span className="font-medium">File:</span> {selectedSerilogFile.fileName}
                </Card>
                <Card className="p-4 text-sm">
                  <span className="font-medium">Modified:</span> {formatDate(selectedSerilogFile.lastModified)}
                </Card>
                <Card className="p-4 text-sm">
                  <span className="font-medium">Size:</span> {formatSize(selectedSerilogFile.sizeBytes)}
                </Card>
              </div>
              <Card className="p-4">
                {selectedSerilogFile.truncated && (
                  <p className="mb-2 text-xs text-amber-600">
                    Showing the most recent portion of this file (it is larger than 5 MB).
                  </p>
                )}
                <pre className="max-h-[560px] overflow-auto whitespace-pre-wrap break-all rounded-md bg-slate-950 p-4 text-xs text-slate-50">
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