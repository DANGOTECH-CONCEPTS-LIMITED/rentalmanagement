import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  Check,
  ChevronsUpDown,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  SendHorizontal,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useCurrencyFormatter } from "@/hooks/use-currency-formatter";
import { useToast } from "@/hooks/use-toast";
import {
  exportWalletStatementCsv,
  exportWalletStatementPdf,
} from "@/lib/wallet-statement-export";
import { buildRunningBalanceStatement } from "@/lib/wallet-statement";
import { cn } from "@/lib/utils";

interface StoredUser {
  id: string | number;
  token?: string;
}

interface SystemRole {
  id: number;
  name?: string;
}

interface ApiUser {
  id: string;
  fullName: string;
  email: string;
  active?: boolean;
  verified?: boolean;
  systemRoleId: number;
  systemRole?: SystemRole;
}

interface WalletStatementEntry {
  amount: number;
  description: string;
  transactionDate: string;
  type?: string;
}

interface WalletBalanceRecord {
  user: ApiUser;
  balance: number | null;
  balanceLabel: string;
  lastStatementAt: string | null;
  statementCount: number | null;
  loading: boolean;
  error: string | null;
}

interface WalletMutationPayload {
  sourceUserId: string;
  targetUserId?: string;
  amount: number;
  reason: string;
  performedByAdminId: string;
}

const SUPPORTED_ROLE_NAMES = new Set(["landlord", "utility payment", "utililty payment"]);

const DEBIT_ENDPOINTS = [
  "/AdminDebitWallet",
  "/DebitWallet",
  "/Wallets/AdminDebit",
];

const TRANSFER_ENDPOINTS = [
  "/AdminTransferWallet",
  "/TransferWallet",
  "/WalletTransfer",
  "/Wallets/Transfer",
];

const getStoredUser = (): StoredUser => {
  const rawUser = localStorage.getItem("user");
  if (!rawUser) {
    throw new Error("No user found in localStorage");
  }

  return JSON.parse(rawUser) as StoredUser;
};

const getRoleLabel = (user: ApiUser) => user.systemRole?.name?.trim() || "User";

const getStatementSign = (entry: WalletStatementEntry) => {
  if (typeof entry.amount === "number") {
    return entry.amount > 0 ? "credit" : entry.amount < 0 ? "debit" : "neutral";
  }

  return "neutral";
};

const getEndpointErrorMessage = async (response: Response) => {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const data = await response.json().catch(() => null);
    return data?.message || data?.title || data?.error || response.statusText;
  }

  return (await response.text().catch(() => "")) || response.statusText;
};

const buildWalletMutationFormData = (payload: WalletMutationPayload) => {
  const formData = new FormData();
  formData.append("amount", payload.amount.toString());
  formData.append("reason", payload.reason);
  formData.append("description", payload.reason);
  formData.append("sourceUserId", payload.sourceUserId);
  formData.append("userId", payload.sourceUserId);
  formData.append("landlordid", payload.sourceUserId);
  formData.append("performedByAdminId", payload.performedByAdminId);

  if (payload.targetUserId) {
    formData.append("targetUserId", payload.targetUserId);
    formData.append("toUserId", payload.targetUserId);
    formData.append("recipientUserId", payload.targetUserId);
  }

  return formData;
};

