import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Home, Wallet, TrendingUp } from "lucide-react";
import StatCard from "../../components/common/StatCard";
import Button from "../../components/ui/button/Button";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "@/hooks/use-toast";

interface Stats {
  totalProperties: number;
  totalLandlords: number;
  totalRevenue: number;
  occupancyRate: number;
}

type BalanceType = "SMS" | "BULK" | "WALLET";

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
    </div>
  );
};

export default AdminDashboard;
