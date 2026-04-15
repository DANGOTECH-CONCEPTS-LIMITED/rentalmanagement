import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
  Download,
  FileText,
} from "lucide-react";
import { useCurrencyFormatter } from "@/hooks/use-currency-formatter";
import DashboardExportToolbar from "@/components/common/DashboardExportToolbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  exportWalletStatementCsv,
  exportWalletStatementPdf,
} from "@/lib/wallet-statement-export";
import {
  exportDashboardPdf,
  exportDashboardWorkbook,
} from "@/lib/dashboard-export";
import { buildRunningBalanceStatement } from "@/lib/wallet-statement";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import axios from "axios";

interface Transaction {
  amount: number;
  description: string;
  transactionDate: string;
  type?: "deposit" | "withdrawal";
}

interface UtilityMeter {
  id: number;
  meterType: string;
  meterNumber: string;
  nwscAccount: string;
  locationOfNwscMeter: string;
  landLordId: number;
}

const UtilityDashboard = () => {
  const formatCurrency = useCurrencyFormatter();
  const { toast } = useToast();
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [utilityMeters, setUtilityMeters] = useState<UtilityMeter[]>([]);
  const [isLoadingMeters, setIsLoadingMeters] = useState(false);

  const user = localStorage.getItem("user");

  if (!user) throw new Error("No user found in localStorage");
  const userData = JSON.parse(user);
  const getUserToken = () => {
    try {
      // setUserInfo(userData);
      return userData.token;
    } catch (error) {
      console.error("Error getting user token:", error);
      return null;
    }
  };

  const token = getUserToken();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    fetchWalletData();
    fetchProperties();
    fetchTenants();
    fetchUtilityMeters();
  }, [token, apiUrl, toast]);

  const fetchWalletData = async () => {
    setIsLoading(true);
    try {
      if (!token) throw new Error("No authentication token found");

      const user = localStorage.getItem("user");
      if (!user) throw new Error("No user found in localStorage");
      const userData = JSON.parse(user);

      const balanceRes = await fetch(`${apiUrl}/GetBalance/${userData.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          accept: "*/*",
        },
      });

      if (!balanceRes.ok)
        throw new Error(`Failed to fetch balance: ${balanceRes.status}`);
      const balanceData = await balanceRes.json();
      setBalance(balanceData.balance);

      const statementRes = await fetch(
        `${apiUrl}/GetStatement/${userData.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            accept: "*/*",
          },
        }
      );

      if (!statementRes.ok)
        throw new Error(`Failed to fetch statement: ${statementRes.status}`);
      const statementData = await statementRes.json();
      setTransactions(statementData);
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to load wallet data",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTenants = async () => {
    const apiUrl = import.meta.env.VITE_API_BASE_URL;
    if (!apiUrl) {
      throw new Error("API base URL is not configured");
    }

    try {
      const { data } = await axios.get(`${apiUrl}/GetAllTenants`);
      const filteredData = data.filter(
        (tenant: any) => tenant?.property?.ownerId === userData.id
      );
      setTenants(filteredData);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error.response.status === 404
            ? `Tenants ${error.response.statusText}`
            : error.response.data,
        variant: "destructive",
      });
    }
  };
  const fetchProperties = async () => {
    const apiUrl = import.meta.env.VITE_API_BASE_URL;
    if (!apiUrl) {
      throw new Error("API base URL is not configured");
    }

    try {
      const { data } = await axios.get(
        `${apiUrl}/GetPropertiesByLandLordId/${userData.id}`
      );

      setProperties(data);
    } catch (error) {
      console.error("Error fetching landlords:", error);
    }
  };

  const fetchUtilityMeters = async () => {
    setIsLoadingMeters(true);
    try {
      if (!token) throw new Error("No authentication token found");

      const user = localStorage.getItem("user");
      if (!user) throw new Error("No user found in localStorage");
      const userData = JSON.parse(user);

      const response = await fetch(`${apiUrl}/GetUtilityMetersByLandLordId/${userData.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          accept: "*/*",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch utility meters: ${response.status}`);
      }

      const metersData = await response.json();
      setUtilityMeters(metersData);
    } catch (err: any) {
      console.error("Error fetching utility meters:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to load utility meters",
      });
    } finally {
      setIsLoadingMeters(false);
    }
  };

  const validateWithdrawal = () => {
    if (!withdrawAmount || isNaN(Number(withdrawAmount))) {
      toast({
        variant: "destructive",
        title: "Invalid Amount",
        description: "Please enter a valid withdrawal amount",
      });
      return false;
    }

    const amount = Number(withdrawAmount);
    if (amount <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Amount",
        description: "Withdrawal amount must be greater than 0",
      });
      return false;
    }

    if (balance !== null && amount > balance) {
      toast({
        variant: "destructive",
        title: "Insufficient Funds",
        description: "You don't have enough balance for this withdrawal",
      });
      return false;
    }

    return true;
  };

  const handleWithdraw = async () => {
    if (!validateWithdrawal()) return;

    const amount = Number(withdrawAmount);
    setIsWithdrawing(true);

    try {
      const user = localStorage.getItem("user");
      if (!user) throw new Error("No user found in localStorage");
      const userData = JSON.parse(user);

      const formData = new FormData();
      formData.append("amount", amount.toString());
      formData.append("landlordid", userData.id.toString());
      formData.append("description", "Withdrawal from wallet");

      const response = await fetch(`${apiUrl}/Withdraw`, {
        method: "POST",
        headers: {
          accept: "*/*",
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error("Withdrawal failed");

      toast({
        title: "Withdrawal Successful",
        description: `You have withdrawn ${formatCurrency(amount)}`,
      });

      // Refresh balance & transactions
      const updatedBalance = await (
        await fetch(`${apiUrl}/GetBalance/${userData.id}`, {
          headers: { Authorization: `Bearer ${token}`, accept: "*/*" },
        })
      ).json();
      setBalance(updatedBalance.balance);

      const updatedStatement = await (
        await fetch(`${apiUrl}/GetStatement/${userData.id}`, {
          headers: { Authorization: `Bearer ${token}`, accept: "*/*" },
        })
      ).json();
      setTransactions(updatedStatement);

      setWithdrawAmount("");
      setShowConfirmation(false);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Withdrawal Failed",
        description:
          err.message || "There was an error processing your withdrawal",
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  const statementRows = useMemo(
    () => buildRunningBalanceStatement(transactions, balance),
    [transactions, balance]
  );

  const recentTransactions = statementRows.slice(0, 6);

  const exportStatement = () => {
    exportWalletStatementCsv(statementRows, {
      fileNamePrefix: "utility-wallet-statement",
      accountName: userData?.fullName,
    });

    toast({
      title: "Export Successful",
      description: "Wallet statement exported to CSV.",
    });
  };

  const exportStatementPdf = () => {
    exportWalletStatementPdf(statementRows, {
      title: "Utility Wallet Statement",
      fileNamePrefix: "utility-wallet-statement",
      accountName: userData?.fullName,
      formatAmount: formatCurrency,
    });

    toast({
      title: "Export Successful",
      description: "Wallet statement exported to PDF.",
    });
  };

  const handleExportPdf = async () => {
    if (!dashboardRef.current) {
      return;
    }

    try {
      await exportDashboardPdf(dashboardRef.current, {
        fileNamePrefix: "utility-dashboard-overview",
      });

      toast({
        title: "Export Successful",
        description: "Dashboard exported to PDF.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export dashboard to PDF.",
        variant: "destructive",
      });
    }
  };

  const handleExportExcel = async () => {
    try {
      await exportDashboardWorkbook({
        title: "Utility Dashboard",
        fileNamePrefix: "utility-dashboard-overview",
        metadata: [
          { label: "Account", value: userData?.fullName || "N/A" },
          { label: "Available Balance", value: balance !== null ? formatCurrency(balance) : "--" },
        ],
        summary: [
          { label: "Properties", value: properties.length },
          { label: "Tenants", value: tenants.length },
          { label: "Utility Meters", value: utilityMeters.length },
          { label: "Wallet Transactions", value: statementRows.length },
        ],
        sections: [
          {
            sheetName: "Wallet Statement",
            columns: ["Date", "Description", "Amount", "Running Balance"],
            rows: statementRows.map((row) => [
              new Date(row.transactionDate).toLocaleString(),
              row.description || "Wallet transaction",
              row.amount,
              row.runningBalance ?? "",
            ]),
          },
          {
            sheetName: "Utility Meters",
            columns: ["Meter Number", "Type", "NWSC Account", "Location"],
            rows: utilityMeters.map((meter) => [
              meter.meterNumber,
              meter.meterType,
              meter.nwscAccount,
              meter.locationOfNwscMeter,
            ]),
          },
          {
            sheetName: "Recent Wallet Activity",
            columns: ["Date", "Description", "Amount", "Running Balance"],
            rows: recentTransactions.map((row) => [
              new Date(row.transactionDate).toLocaleString(),
              row.description || "Wallet transaction",
              row.amount,
              row.runningBalance ?? "",
            ]),
          },
        ],
      });

      toast({
        title: "Export Successful",
        description: "Dashboard exported to Excel.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export dashboard to Excel.",
        variant: "destructive",
      });
    }
  };

  return (
    <div ref={dashboardRef} className="space-y-8">
      <section className="page-hero">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Utility Overview
            </span>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Utility Dashboard</h1>
              <p className="mt-2 text-sm text-muted-foreground md:text-base">
                Track wallet balance, linked meters, and recent wallet activity from one place.
              </p>
            </div>
          </div>
          <DashboardExportToolbar
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="data-surface border-none shadow-none lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Wallet Balance</CardTitle>
                <CardDescription>Available funds and quick wallet actions.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Wallet className="h-6 w-6 text-primary" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[300px] p-0">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" className="w-full justify-start">
                          View Transaction History
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl rounded-[28px]">
                        <DialogHeader>
                          <DialogTitle>Transaction History</DialogTitle>
                        </DialogHeader>
                        {isLoading ? (
                          <div className="space-y-4">
                            {[...Array(3)].map((_, i) => (
                              <Skeleton key={i} className="h-12 w-full" />
                            ))}
                          </div>
                        ) : transactions.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            No transactions found
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={exportStatement}>
                                <Download className="mr-2 h-4 w-4" />
                                Export CSV
                              </Button>
                              <Button variant="outline" size="sm" onClick={exportStatementPdf}>
                                <FileText className="mr-2 h-4 w-4" />
                                Export PDF
                              </Button>
                            </div>
                            <div className="overflow-x-auto max-h-[60vh]">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Date</TableHead>
                                  <TableHead>Description</TableHead>
                                  <TableHead className="text-right">Amount</TableHead>
                                  <TableHead className="text-right">Running balance</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {statementRows.map((tx, i) => (
                                  <TableRow key={i}>
                                    <TableCell>{new Date(tx.transactionDate).toLocaleDateString()}</TableCell>
                                    <TableCell className="flex items-center gap-2">
                                      {tx.amount > 0 ? (
                                        <ArrowDownLeft className="h-4 w-4 text-green-500" />
                                      ) : (
                                        <ArrowUpRight className="h-4 w-4 text-red-500" />
                                      )}
                                      {tx.description || "Transaction"}
                                    </TableCell>
                                    <TableCell className={`text-right font-medium ${tx.amount > 0 ? "text-green-500" : "text-red-500"}`}>
                                      {tx.amount > 0 ? "+" : ""}
                                      {formatCurrency(tx.amount)}
                                    </TableCell>
                                    <TableCell className="text-right font-medium text-slate-950">
                                      {tx.runningBalance !== null
                                        ? formatCurrency(tx.runningBalance)
                                        : "--"}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-8 w-24" />
              </div>
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-3xl font-semibold text-slate-950">
                    {balance !== null ? formatCurrency(balance) : "--"}
                  </p>
                  <p className="text-sm text-muted-foreground">Available balance</p>
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm">Withdraw</Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-[28px]">
                    <DialogHeader>
                      <DialogTitle>Withdraw Funds</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground mb-2">
                        Available: {formatCurrency(balance || 0)}
                      </p>
                      <Input
                        type="number"
                        placeholder="Enter amount to withdraw"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setWithdrawAmount("");
                            const dialogTrigger = document.querySelector('[data-state="open"]') as HTMLButtonElement;
                            if (dialogTrigger) {
                              dialogTrigger.click();
                            }
                          }}
                          className="w-full"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => {
                            if (validateWithdrawal()) {
                              setShowConfirmation(true);
                            }
                          }}
                          className="w-full"
                        >
                          Continue
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="data-surface border-none shadow-none">
          <CardHeader className="pb-3">
            <CardTitle>Properties</CardTitle>
            <CardDescription>Properties linked to your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-slate-950">{properties.length}</p>
          </CardContent>
        </Card>

        <Card className="data-surface border-none shadow-none">
          <CardHeader className="pb-3">
            <CardTitle>Tenants</CardTitle>
            <CardDescription>Current tenant records under your properties.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-slate-950">{tenants.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="data-surface border-none shadow-none">
        <CardHeader>
          <CardTitle>My Utility Meters</CardTitle>
          <CardDescription>View all utility meters associated with your account.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingMeters ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : utilityMeters.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Meter Type</TableHead>
                    <TableHead>Meter Number</TableHead>
                    <TableHead>NWSC Account</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {utilityMeters.map((meter) => (
                    <TableRow key={meter.id}>
                      <TableCell>{meter.id}</TableCell>
                      <TableCell>{meter.meterType}</TableCell>
                      <TableCell>{meter.meterNumber}</TableCell>
                      <TableCell>{meter.nwscAccount}</TableCell>
                      <TableCell>{meter.locationOfNwscMeter}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No utility meters found</p>
              <p className="text-sm text-gray-400 mt-1">
                Contact your administrator to add utility meters
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="data-surface border-none shadow-none">
        <CardHeader>
          <CardTitle>Recent Wallet Activity</CardTitle>
          <CardDescription>The latest deposits and withdrawals on your wallet.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-10 text-center text-sm text-muted-foreground">
              No transactions found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Running balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.map((tx, i) => (
                  <TableRow key={i}>
                    <TableCell>{new Date(tx.transactionDate).toLocaleDateString()}</TableCell>
                    <TableCell className="flex items-center gap-2">
                      {tx.amount > 0 ? (
                        <ArrowDownLeft className="h-4 w-4 text-green-500" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-red-500" />
                      )}
                      {tx.description || "Transaction"}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${tx.amount > 0 ? "text-green-500" : "text-red-500"}`}>
                      {tx.amount > 0 ? "+" : ""}
                      {formatCurrency(tx.amount)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-slate-950">
                      {tx.runningBalance !== null
                        ? formatCurrency(tx.runningBalance)
                        : "--"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Withdrawal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm">
              Are you sure you want to withdraw{" "}
              {formatCurrency(Number(withdrawAmount))}?
            </p>
            <p className="text-xs text-muted-foreground">
              This action cannot be undone. The funds will be transferred to
              your registered bank account or mobile money number.
            </p>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowConfirmation(false)}
                className="w-full"
              >
                Cancel
              </Button>
              <Button
                onClick={handleWithdraw}
                disabled={isWithdrawing}
                className="w-full"
              >
                {isWithdrawing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Confirm Withdrawal"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UtilityDashboard;
