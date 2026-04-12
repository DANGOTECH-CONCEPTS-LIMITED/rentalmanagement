import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Home, Wallet, TrendingUp } from "lucide-react";
import StatCard from "../../components/common/StatCard";
import Button from "../../components/ui/button/Button";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Stats {
  totalProperties: number;
  totalLandlords: number;
  totalRevenue: number;
  occupancyRate: number;
}

type BalanceType = "SMS" | "BULK" | "WALLET";
type WithdrawDestination = "BULK" | "flexipay";

interface BalanceApiResponse {
  status: number;
  status_message: string;
  data: {
    currentBalance: boolean;
    message: string;
    balance?: {
      type: BalanceType;
      amount: string; // sample shows amount as string
    };
  };
}

interface SimpleBalance {
  type: BalanceType;
  amount: string;
  message: string;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalProperties: 0,
    totalLandlords: 0,
    totalRevenue: 0,
    occupancyRate: 0,
  });

  const [properties, setProperties] = useState([]);
  const [landlords, setLandlords] = useState([]);

  const [balance, setBalance] = useState<SimpleBalance | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [balanceType, setBalanceType] = useState<BalanceType | "">("");
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [withdrawDestination, setWithdrawDestination] = useState<WithdrawDestination | null>(null);
  const [withdrawReference, setWithdrawReference] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);

  const navigate = useNavigate();

  const user = localStorage.getItem("user");
  let token = "";

  try {
    if (user) {
      const userData = JSON.parse(user);
      token = userData.token;
    } else {
      
    }
  } catch (error) {
  }

  const fetchBalance = async (type: BalanceType) => {
    const apiUrl = import.meta.env.VITE_API_BASE_URL;
    try {
      setBalanceLoading(true);
      setBalanceError(null);
      // normalize and track the active type
      const normalizedType = (type || "") as BalanceType;
      setBalanceType(normalizedType);

      const response = await fetch(`${apiUrl}/currentBalance`, {
        method: "POST",
        headers: {
          accept: "*/*",
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type: normalizedType }),
      });

      const data: BalanceApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.status_message || `HTTP error! status: ${response.status}`
        );
      }

      if (!data?.data?.currentBalance) {
        throw new Error(data?.data?.message || "Unknown balance type");
      }

      const apiBalance = data.data.balance;
      const message = data.data.message;
      const simple: SimpleBalance = {
        type: (apiBalance?.type || normalizedType) as BalanceType,
        amount: apiBalance?.amount || "0",
        message: message || "",
      };
      setBalance(simple);
    } catch (err) {
      setBalanceError(
        err instanceof Error ? err.message : "Unknown error occurred"
      );
      setBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  };

  const openWithdrawDialog = (destination: WithdrawDestination) => {
    setWithdrawDestination(destination);
    setWithdrawDialogOpen(true);
  };

  const handleCollectoWithdraw = async () => {
    const apiUrl = import.meta.env.VITE_API_BASE_URL;

    if (!withdrawDestination) {
      toast({
        title: "Destination required",
        description: "Choose a valid withdraw destination.",
        variant: "destructive",
      });
      return;
    }

    if (!withdrawReference.trim()) {
      toast({
        title: "Reference required",
        description: "Enter a reference for this Collecto withdrawal.",
        variant: "destructive",
      });
      return;
    }

    if (!withdrawAmount || Number.isNaN(Number(withdrawAmount)) || Number(withdrawAmount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Enter a valid withdraw amount greater than zero.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingWithdraw(true);

    try {
      const response = await fetch(`${apiUrl}/withdrawFromCollectoWallet`, {
        method: "POST",
        headers: {
          accept: "*/*",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reference: withdrawReference.trim(),
          amount: withdrawAmount,
          withdrawTo: withdrawDestination,
        }),
      });

      const rawText = await response.text();
      let parsedResponse: { message?: string; response?: string; status?: string } | null = null;

      try {
        parsedResponse = rawText ? JSON.parse(rawText) : null;
      } catch {
        parsedResponse = null;
      }

      if (!response.ok) {
        throw new Error(parsedResponse?.message || rawText || "Collecto withdrawal failed.");
      }

      toast({
        title: "Withdrawal submitted",
        description:
          parsedResponse?.message ||
          `Withdrawal to ${withdrawDestination.toUpperCase()} was submitted successfully.`,
      });

      setWithdrawDialogOpen(false);
      setWithdrawReference("");
      setWithdrawAmount("");
    } catch (error) {
      toast({
        title: "Withdrawal failed",
        description: error instanceof Error ? error.message : "Failed to submit Collecto withdrawal.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  const fetchLandlords = async () => {
    const apiUrl = import.meta.env.VITE_API_BASE_URL;
    if (!apiUrl) {
      throw new Error("API base URL is not configured");
    }

    try {
      const { data } = await axios.get(`${apiUrl}/GetLandlords`);
      setLandlords(data);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error.response.status === 404
            ? `Landlords ${error.response.statusText}`
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
      const { data } = await axios.get(`${apiUrl}/GetAllProperties`);
      setProperties(data);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error.response.status === 404
            ? `Properties ${error.response.statusText}`
            : error.response.data,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      const mockStats: Stats = {
        totalProperties: 150,
        totalLandlords: 45,
        totalRevenue: 125000,
        occupancyRate: 92,
      };
      setStats(mockStats);
    };

    fetchStats();
    fetchProperties();
    fetchLandlords();
  }, []);

  const quickActions = [
    {
      title: "Register Dealer",
      description: "Add a new dealer to the system",
      path: "/admin-dashboard/register-landlord",
    },
    {
      title: "Register Car",
      description: "Add a new car to listing",
      path: "/admin-dashboard/register-property",
    },
    {
      title: "View Reports",
      description: "Access detailed analytics",
      path: "/admin-dashboard/reports",
    },
    {
      title: "System Settings",
      description: "Configure system preferences",
      path: "/admin-dashboard/system-settings",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Dashboard Overview
        </h1>
      </div>

      <div className="flex gap-4 mb-6">
        <Button
          onClick={(e) => {
            e.preventDefault();
            fetchBalance("SMS");
          }}
          disabled={balanceLoading}
          variant={balanceType === "SMS" ? "primary" : "outline"}
          className="min-w-32"
        >
          {balanceLoading && balanceType === "SMS" ? (
            <div className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Loading...
            </div>
          ) : (
            "SMS Balance"
          )}
        </Button>

        <Button
          onClick={(e) => {
            e.preventDefault();
            fetchBalance("BULK");
          }}
          disabled={balanceLoading}
          variant={balanceType === "BULK" ? "primary" : "outline"}
          className="min-w-32"
        >
          {balanceLoading && balanceType === "BULK" ? (
            <div className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Loading...
            </div>
          ) : (
            "Bulk Balance"
          )}
        </Button>

        <Button
          onClick={(e) => {
            e.preventDefault();
            fetchBalance("Wallet");
          }}
          disabled={balanceLoading}
          variant={balanceType === "WALLET" ? "primary" : "outline"}
          className="min-w-32"
        >
          {balanceLoading && balanceType === "WALLET" ? (
            <div className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Loading...
            </div>
          ) : (
            "Wallet Balance"
          )}
        </Button>
      </div>

      <div className="glass-card p-4 rounded-lg space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-medium">Collecto Wallet Withdrawals</h3>
            <p className="text-sm text-gray-500">
              Submit and track admin withdrawals from the Collecto wallet to BULK and FLEXIPAY.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/admin-dashboard/collecto-withdraw-logs")}
          >
            View Withdraw Logs
          </Button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={() => openWithdrawDialog("BULK")}>Withdraw to BULK</Button>
          <Button variant="secondary" onClick={() => openWithdrawDialog("flexipay")}>
            Withdraw to FLEXIPAY
          </Button>
        </div>
      </div>

      {/* Balance Display */}
      {balance && !balanceError ? (
        <div className="glass-card p-4 rounded-lg">
          <h3 className="font-medium">{balance.type} Balance</h3>
          <p className="text-2xl font-bold">
            {balance.message || `UGX ${Number(balance.amount).toLocaleString()}`}
          </p>
        </div>
      ) : balanceError ? (
        <div className="text-red-500 p-4 bg-red-50 rounded-lg">Error: {balanceError}</div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Cars"
          value={properties.length}
          icon={<Home />}
          change={{ value: 12, type: "increase" }}
        />

        <StatCard
          title="Total Dealers"
          value={landlords.length}
          icon={<Users />}
          change={{ value: 8, type: "increase" }}
        />
        <StatCard
          title="Total Revenue"
          value={`UGX${stats.totalRevenue.toLocaleString()}`}
          icon={<Wallet />}
          change={{ value: 15, type: "increase" }}
        />
        <StatCard
          title="Occupancy Rate"
          value={`${stats.occupancyRate}%`}
          icon={<TrendingUp />}
          change={{ value: 5, type: "increase" }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickActions.map((action, index) => (
          <motion.div
            key={action.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="glass-card p-6 rounded-xl space-y-4"
          >
            <h3 className="font-medium">{action.title}</h3>
            <p className="text-sm text-gray-500">{action.description}</p>
            <Button
              onClick={() => navigate(action.path)}
              variant="secondary"
              className="w-full"
            >
              Get Started
            </Button>
          </motion.div>
        ))}
      </div>

      <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <DialogContent className="rounded-[28px] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {withdrawDestination === "BULK" ? "Withdraw to BULK" : "Withdraw to FLEXIPAY"}
            </DialogTitle>
            <DialogDescription>
              This submits a request to the `withdrawFromCollectoWallet` endpoint and stores the local plus downstream Collecto logs in the database.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="collecto-withdraw-reference">Reference</Label>
              <Input
                id="collecto-withdraw-reference"
                value={withdrawReference}
                onChange={(event) => setWithdrawReference(event.target.value)}
                placeholder="Enter a unique withdrawal reference"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="collecto-withdraw-amount">Amount</Label>
              <Input
                id="collecto-withdraw-amount"
                type="number"
                min="0"
                step="0.01"
                value={withdrawAmount}
                onChange={(event) => setWithdrawAmount(event.target.value)}
                placeholder="Enter amount to withdraw"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setWithdrawDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCollectoWithdraw} isLoading={isSubmittingWithdraw}>
                Submit Withdrawal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
