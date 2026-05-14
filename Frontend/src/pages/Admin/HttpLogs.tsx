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
import { DataTable, Column } from "@/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Download, Eye, FileText, Copy, Check } from "lucide-react";

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

const prettyJson = (raw?: string | null): string => {
  if (!raw) return "";
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
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
    <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleCopy}>
      {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
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

      <Tabs defaultValue="database" className="space-y-4">
        <TabsList>
          <TabsTrigger value="database">HTTP Request / Response</TabsTrigger>
          <TabsTrigger value="files">Raw Serilog Files</TabsTrigger>
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
            <DataTable
              data={filteredLogs}
              columns={[
                { key: "date", header: "Date", cell: (l) => formatDate(l.createdAt) },
                { key: "method", header: "Method", cell: (l) => l.requestType || "-" },
                { key: "url", header: "Request URL", className: "max-w-[360px] truncate", cell: (l) => l.requestUrl || "-" },
                { key: "status", header: "Status", cell: (l) => l.status || "-" },
                { key: "error", header: "Error", className: "max-w-[240px] truncate", cell: (l) => l.errorMessage || "-" },
                {
                  key: "actions", header: "Actions",
                  cell: (l) => (
                    <Button variant="outline" size="sm" onClick={() => setSelectedLog(l)}>
                      <Eye className="mr-2 h-4 w-4" />View
                    </Button>
                  ),
                },
              ]}
              loading={isLoading}
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Search by URL, method, status, or content"
              label="log"
              emptyMessage="No request/response logs found for the selected criteria"
              minWidth="860px"
            />
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

            <DataTable
              data={serilogFiles}
              columns={[
                { key: "name", header: "File Name", cell: (f) => f.fileName },
                { key: "modified", header: "Last Modified", cell: (f) => formatDate(f.lastModified) },
                { key: "size", header: "Size", cell: (f) => formatSize(f.sizeBytes) },
                {
                  key: "actions", header: "Actions",
                  cell: (f) => (
                    <Button variant="outline" size="sm" onClick={() => fetchSerilogFileContent(f.fileName)}>
                      <FileText className="mr-2 h-4 w-4" />Open
                    </Button>
                  ),
                },
              ]}
              loading={isLoadingSerilogFiles}
              label="file"
              emptyMessage="No raw Serilog log files were found"
            />
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log Details</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-5">
              {/* Metadata strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                {[
                  { label: "Date", value: formatDate(selectedLog.createdAt) },
                  { label: "Method", value: selectedLog.requestType || "—" },
                  { label: "Status", value: selectedLog.status || "—" },
                  { label: "Error", value: selectedLog.errorMessage || "None" },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg border bg-muted/40 px-3 py-2">
                    <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                    <p className="font-medium truncate text-slate-800">{value}</p>
                  </div>
                ))}
              </div>
              {/* URL row */}
              <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                <p className="text-xs text-muted-foreground mb-0.5">Request URL</p>
                <p className="font-mono text-slate-800 break-all">{selectedLog.requestUrl || "—"}</p>
              </div>

              {/* Request & Response */}
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700">Request Body</h3>
                    {selectedLog.request && <CopyButton text={prettyJson(selectedLog.request)} />}
                  </div>
                  <pre className="max-h-[380px] overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-950 p-4 text-xs text-slate-50 leading-relaxed">
                    {prettyJson(selectedLog.request) || <span className="text-slate-500 italic">No request payload recorded.</span>}
                  </pre>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700">Response Body</h3>
                    {selectedLog.response && <CopyButton text={prettyJson(selectedLog.response)} />}
                  </div>
                  <pre className="max-h-[380px] overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-950 p-4 text-xs text-slate-50 leading-relaxed">
                    {prettyJson(selectedLog.response) || <span className="text-slate-500 italic">No response payload recorded.</span>}
                  </pre>
                </div>
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