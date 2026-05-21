import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  Check,
  CircleDollarSign,
  CreditCard,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  SendHorizontal,
  Wallet,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DataTable, Column } from "@/components/ui/data-table";
import { useCurrencyFormatter } from "@/hooks/use-currency-formatter";
import { useToast } from "@/hooks/use-toast";
import {
  exportWalletStatementCsv,
  exportWalletStatementPdf,
} from "@/lib/wallet-statement-export";
import { buildRunningBalanceStatement } from "@/lib/wallet-statement";
import { cn } from "@/lib/utils";

const inputCls =
  "h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] shadow-sm outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10";
const selCls =
  "h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-sm text-[#0F172A] shadow-sm outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 cursor-pointer";

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
  const [accountPickerSearch, setAccountPickerSearch] = useState("");
  const [accountPickerOpen, setAccountPickerOpen] = useState(false);
  const [transferTargetOpen, setTransferTargetOpen] = useState(false);
  const [debitDialogOpen, setDebitDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [debitAmount, setDebitAmount] = useState("");
  const [debitReason, setDebitReason] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [transferTargetUserId, setTransferTargetUserId] = useState("");
  const [transferTargetSearchTerm, setTransferTargetSearchTerm] = useState("");
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
  const filteredTransferTargets = useMemo(() => {
    const normalizedSearch = transferTargetSearchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return transferTargets;
    }

    return transferTargets.filter((user) =>
      [user.fullName, user.email, getRoleLabel(user)]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [transferTargetSearchTerm, transferTargets]);

  const filteredAccountPickerUsers = useMemo(() => {
    const s = accountPickerSearch.trim().toLowerCase();
    if (!s) return selectableUsers;
    return selectableUsers.filter((u) =>
      [u.fullName, u.email, getRoleLabel(u)].join(" ").toLowerCase().includes(s)
    );
  }, [accountPickerSearch, selectableUsers]);

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl px-8 py-8 text-white shadow-xl" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0f2044 45%, #1a3a6e 100%)" }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-200">
              Admin
            </span>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Admin Wallet Management</h1>
            <p className="text-sm text-blue-200/80">
              Review balances for all landlords and utility payment users, inspect statements, debit wallets, and transfer funds between accounts.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
              <Wallet className="h-7 w-7 text-blue-200" />
            </div>
          </div>
        </div>
      </section>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 border-l-4 border-l-blue-500 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tracked Wallets</p>
              <p className="mt-1.5 text-2xl font-bold text-[#0F172A]">{walletBalances.length}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
              <Wallet className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 border-l-4 border-l-emerald-500 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Balance in Scope</p>
              <p className="mt-1.5 text-2xl font-bold text-[#0F172A]">{formatCurrency(totalTrackedBalance)}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
              <CircleDollarSign className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 border-l-4 border-l-violet-500 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Statement Rows (Selected)</p>
              <p className="mt-1.5 text-2xl font-bold text-[#0F172A]">{selectedUser ? filteredStatementEntries.length : 0}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50">
              <CreditCard className="h-5 w-5 text-violet-600" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 border-l-4 border-l-amber-500 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Filter</p>
              <p className="mt-1.5 text-lg font-bold text-[#0F172A]">{selectedRoleFilter}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50">
              <ArrowRightLeft className="h-5 w-5 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Wallet Balances + Selected Wallet Panel */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        {/* Wallet Balances Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-base font-bold text-[#0F172A]">Wallet Balances</h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  Search all landlord and utility payment wallets and open any statement.
                </p>
              </div>
              <button
                onClick={() => refreshWalletBalances(selectableUsers)}
                disabled={isLoadingBalances || selectableUsers.length === 0}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                {isLoadingBalances ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Refresh
              </button>
            </div>
            {/* Search + Filter row */}
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className={cn(inputCls, "pl-9")}
                  placeholder="Search by name, email, or role"
                  value={listSearchTerm}
                  onChange={(e) => setListSearchTerm(e.target.value)}
                />
              </div>
              <select
                className={cn(selCls, "w-full sm:w-48")}
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">All roles</option>
                <option value="landlord">Landlords</option>
                <option value="utility payment">Utility payment</option>
                <option value="utililty payment">Utililty payment</option>
              </select>
            </div>
          </div>
          <div className="p-4">
            {(() => {
              const walletBalanceColumns: Column<WalletBalanceRecord>[] = [
                {
                  key: "account",
                  header: "Account",
                  cell: (record) => (
                    <div
                      className={cn(
                        "cursor-pointer space-y-0.5",
                        selectedUserId === String(record.user.id) && "text-[#1D4ED8]"
                      )}
                      onClick={() => setSelectedUserId(String(record.user.id))}
                    >
                      <p className="font-semibold text-[#0F172A]">{record.user.fullName}</p>
                      <p className="text-xs text-slate-500">{record.user.email}</p>
                    </div>
                  ),
                },
                {
                  key: "role",
                  header: "Role",
                  cell: (record) => (
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                      {getRoleLabel(record.user)}
                    </span>
                  ),
                },
                {
                  key: "statementCount",
                  header: "Statement rows",
                  cell: (record) => record.statementCount ?? "--",
                },
                {
                  key: "lastActivity",
                  header: "Last activity",
                  cell: (record) =>
                    record.lastStatementAt
                      ? new Date(record.lastStatementAt).toLocaleString()
                      : "--",
                },
                {
                  key: "balance",
                  header: "Balance",
                  headerClassName: "text-right",
                  className: "text-right font-semibold text-[#0F172A]",
                  cell: (record) =>
                    record.error ? (
                      <span className="text-sm font-medium text-red-600">Unavailable</span>
                    ) : (
                      record.balanceLabel
                    ),
                },
              ];

              return (
                <DataTable
                  data={filteredBalanceRecords}
                  columns={walletBalanceColumns}
                  loading={isLoadingUsers || isLoadingBalances}
                  searchValue={listSearchTerm}
                  onSearchChange={setListSearchTerm}
                  searchPlaceholder="Search by name, email, or role"
                  label="wallet"
                  emptyMessage="No wallet records match the current filters."
                />
              );
            })()}
          </div>
        </div>

        {/* Selected Wallet Panel */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-base font-bold text-[#0F172A]">Selected Wallet</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Pick a wallet to review its balance, open the full statement, or perform admin actions.
            </p>
            {/* Account Picker */}
            <div className="mt-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
                Landlord or utility user
              </label>
              <div className="relative">
                <button
                  type="button"
                  disabled={selectableUsers.length === 0}
                  onClick={() => setAccountPickerOpen((o) => !o)}
                  className="h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-sm text-[#0F172A] shadow-sm outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 flex items-center justify-between disabled:opacity-50 cursor-pointer"
                >
                  <span className="truncate text-left">
                    {selectedUser
                      ? `${selectedUser.fullName} (${getRoleLabel(selectedUser)})`
                      : selectableUsers.length > 0
                        ? "Search a landlord or utility wallet"
                        : "No wallets available"}
                  </span>
                  <Search className="h-4 w-4 shrink-0 text-slate-400 ml-2" />
                </button>
                <AnimatePresence>
                  {accountPickerOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg"
                    >
                      <div className="p-2">
                        <input
                          className={inputCls}
                          placeholder="Search by name, email, or role"
                          value={accountPickerSearch}
                          onChange={(e) => setAccountPickerSearch(e.target.value)}
                          autoFocus
                        />
                      </div>
                      <div className="max-h-56 overflow-y-auto px-2 pb-2">
                        {filteredAccountPickerUsers.length === 0 ? (
                          <p className="py-4 text-center text-sm text-slate-400">No wallet account found.</p>
                        ) : (
                          filteredAccountPickerUsers.map((user) => (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => {
                                setSelectedUserId(String(user.id));
                                setAccountPickerOpen(false);
                                setAccountPickerSearch("");
                              }}
                              className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
                            >
                              <Check
                                className={cn(
                                  "mt-0.5 h-4 w-4 shrink-0 text-[#1D4ED8]",
                                  selectedUserId === String(user.id) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-[#0F172A]">{user.fullName}</p>
                                <p className="truncate text-xs text-slate-500">{user.email}</p>
                                <p className="text-xs text-slate-400">{getRoleLabel(user)}</p>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
          <div className="p-6">
            {!selectedUser || !selectedBalanceRecord ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center text-sm text-slate-500">
                Select a wallet from the table or search control to inspect its statement.
              </div>
            ) : (
              <div className="space-y-5">
                {/* User Summary */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-0.5">
                      <p className="text-base font-bold text-[#0F172A]">{selectedUser.fullName}</p>
                      <p className="text-sm text-slate-500">{selectedUser.email}</p>
                    </div>
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                      {getRoleLabel(selectedUser)}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-white border border-slate-100 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Wallet Balance</p>
                      <p className="mt-1.5 text-xl font-bold text-[#0F172A]">{selectedBalanceRecord.balanceLabel}</p>
                    </div>
                    <div className="rounded-xl bg-white border border-slate-100 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Latest Statement Entry</p>
                      <p className="mt-1.5 text-sm font-semibold text-[#0F172A]">
                        {selectedBalanceRecord.lastStatementAt
                          ? new Date(selectedBalanceRecord.lastStatementAt).toLocaleString()
                          : "No statement activity yet"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    onClick={() => setDebitDialogOpen(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1D4ED8] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1e40af]"
                  >
                    <Wallet className="h-4 w-4" />
                    Debit Wallet
                  </button>
                  <button
                    onClick={() => setTransferDialogOpen(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                    Transfer to Another
                  </button>
                </div>

                <p className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                  Debits and transfers send the reason as both the reason and description fields so the backend can record them in the wallet statement alongside credits and withdrawals.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Wallet Statement */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">Wallet Statement</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {selectedUser
                  ? `Full statement for ${selectedUser.fullName}`
                  : "Select a wallet to inspect statement activity."}
              </p>
            </div>
            {/* Statement Stats */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Rows</p>
                <p className="mt-1.5 text-xl font-bold text-[#0F172A]">{filteredStatementEntries.length}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Credits</p>
                <p className="mt-1.5 text-xl font-bold text-emerald-600">{statementCredits.length}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Debits</p>
                <p className="mt-1.5 text-xl font-bold text-red-600">{statementDebits.length}</p>
              </div>
            </div>
          </div>
          {/* Export Buttons */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={exportStatement}
              disabled={!selectedUser || filteredStatementEntries.length === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            <button
              onClick={exportStatementPdf}
              disabled={!selectedUser || filteredStatementEntries.length === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              <FileText className="h-4 w-4" />
              Export PDF
            </button>
          </div>
        </div>
        <div className="p-4">
          {!selectedUser ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center text-sm text-slate-500">
              Choose a wallet first to load its statement.
            </div>
          ) : (
            (() => {
              const statementColumns: Column<typeof filteredStatementEntries[0]>[] = [
                {
                  key: "transactionDate",
                  header: "Date",
                  cell: (entry) => new Date(entry.transactionDate).toLocaleString(),
                },
                {
                  key: "description",
                  header: "Description",
                  className: "min-w-[280px]",
                  cell: (entry) => (
                    <div className="font-semibold text-[#0F172A]">
                      {entry.description || "Wallet transaction"}
                    </div>
                  ),
                },
                {
                  key: "flow",
                  header: "Flow",
                  cell: (entry) => {
                    const flow = getStatementSign(entry);
                    return (
                      <div className="flex items-center gap-2">
                        {flow === "credit" ? (
                          <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                        ) : flow === "debit" ? (
                          <ArrowUpRight className="h-4 w-4 text-red-600" />
                        ) : (
                          <SendHorizontal className="h-4 w-4 text-slate-500" />
                        )}
                        <span className="capitalize text-sm">{flow}</span>
                      </div>
                    );
                  },
                },
                {
                  key: "amount",
                  header: "Amount",
                  headerClassName: "text-right",
                  cell: (entry) => {
                    const flow = getStatementSign(entry);
                    return (
                      <span
                        className={cn(
                          "font-semibold",
                          flow === "credit" && "text-emerald-600",
                          flow === "debit" && "text-red-600"
                        )}
                      >
                        {entry.amount > 0 ? "+" : ""}
                        {formatCurrency(entry.amount)}
                      </span>
                    );
                  },
                },
                {
                  key: "runningBalance",
                  header: "Running balance",
                  headerClassName: "text-right",
                  className: "text-right font-semibold text-[#0F172A]",
                  cell: (entry) =>
                    (entry as any).runningBalance !== null && (entry as any).runningBalance !== undefined
                      ? formatCurrency((entry as any).runningBalance)
                      : "--",
                },
              ];

              return (
                <DataTable
                  data={filteredStatementEntries}
                  columns={statementColumns}
                  loading={isLoadingStatement}
                  searchValue={statementSearchTerm}
                  onSearchChange={setStatementSearchTerm}
                  searchPlaceholder="Search statement description, amount, or date"
                  label="entry"
                  emptyMessage="No statement entries match the current filters."
                />
              );
            })()
          )}
        </div>
      </div>

      {/* Debit Dialog */}
      <AnimatePresence>
        {debitDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[90vh]"
            >
              <div className="shrink-0 bg-gradient-to-r from-[#0F172A] to-[#1D4ED8] px-6 py-5 text-white flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">Debit Wallet</h2>
                  <p className="text-sm text-blue-200/80 mt-0.5">Remove funds from the selected wallet and record the reason.</p>
                </div>
                <button
                  onClick={() => setDebitDialogOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={inputCls}
                    value={debitAmount}
                    onChange={(e) => setDebitAmount(e.target.value)}
                    placeholder="Enter amount to debit"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Reason</label>
                  <textarea
                    className="h-24 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] shadow-sm outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 resize-none"
                    value={debitReason}
                    onChange={(e) => setDebitReason(e.target.value)}
                    placeholder="Explain why this wallet is being debited"
                  />
                </div>
              </div>
              <div className="shrink-0 border-t border-slate-100 px-6 py-4 flex items-center justify-end gap-2">
                <button
                  onClick={() => setDebitDialogOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitDebit}
                  disabled={isSubmittingDebit}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1D4ED8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e40af] transition-colors disabled:opacity-60"
                >
                  {isSubmittingDebit ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Debiting...
                    </>
                  ) : (
                    "Confirm Debit"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Transfer Dialog */}
      <AnimatePresence>
        {transferDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[90vh]"
            >
              <div className="shrink-0 bg-gradient-to-r from-[#0F172A] to-[#1D4ED8] px-6 py-5 text-white flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">Transfer Between Wallets</h2>
                  <p className="text-sm text-blue-200/80 mt-0.5">Move funds from the selected wallet to another account.</p>
                </div>
                <button
                  onClick={() => setTransferDialogOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                {/* Destination Picker */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Destination Wallet</label>
                  <div className="relative">
                    <button
                      type="button"
                      disabled={transferTargets.length === 0}
                      onClick={() => setTransferTargetOpen((o) => !o)}
                      className="h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-sm text-[#0F172A] shadow-sm outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 flex items-center justify-between disabled:opacity-50 cursor-pointer"
                    >
                      <span className="truncate text-left">
                        {transferTargetUserId
                          ? (() => {
                              const target = transferTargets.find(
                                (user) => String(user.id) === transferTargetUserId
                              );
                              return target
                                ? `${target.fullName} (${getRoleLabel(target)})`
                                : "Search destination wallet";
                            })()
                          : transferTargets.length > 0
                            ? "Search destination wallet"
                            : "No destination wallets available"}
                      </span>
                      <Search className="h-4 w-4 shrink-0 text-slate-400 ml-2" />
                    </button>
                    <AnimatePresence>
                      {transferTargetOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
                          className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg"
                        >
                          <div className="p-2">
                            <input
                              className={inputCls}
                              placeholder="Search by name, email, or role"
                              value={transferTargetSearchTerm}
                              onChange={(e) => setTransferTargetSearchTerm(e.target.value)}
                              autoFocus
                            />
                          </div>
                          <div className="max-h-56 overflow-y-auto px-2 pb-2">
                            {filteredTransferTargets.length === 0 ? (
                              <p className="py-4 text-center text-sm text-slate-400">No destination wallet found.</p>
                            ) : (
                              filteredTransferTargets.map((user) => (
                                <button
                                  key={user.id}
                                  type="button"
                                  onClick={() => {
                                    setTransferTargetUserId(String(user.id));
                                    setTransferTargetOpen(false);
                                    setTransferTargetSearchTerm("");
                                  }}
                                  className={cn(
                                    "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-slate-50",
                                    transferTargetUserId === String(user.id) && "bg-blue-50"
                                  )}
                                >
                                  <Check
                                    className={cn(
                                      "mt-0.5 h-4 w-4 shrink-0 text-[#1D4ED8]",
                                      transferTargetUserId === String(user.id) ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="min-w-0">
                                    <p className="truncate font-semibold text-[#0F172A]">{user.fullName}</p>
                                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                                    <p className="text-xs text-slate-400">{getRoleLabel(user)}</p>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Amount</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={inputCls}
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      placeholder="Enter amount to transfer"
                    />
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                    Transfers debit the source wallet and should credit the destination wallet when the backend endpoint supports paired statement entries.
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Reason</label>
                  <textarea
                    className="h-24 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] shadow-sm outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 resize-none"
                    value={transferReason}
                    onChange={(e) => setTransferReason(e.target.value)}
                    placeholder="Explain why the funds are moving between wallets"
                  />
                </div>
              </div>
              <div className="shrink-0 border-t border-slate-100 px-6 py-4 flex items-center justify-end gap-2">
                <button
                  onClick={() => setTransferDialogOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitTransfer}
                  disabled={isSubmittingTransfer}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1D4ED8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e40af] transition-colors disabled:opacity-60"
                >
                  {isSubmittingTransfer ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Transferring...
                    </>
                  ) : (
                    "Confirm Transfer"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminWalletManagement;
