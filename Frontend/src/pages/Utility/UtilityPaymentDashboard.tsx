import { useEffect, useState } from "react";
import axios from "axios";
import StatCard from "../../components/common/StatCard";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrencyFormatter } from "@/hooks/use-currency-formatter";
import { useToast } from "@/hooks/use-toast";
import {
  Zap,
  CheckCircle,
  Clock,
  XCircle,
  CircleDollarSign,
  TrendingUp,
} from "lucide-react";

interface UtilityStats {
  landlordId: number;
  totalMeters: number;
  activeMeters: number;
  inactiveMeters: number;
  totalUtilityPayments: number;
  totalUtilityAmount: number;
  totalUtilityCharges: number;
  successfulPayments: number;
  pendingPayments: number;
  failedPayments: number;
  firstPaymentAt: string;
  lastPaymentAt: string;
  meters: {
    meterNumber: string;
    payments: number;
    amount: number;
    charges: number;
    lastPaymentAt: string;
  }[];
}

interface SystemRole {
  id: number;
  name: string;
}

interface ApiUser {
  id: string;
  fullName: string;
  email: string;
  systemRoleId: number;
  systemRole?: SystemRole;
}

interface StoredUser {
  id: string | number;
  token?: string;
  systemRoleId?: number;
}

const UtilityPaymentDashboard = () => {
  const [utilityStats, setUtilityStats] = useState<UtilityStats | null>(null);
  const [utilityUsers, setUtilityUsers] = useState<ApiUser[]>([]);
  const [selectedUtilityUserId, setSelectedUtilityUserId] = useState("");
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const { toast } = useToast();
  const formatCurrency = useCurrencyFormatter();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const getStoredUser = (): StoredUser | null => {
    const user = localStorage.getItem("user");
    if (!user) {
      return null;
    }

    try {
      return JSON.parse(user);
    } catch {
      return null;
    }
  };

  const currentUser = getStoredUser();
  const isAdmin = currentUser?.systemRoleId === 1;

  const fetchUtilityStats = async (targetUserId: string, token: string) => {
    setIsLoadingStats(true);

    try {
      const response = await axios.get(
        `${apiUrl}/GetLandlordUtilityStats/${targetUserId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            accept: "*/*",
          },
        }
      );
      setUtilityStats(response.data);
    } catch (error) {
      console.error("Error fetching utility stats:", error);
      toast({
        title: "Error",
        description: "Failed to load utility statistics",
        variant: "destructive",
      });
    } finally {
      setIsLoadingStats(false);
    }
  };

  const fetchUtilityUsers = async (token: string) => {
    setIsLoadingUsers(true);

    try {
      const response = await axios.get<ApiUser[]>(`${apiUrl}/GetAllUsers`, {
        headers: {
          Authorization: `Bearer ${token}`,
          accept: "*/*",
        },
      });

      const utilityUsersOnly = response.data.filter(
        (user) =>
          user.systemRoleId === 4 ||
          user.systemRole?.name?.toLowerCase().includes("utility")
      );

      setUtilityUsers(utilityUsersOnly);
      setSelectedUtilityUserId((currentSelection) => {
        const matchingSelection = utilityUsersOnly.find(
          (user) => user.id === currentSelection
        );

        if (matchingSelection) {
          return matchingSelection.id;
        }

        return utilityUsersOnly[0]?.id ?? "";
      });
    } catch (error) {
      console.error("Error fetching utility users:", error);
      toast({
        title: "Error",
        description: "Failed to load utility users",
        variant: "destructive",
      });
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (!currentUser?.token) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No user found in localStorage",
      });
      return;
    }

    if (isAdmin) {
      fetchUtilityUsers(currentUser.token);
      return;
    }

    if (currentUser.id) {
      fetchUtilityStats(String(currentUser.id), currentUser.token);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || !currentUser?.token || !selectedUtilityUserId) {
      return;
    }

    fetchUtilityStats(selectedUtilityUserId, currentUser.token);
  }, [currentUser?.token, isAdmin, selectedUtilityUserId]);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Statistics Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {isAdmin
            ? "Select a utility user to view their payment statistics."
            : "Overview of utility payments and meter activity."}
        </p>
      </div>

      {isAdmin && (
        <Card className="p-4">
          <div className="flex flex-col gap-3 sm:max-w-md">
            <Label htmlFor="utility-user-select">Utility user</Label>
            <Select
              value={selectedUtilityUserId}
              onValueChange={setSelectedUtilityUserId}
              disabled={isLoadingUsers || utilityUsers.length === 0}
            >
              <SelectTrigger id="utility-user-select">
                <SelectValue placeholder="Select a utility user" />
              </SelectTrigger>
              <SelectContent>
                {utilityUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.fullName} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isLoadingUsers && utilityUsers.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No utility users were found.
              </p>
            )}
          </div>
        </Card>
      )}

      {isLoadingStats && (
        <p className="text-sm text-muted-foreground">Loading statistics...</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Meters"
          value={utilityStats?.totalMeters || 0}
          icon={<Zap className="h-6 w-6" />}
        />
        <StatCard
          title="Active Meters"
          value={utilityStats?.activeMeters || 0}
          icon={<CheckCircle className="h-6 w-6" />}
        />
        <StatCard
          title="Total Payments"
          value={utilityStats?.totalUtilityPayments || 0}
          icon={<CircleDollarSign className="h-6 w-6" />}
        />
        <StatCard
          title="Successful Payments"
          value={utilityStats?.successfulPayments || 0}
          icon={<CheckCircle className="h-6 w-6" />}
        />
        <StatCard
          title="Pending Payments"
          value={utilityStats?.pendingPayments || 0}
          icon={<Clock className="h-6 w-6" />}
        />
        <StatCard
          title="Failed Payments"
          value={utilityStats?.failedPayments || 0}
          icon={<XCircle className="h-6 w-6" />}
        />
        <StatCard
          title="Total Amount"
          value={formatCurrency(utilityStats?.totalUtilityAmount || 0)}
          icon={<TrendingUp className="h-6 w-6" />}
        />
        <StatCard
          title="Total Charges"
          value={formatCurrency(utilityStats?.totalUtilityCharges || 0)}
          icon={<CircleDollarSign className="h-6 w-6" />}
        />
      </div>
    </div>
  );
};

export default UtilityPaymentDashboard;