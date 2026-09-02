import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useCurrencyFormatter } from "@/hooks/use-currency-formatter";
import { ChevronsLeft, ChevronsRight, Download, Eye } from "lucide-react";

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

const formatDate = (dateValue?: string) => {
  if (!dateValue) {
    return "-";
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString();
};

const toInputDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const destinationClass = (dest?: string | null) => {
  if (!dest) return "bg-white/10 text-white border-white/20";
  const d = dest.toLowerCase();
  if (d.includes("bulk"))
    return "bg-purple-500/20 text-purple-300 border-purple-500/30";
  if (d.includes("flexi") || d.includes("flexipay"))
    return "bg-blue-500/20 text-blue-300 border-blue-500/30";
  if (d.includes("sms"))
    return "bg-orange-500/20 text-orange-300 border-orange-500/30";
  return "bg-white/10 text-white border-white/20";
};

const endpointStatusClass = (status?: string | null) => {
  if (!status) return "bg-white/10 text-white border-white/20";
  const s = status.toLowerCase();
  if (s.includes("success"))
    return "bg-green-500/20 text-green-300 border-green-500/30";
  if (s.includes("fail") || s.includes("error"))
    return "bg-red-500/20 text-red-300 border-red-500/30";
  return "bg-white/10 text-white border-white/20";
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
  const [selectedEntry, setSelectedEntry] =
    useState<CollectoWithdrawHistoryEntry | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const rowsPerPage = 10;

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
      toast({
        title: "Error",
        description: "Authentication token not found.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.get<CollectoWithdrawHistoryEntry[]>(
        `${apiUrl}/GetCollectoWalletWithdrawalHistory`,
        {
          params: { startDate, endDate },
          headers: {
            Authorization: `Bearer ${token}`,
            accept: "*/*",
          },
        },
      );

      setEntries(response.data ?? []);
      setCurrentPage(1);
    } catch (error) {
      console.error("Error fetching Collecto withdrawal history:", error);
      toast({
        title: "Error",
        description: "Failed to retrieve Collecto wallet withdrawal history.",
        variant: "destructive",
      });
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
        destinationFilter === "all" ||
        entry.withdrawTo.toLowerCase() === destinationFilter.toLowerCase();
      const matchesStatus =
        statusFilter === "all" ||
        entry.endpointStatus.toLowerCase() === statusFilter.toLowerCase();
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

  const totalPages = Math.max(
    1,
    Math.ceil(filteredEntries.length / rowsPerPage),
  );

  const paginatedEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredEntries.slice(startIndex, startIndex + rowsPerPage);
  }, [currentPage, filteredEntries]);

  useEffect(() => {
    setCurrentPage(1);
  }, [destinationFilter, searchTerm, statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const exportCsv = () => {
    if (filteredEntries.length === 0) {
      return;
    }

    const csvRows = [
      [
        "Date",
        "Reference",
        "Amount",
        "Withdraw To",
        "Requested By",
        "Endpoint Status",
        "Collecto Status",
        "Collecto HTTP Status",
        "Error",
      ]
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
          .join(","),
      ),
    ];

    const blob = new Blob([csvRows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `collecto-wallet-withdrawals-${startDate}-to-${endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="dark text-white min-h-full space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Collecto Withdraw Logs
        </h1>
        <p className="text-blue-200">
          Review every admin withdraw request sent through the local endpoint
          and the downstream Collecto wallet call it triggered.
        </p>
      </div>

      <Card className="p-4 space-y-4 bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
        <div className="grid gap-4 md:grid-cols-[repeat(2,minmax(0,180px))_repeat(2,minmax(0,180px))_minmax(0,1fr)_auto]">
          <div className="space-y-2">
            <Label htmlFor="collecto-start-date" className="text-blue-100">
              Start date
            </Label>
            <Input
              id="collecto-start-date"
              type="date"
              variant="dark"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              max={endDate || undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="collecto-end-date" className="text-blue-100">
              End date
            </Label>
            <Input
              id="collecto-end-date"
              type="date"
              variant="dark"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              min={startDate || undefined}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-blue-100">Destination</Label>
            <Select
              value={destinationFilter}
              onValueChange={setDestinationFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="All destinations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All destinations</SelectItem>
                <SelectItem value="BULK">BULK</SelectItem>
                <SelectItem value="flexipay">FLEXIPAY</SelectItem>
                <SelectItem value="SMS">SMS</SelectItem>
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
                <SelectItem value="SUCCESS">Success</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="collecto-log-search" className="text-blue-100">
              Search
            </Label>
            <Input
              id="collecto-log-search"
              variant="dark"
              placeholder="Search by reference, payload, user, or error"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button
              onClick={fetchHistory}
              className="w-full md:w-auto bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 shadow-lg"
            >
              Retrieve Logs
            </Button>
            <Button
              variant="outline"
              onClick={exportCsv}
              disabled={filteredEntries.length === 0}
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
            Loading withdrawal history...
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="py-8 text-center text-blue-200">
            No withdrawal history found for the selected criteria.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-blue-200">
                Showing {filteredEntries.length} matching withdrawal records.
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
                    <TableHead>Reference</TableHead>
                    <TableHead>Withdraw To</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Collecto</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{formatDate(entry.createdAt)}</TableCell>
                      <TableCell>{entry.reference}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={destinationClass(entry.withdrawTo)}
                        >
                          {entry.withdrawTo}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[240px] truncate">
                        {entry.requestedByEmail}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={endpointStatusClass(entry.endpointStatus)}
                        >
                          {entry.endpointStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            entry.collectoStatus
                              ? endpointStatusClass(entry.collectoStatus)
                              : entry.isSuccess
                                ? "bg-green-500/20 text-green-300 border-green-500/30"
                                : "bg-red-500/20 text-red-300 border-red-500/30"
                          }
                        >
                          {entry.collectoStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(entry.amount)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedEntry(entry)}
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
        <DialogContent className="max-w-5xl rounded-[28px] bg-slate-900/95 border border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              Withdraw log details
            </DialogTitle>
          </DialogHeader>

          {selectedEntry && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                  <p className="text-xs uppercase tracking-[0.16em] text-blue-200">
                    Reference
                  </p>
                  <p className="mt-2 font-semibold text-white">
                    {selectedEntry.reference}
                  </p>
                </Card>
                <Card className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                  <p className="text-xs uppercase tracking-[0.16em] text-blue-200">
                    Amount
                  </p>
                  <p className="mt-2 font-semibold text-white">
                    {formatCurrency(selectedEntry.amount)}
                  </p>
                </Card>
                <Card className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                  <p className="text-xs uppercase tracking-[0.16em] text-blue-200">
                    Destination
                  </p>
                  <p className="mt-2 font-semibold text-white">
                    {selectedEntry.withdrawTo}
                  </p>
                </Card>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="space-y-4 p-4 bg-white/5 border border-white/10 rounded-2xl">
                  <div>
                    <h3 className="font-semibold text-white">
                      Local endpoint log
                    </h3>
                    <p className="text-sm text-blue-200">
                      Request made to `/withdrawFromCollectoWallet`
                    </p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="flex items-center gap-2">
                      <span className="font-medium">Status:</span>{" "}
                      <Badge
                        variant="outline"
                        className={endpointStatusClass(
                          selectedEntry.endpointStatus,
                        )}
                      >
                        {selectedEntry.endpointStatus}
                      </Badge>
                    </p>
                    <p>
                      <span className="font-medium">URL:</span>{" "}
                      {selectedEntry.endpointRequestUrl}
                    </p>
                    <p>
                      <span className="font-medium">Requested By:</span>{" "}
                      {selectedEntry.requestedByEmail}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-blue-100">Request payload</Label>
                    <pre className="max-h-56 overflow-auto rounded-2xl bg-slate-950/80 border border-white/10 p-4 text-xs text-blue-100">
                      {selectedEntry.endpointRequestPayload || "-"}
                    </pre>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-blue-100">Response payload</Label>
                    <pre className="max-h-56 overflow-auto rounded-2xl bg-slate-950/80 border border-white/10 p-4 text-xs text-blue-100">
                      {selectedEntry.endpointResponsePayload || "-"}
                    </pre>
                  </div>
                </Card>

                <Card className="space-y-4 p-4 bg-white/5 border border-white/10 rounded-2xl">
                  <div>
                    <h3 className="font-semibold text-white">
                      Collecto endpoint log
                    </h3>
                    <p className="text-sm text-blue-200">
                      Outbound request made to the Collecto `withdrawFromWallet`
                      endpoint
                    </p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="flex items-center gap-2">
                      <span className="font-medium">Status:</span>{" "}
                      <Badge
                        variant="outline"
                        className={
                          selectedEntry.collectoStatus
                            ? endpointStatusClass(selectedEntry.collectoStatus)
                            : selectedEntry.isSuccess
                              ? "bg-green-500/20 text-green-300 border-green-500/30"
                              : "bg-red-500/20 text-red-300 border-red-500/30"
                        }
                      >
                        {selectedEntry.collectoStatus}
                      </Badge>
                    </p>
                    <p>
                      <span className="font-medium">HTTP status:</span>{" "}
                      {selectedEntry.collectoHttpStatusCode}
                    </p>
                    <p>
                      <span className="font-medium">URL:</span>{" "}
                      {selectedEntry.collectoRequestUrl || "-"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-blue-100">Request payload</Label>
                    <pre className="max-h-56 overflow-auto rounded-2xl bg-slate-950/80 border border-white/10 p-4 text-xs text-blue-100">
                      {selectedEntry.collectoRequestPayload || "-"}
                    </pre>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-blue-100">Response payload</Label>
                    <pre className="max-h-56 overflow-auto rounded-2xl bg-slate-950/80 border border-white/10 p-4 text-xs text-blue-100">
                      {selectedEntry.collectoResponsePayload || "-"}
                    </pre>
                  </div>
                </Card>
              </div>

              {selectedEntry.errorMessage ? (
                <Card className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl">
                  <p className="font-medium text-red-300">Error</p>
                  <pre className="mt-2 whitespace-pre-wrap text-sm text-red-200">
                    {selectedEntry.errorMessage}
                  </pre>
                </Card>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CollectoWithdrawLogs;