const AdminWalletManagement = () => {
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const formatCurrency = useCurrencyFormatter();
  const { toast } = useToast();

  const [users, setUsers] = useState<ApiUser[]>([]);
  const [walletBalances, setWalletBalances] = useState<WalletBalanceRecord[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [statementEntries, setStatementEntries] = useState<WalletStatementEntry[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [isLoadingStatement, setIsLoadingStatement] = useState(false);
  const [listSearchTerm, setListSearchTerm] = useState("");
  const [statementSearchTerm, setStatementSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [accountPickerOpen, setAccountPickerOpen] = useState(false);
  const [transferTargetOpen, setTransferTargetOpen] = useState(false);
  const [debitDialogOpen, setDebitDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [debitAmount, setDebitAmount] = useState("");
  const [debitReason, setDebitReason] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [transferTargetUserId, setTransferTargetUserId] = useState("");
  const [isSubmittingDebit, setIsSubmittingDebit] = useState(false);
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);

  const storedUser = useMemo(() => {
    try {
      return getStoredUser();
    } catch {
      return null;
    }
  }, []);

  const token = storedUser?.token || "";
  const adminUserId = String(storedUser?.id || "");

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      accept: "*/*",
    }),
    [token]
  );

  const selectableUsers = useMemo(
    () =>
      users
        .filter((user) => SUPPORTED_ROLE_NAMES.has(getRoleLabel(user).trim().toLowerCase()))
        .sort((left, right) => left.fullName.localeCompare(right.fullName)),
    [users]
  );

  const selectedUser = useMemo(
    () => selectableUsers.find((user) => String(user.id) === selectedUserId) ?? null,
    [selectableUsers, selectedUserId]
  );

  const selectedBalanceRecord = useMemo(
    () => walletBalances.find((record) => String(record.user.id) === selectedUserId) ?? null,
    [walletBalances, selectedUserId]
  );

  const filteredBalanceRecords = useMemo(() => {
    const normalizedSearch = listSearchTerm.trim().toLowerCase();

    return walletBalances.filter((record) => {
      const roleLabel = getRoleLabel(record.user).trim().toLowerCase();
      const roleMatches = roleFilter === "all" || roleLabel === roleFilter;

      if (!roleMatches) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [record.user.fullName, record.user.email, getRoleLabel(record.user)]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [walletBalances, listSearchTerm, roleFilter]);

  const statementRows = useMemo(
    () => buildRunningBalanceStatement(statementEntries, selectedBalanceRecord?.balance ?? null),
    [statementEntries, selectedBalanceRecord?.balance]
  );

  const filteredStatementEntries = useMemo(() => {
    const normalizedSearch = statementSearchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return statementRows;
    }

    return statementRows.filter((entry) => {
      const amountText = String(entry.amount);
      const dateText = new Date(entry.transactionDate).toLocaleString().toLowerCase();
      const descriptionText = (entry.description || "").toLowerCase();
      return `${descriptionText} ${amountText} ${dateText}`.includes(normalizedSearch);
    });
  }, [statementRows, statementSearchTerm]);

  const statementCredits = useMemo(
    () => filteredStatementEntries.filter((entry) => entry.amount > 0),
    [filteredStatementEntries]
  );

  const statementDebits = useMemo(
    () => filteredStatementEntries.filter((entry) => entry.amount < 0),
    [filteredStatementEntries]
  );

  const totalTrackedBalance = useMemo(
    () => walletBalances.reduce((sum, record) => sum + (record.balance || 0), 0),
    [walletBalances]
  );

  const exportStatement = () => {
    if (!selectedUser || filteredStatementEntries.length === 0) {
      return;
    }

    exportWalletStatementCsv(filteredStatementEntries, {
      fileNamePrefix: "admin-wallet-statement",
      accountName: selectedUser.fullName,
      includeFlow: true,
    });

    toast({
      title: "Export Successful",
      description: `Statement for ${selectedUser.fullName} exported to CSV.`,
    });
  };

  const exportStatementPdf = () => {
    if (!selectedUser || filteredStatementEntries.length === 0) {
      return;
    }

    exportWalletStatementPdf(filteredStatementEntries, {
      title: "Wallet Statement",
      fileNamePrefix: "admin-wallet-statement",
      accountName: selectedUser.fullName,
      includeFlow: true,
      formatAmount: formatCurrency,
    });

    toast({
      title: "Export Successful",
      description: `Statement for ${selectedUser.fullName} exported to PDF.`,
    });
  };

  const fetchSelectableUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const response = await axios.get(`${apiUrl}/GetAllUsers`, { headers: authHeaders });
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Failed to fetch users", error);
      toast({
        title: "Error",
        description: "Failed to load landlord and utility users.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchStatement = async (userId: string) => {
    setIsLoadingStatement(true);
    try {
      const response = await fetch(`${apiUrl}/GetStatement/${userId}`, { headers: authHeaders });

      if (!response.ok) {
        throw new Error(`Failed to fetch statement: ${response.status}`);
      }

      const data = await response.json();
      setStatementEntries(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch statement", error);
      setStatementEntries([]);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to load the selected wallet statement.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingStatement(false);
    }
  };

  const fetchBalanceAndStatementSummary = async (user: ApiUser): Promise<WalletBalanceRecord> => {
    try {
      const [balanceResponse, statementResponse] = await Promise.all([
        fetch(`${apiUrl}/GetBalance/${user.id}`, { headers: authHeaders }),
        fetch(`${apiUrl}/GetStatement/${user.id}`, { headers: authHeaders }),
      ]);

      if (!balanceResponse.ok) {
        throw new Error(`Failed to fetch balance: ${balanceResponse.status}`);
      }

      if (!statementResponse.ok) {
        throw new Error(`Failed to fetch statement: ${statementResponse.status}`);
      }

      const balanceData = await balanceResponse.json();
      const statementData = await statementResponse.json();
      const entries = Array.isArray(statementData) ? statementData : [];
      const lastStatementAt = entries.length > 0 ? entries[0]?.transactionDate ?? null : null;

      return {
        user,
        balance: typeof balanceData?.balance === "number" ? balanceData.balance : Number(balanceData?.balance ?? 0),
        balanceLabel: typeof balanceData?.balance === "number"
          ? formatCurrency(balanceData.balance)
          : formatCurrency(Number(balanceData?.balance ?? 0)),
        lastStatementAt,
        statementCount: entries.length,
        loading: false,
        error: null,
      };
    } catch (error) {
      return {
        user,
        balance: null,
        balanceLabel: "Unavailable",
        lastStatementAt: null,
        statementCount: null,
        loading: false,
        error: error instanceof Error ? error.message : "Failed to load wallet balance",
      };
    }
  };

  const refreshWalletBalances = async (usersToLoad: ApiUser[]) => {
    setIsLoadingBalances(true);
    setWalletBalances(
      usersToLoad.map((user) => ({
        user,
        balance: null,
        balanceLabel: "Loading...",
        lastStatementAt: null,
        statementCount: null,
        loading: true,
        error: null,
      }))
    );

    try {
      const records = await Promise.all(usersToLoad.map((user) => fetchBalanceAndStatementSummary(user)));
      setWalletBalances(records);

      if (!selectedUserId && records.length > 0) {
        setSelectedUserId(String(records[0].user.id));
      }
    } finally {
      setIsLoadingBalances(false);
    }
  };

  const refreshSelectedUserData = async (userId: string) => {
    const matchingUser = selectableUsers.find((user) => String(user.id) === userId);
    if (!matchingUser) {
      return;
    }

    const updatedRecord = await fetchBalanceAndStatementSummary(matchingUser);

    setWalletBalances((current) =>
      current.map((record) =>
        String(record.user.id) === userId ? updatedRecord : record
      )
    );

    await fetchStatement(userId);
  };

  const runWalletMutation = async (
    endpoints: string[],
    payload: WalletMutationPayload
  ) => {
    const missingCandidates: string[] = [];

    for (const endpoint of endpoints) {
      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: "POST",
        headers: authHeaders,
        body: buildWalletMutationFormData(payload),
      }).catch((error) => {
        throw error;
      });

      if (response.ok) {
        return;
      }

      if (response.status === 404 || response.status === 405) {
        missingCandidates.push(endpoint);
        continue;
      }

      const message = await getEndpointErrorMessage(response);
      throw new Error(message || `Wallet action failed on ${endpoint}`);
    }

    throw new Error(
      `No supported wallet endpoint was found. Expected one of: ${missingCandidates.join(", ")}`
    );
  };

  const submitDebit = async () => {
    if (!selectedUser) {
      toast({
        title: "Select a wallet",
        description: "Choose a landlord or utility user before debiting a wallet.",
        variant: "destructive",
      });
      return;
    }

    const amount = Number(debitAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Enter a valid debit amount greater than zero.",
        variant: "destructive",
      });
      return;
    }

    if (!debitReason.trim()) {
      toast({
        title: "Reason required",
        description: "Add a reason so the debit appears clearly in the statement.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingDebit(true);
    try {
      await runWalletMutation(DEBIT_ENDPOINTS, {
        sourceUserId: String(selectedUser.id),
        amount,
        reason: debitReason.trim(),
        performedByAdminId: adminUserId,
      });

      toast({
        title: "Wallet debited",
        description: `${formatCurrency(amount)} was debited from ${selectedUser.fullName}.`,
      });

      setDebitAmount("");
      setDebitReason("");
      setDebitDialogOpen(false);
      await refreshSelectedUserData(String(selectedUser.id));
    } catch (error) {
      toast({
        title: "Debit failed",
        description: error instanceof Error ? error.message : "Failed to debit the wallet.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingDebit(false);
    }
  };

  const submitTransfer = async () => {
    if (!selectedUser) {
      toast({
        title: "Select a source wallet",
        description: "Choose the wallet you want to transfer funds from.",
        variant: "destructive",
      });
      return;
    }

    if (!transferTargetUserId) {
      toast({
        title: "Select a destination wallet",
        description: "Choose the wallet that should receive the funds.",
        variant: "destructive",
      });
      return;
    }

    if (transferTargetUserId === String(selectedUser.id)) {
      toast({
        title: "Invalid destination",
        description: "Source and destination wallets must be different.",
        variant: "destructive",
      });
      return;
    }

    const amount = Number(transferAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Enter a valid transfer amount greater than zero.",
        variant: "destructive",
      });
      return;
    }

    if (!transferReason.trim()) {
      toast({
        title: "Reason required",
        description: "Add a reason so the transfer appears clearly in both wallet statements.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingTransfer(true);
    try {
      await runWalletMutation(TRANSFER_ENDPOINTS, {
        sourceUserId: String(selectedUser.id),
        targetUserId: transferTargetUserId,
        amount,
        reason: transferReason.trim(),
        performedByAdminId: adminUserId,
      });

      const targetUser = selectableUsers.find((user) => String(user.id) === transferTargetUserId);

      toast({
        title: "Transfer completed",
        description: `${formatCurrency(amount)} was transferred from ${selectedUser.fullName} to ${targetUser?.fullName || "the selected wallet"}.`,
      });

      setTransferAmount("");
      setTransferReason("");
      setTransferTargetUserId("");
      setTransferDialogOpen(false);

      await Promise.all([
        refreshSelectedUserData(String(selectedUser.id)),
        refreshWalletBalances(selectableUsers),
      ]);
    } catch (error) {
      toast({
        title: "Transfer failed",
        description: error instanceof Error ? error.message : "Failed to transfer between wallets.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  useEffect(() => {
    if (!token) {
      return;
    }

    fetchSelectableUsers();
  }, [token]);

  useEffect(() => {
    if (selectableUsers.length === 0) {
      setWalletBalances([]);
      setSelectedUserId("");
      return;
    }

    refreshWalletBalances(selectableUsers);
  }, [selectableUsers]);

  useEffect(() => {
    if (!selectedUserId) {
      setStatementEntries([]);
      return;
    }

    fetchStatement(selectedUserId);
  }, [selectedUserId]);

  const selectedRoleFilter = roleFilter === "all" ? "All wallet roles" : roleFilter;
  const transferTargets = selectableUsers.filter((user) => String(user.id) !== selectedUserId);

  return (
    <div className="space-y-8">
      <section className="page-hero">
        <div className="max-w-4xl space-y-3">
          <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Wallet Control
          </span>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              Admin wallet management
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
              Review wallet balances for all landlords and utility payment users, inspect statements, debit wallets with a reason, and transfer funds between wallets.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card className="data-surface border-none shadow-none">
          <CardHeader className="pb-3">
            <CardDescription>Tracked wallets</CardDescription>
            <CardTitle className="text-3xl font-semibold text-slate-950">
              {walletBalances.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="data-surface border-none shadow-none">
          <CardHeader className="pb-3">
            <CardDescription>Total balance in scope</CardDescription>
            <CardTitle className="text-3xl font-semibold text-slate-950">
              {formatCurrency(totalTrackedBalance)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="data-surface border-none shadow-none">
          <CardHeader className="pb-3">
            <CardDescription>Statement rows for selected wallet</CardDescription>
            <CardTitle className="text-3xl font-semibold text-slate-950">
              {selectedUser ? filteredStatementEntries.length : 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="data-surface border-none shadow-none">
          <CardHeader className="pb-3">
            <CardDescription>Active filter</CardDescription>
            <CardTitle className="text-lg font-semibold text-slate-950">
              {selectedRoleFilter}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <Card className="data-surface border-none shadow-none">
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>Wallet balances</CardTitle>
                <CardDescription>
                  Search all landlord and utility payment wallets and open any statement from the same view.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refreshWalletBalances(selectableUsers)}
                disabled={isLoadingBalances || selectableUsers.length === 0}
              >
                {isLoadingBalances ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Refresh balances
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={listSearchTerm}
                  onChange={(event) => setListSearchTerm(event.target.value)}
                  placeholder="Search by name, email, or role"
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="landlord">Landlords</SelectItem>
                  <SelectItem value="utility payment">Utility payment</SelectItem>
                  <SelectItem value="utililty payment">Utililty payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingUsers || isLoadingBalances ? (
              <div className="space-y-3">
                {[...Array(6)].map((_, index) => (
                  <Skeleton key={index} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            ) : filteredBalanceRecords.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-10 text-center text-sm text-muted-foreground">
                No wallet records match the current filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Statement rows</TableHead>
                      <TableHead>Last activity</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBalanceRecords.map((record) => (
                      <TableRow
                        key={record.user.id}
                        className={cn(
                          "cursor-pointer transition-colors hover:bg-slate-50/90",
                          selectedUserId === String(record.user.id) && "bg-primary/5"
                        )}
                        onClick={() => setSelectedUserId(String(record.user.id))}
                      >
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium text-slate-950">{record.user.fullName}</p>
                            <p className="text-xs text-muted-foreground">{record.user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{getRoleLabel(record.user)}</Badge>
                        </TableCell>
                        <TableCell>{record.statementCount ?? "--"}</TableCell>
                        <TableCell>
                          {record.lastStatementAt
                            ? new Date(record.lastStatementAt).toLocaleString()
                            : "--"}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-slate-950">
                          {record.error ? (
                            <span className="text-sm font-medium text-red-600">Unavailable</span>
                          ) : (
                            record.balanceLabel
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="data-surface border-none shadow-none">
          <CardHeader className="space-y-4">
            <div>
              <CardTitle>Selected wallet</CardTitle>
              <CardDescription>
                Pick a wallet to review its balance, open the full statement, or perform admin actions.
              </CardDescription>
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-wallet-account-picker">Landlord or utility user</Label>
              <Popover open={accountPickerOpen} onOpenChange={setAccountPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="admin-wallet-account-picker"
                    type="button"
                    variant="outline"
                    role="combobox"
                    disabled={selectableUsers.length === 0}
                    className="h-12 w-full justify-between rounded-xl border-input/90 bg-white/95 px-4 py-3 font-normal shadow-sm"
                  >
                    <span className="truncate">
                      {selectedUser
                        ? `${selectedUser.fullName} (${getRoleLabel(selectedUser)})`
                        : selectableUsers.length > 0
                          ? "Search a landlord or utility wallet"
                          : "No wallets available"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search by name, email, or role" />
                    <CommandList>
                      <CommandEmpty>No wallet account found.</CommandEmpty>
                      <CommandGroup>
                        {selectableUsers.map((user) => (
                          <CommandItem
                            key={user.id}
                            value={`${user.fullName} ${user.email} ${getRoleLabel(user)}`}
                            onSelect={() => {
                              setSelectedUserId(String(user.id));
                              setAccountPickerOpen(false);
                            }}
                            className="flex items-start gap-3 py-3"
                          >
                            <Check
                              className={cn(
                                "mt-0.5 h-4 w-4",
                                selectedUserId === String(user.id) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium text-slate-900">{user.fullName}</p>
                              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                              <p className="text-xs text-muted-foreground">{getRoleLabel(user)}</p>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>
          <CardContent>
            {!selectedUser || !selectedBalanceRecord ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-10 text-center text-sm text-muted-foreground">
                Select a wallet from the table or search control to inspect its statement.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="rounded-[28px] border border-border/70 bg-white/95 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-lg font-semibold text-slate-950">{selectedUser.fullName}</p>
                      <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                    </div>
                    <Badge variant="secondary">{getRoleLabel(selectedUser)}</Badge>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Wallet balance</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">{selectedBalanceRecord.balanceLabel}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Latest statement entry</p>
                      <p className="mt-2 text-sm font-medium text-slate-950">
                        {selectedBalanceRecord.lastStatementAt
                          ? new Date(selectedBalanceRecord.lastStatementAt).toLocaleString()
                          : "No statement activity yet"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Button onClick={() => setDebitDialogOpen(true)} className="h-11 rounded-xl">
                    <Wallet className="mr-2 h-4 w-4" />
                    Debit wallet
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setTransferDialogOpen(true)}
                    className="h-11 rounded-xl"
                  >
                    <ArrowRightLeft className="mr-2 h-4 w-4" />
                    Transfer to another wallet
                  </Button>
                </div>

                <div className="rounded-[28px] border border-border/70 bg-slate-50/80 p-4 text-sm text-muted-foreground">
                  Debits and transfers send the reason as both the reason and description fields so the backend can record them in the wallet statement alongside credits and withdrawals.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="data-surface border-none shadow-none">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>Wallet statement</CardTitle>
              <CardDescription>
                {selectedUser
                  ? `Full statement for ${selectedUser.fullName}`
                  : "Select a wallet to inspect statement activity."}
              </CardDescription>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/70 bg-white/90 px-4 py-3 text-center">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Rows</p>
                <p className="mt-2 text-xl font-semibold text-slate-950">{filteredStatementEntries.length}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-white/90 px-4 py-3 text-center">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Credits</p>
                <p className="mt-2 text-xl font-semibold text-green-600">{statementCredits.length}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-white/90 px-4 py-3 text-center">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Debits</p>
                <p className="mt-2 text-xl font-semibold text-red-600">{statementDebits.length}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={statementSearchTerm}
                onChange={(event) => setStatementSearchTerm(event.target.value)}
                placeholder="Search statement description, amount, or date"
                className="pl-10"
                disabled={!selectedUser}
              />
            </div>
            <div className="flex gap-2 md:self-start">
              <Button
                variant="outline"
                onClick={exportStatement}
                disabled={!selectedUser || filteredStatementEntries.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                onClick={exportStatementPdf}
                disabled={!selectedUser || filteredStatementEntries.length === 0}
              >
                <FileText className="mr-2 h-4 w-4" />
                Export PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!selectedUser ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-10 text-center text-sm text-muted-foreground">
              Choose a wallet first to load its statement.
            </div>
          ) : isLoadingStatement ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, index) => (
                <Skeleton key={index} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : filteredStatementEntries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-10 text-center text-sm text-muted-foreground">
              No statement entries match the current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Flow</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Running balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStatementEntries.map((entry, index) => {
                    const flow = getStatementSign(entry);
                    return (
                      <TableRow key={`${entry.transactionDate}-${entry.amount}-${index}`}>
                        <TableCell>{new Date(entry.transactionDate).toLocaleString()}</TableCell>
                        <TableCell className="min-w-[280px]">
                          <div className="font-medium text-slate-950">{entry.description || "Wallet transaction"}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {flow === "credit" ? (
                              <ArrowDownLeft className="h-4 w-4 text-green-600" />
                            ) : flow === "debit" ? (
                              <ArrowUpRight className="h-4 w-4 text-red-600" />
                            ) : (
                              <SendHorizontal className="h-4 w-4 text-slate-500" />
                            )}
                            <span className="capitalize">{flow}</span>
                          </div>
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-semibold",
                            flow === "credit" && "text-green-600",
                            flow === "debit" && "text-red-600"
                          )}
                        >
                          {entry.amount > 0 ? "+" : ""}
                          {formatCurrency(entry.amount)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-slate-950">
                          {entry.runningBalance !== null
                            ? formatCurrency(entry.runningBalance)
                            : "--"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={debitDialogOpen} onOpenChange={setDebitDialogOpen}>
        <DialogContent className="rounded-[28px] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Debit wallet</DialogTitle>
            <DialogDescription>
              Remove funds from the selected wallet and record the reason in the statement.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-wallet-debit-amount">Amount</Label>
              <Input
                id="admin-wallet-debit-amount"
                type="number"
                min="0"
                step="0.01"
                value={debitAmount}
                onChange={(event) => setDebitAmount(event.target.value)}
                placeholder="Enter amount to debit"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-wallet-debit-reason">Reason</Label>
              <Textarea
                id="admin-wallet-debit-reason"
                value={debitReason}
                onChange={(event) => setDebitReason(event.target.value)}
                placeholder="Explain why this wallet is being debited"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDebitDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitDebit} disabled={isSubmittingDebit}>
                {isSubmittingDebit ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Debiting...
                  </>
                ) : (
                  "Confirm debit"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="rounded-[28px] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Transfer between wallets</DialogTitle>
            <DialogDescription>
              Move funds from the selected wallet to another landlord or utility payment wallet and preserve the reason in the statement.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Destination wallet</Label>
              <Select
                value={transferTargetUserId}
                onValueChange={setTransferTargetUserId}
                disabled={transferTargets.length === 0}
              >
                <SelectTrigger className="h-12 w-full rounded-xl border-input/90 bg-white/95 px-4 py-3 shadow-sm">
                  <SelectValue placeholder="Select destination wallet" />
                </SelectTrigger>
                <SelectContent>
                  {transferTargets.length === 0 ? (
                    <SelectItem value="__no_destination_wallet__" disabled>
                      No destination wallet found
                    </SelectItem>
                  ) : (
                    transferTargets.map((user) => (
                      <SelectItem key={user.id} value={String(user.id)}>
                        {user.fullName} ({getRoleLabel(user)})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="admin-wallet-transfer-amount">Amount</Label>
                <Input
                  id="admin-wallet-transfer-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={transferAmount}
                  onChange={(event) => setTransferAmount(event.target.value)}
                  placeholder="Enter amount to transfer"
                />
              </div>
              <div className="rounded-2xl border border-border/70 bg-slate-50 px-4 py-3 text-sm text-muted-foreground">
                Transfers debit the source wallet and should credit the destination wallet when the backend endpoint supports paired statement entries.
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-wallet-transfer-reason">Reason</Label>
              <Textarea
                id="admin-wallet-transfer-reason"
                value={transferReason}
                onChange={(event) => setTransferReason(event.target.value)}
                placeholder="Explain why the funds are moving between wallets"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitTransfer} disabled={isSubmittingTransfer}>
                {isSubmittingTransfer ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Transferring...
                  </>
                ) : (
                  "Confirm transfer"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminWalletManagement;