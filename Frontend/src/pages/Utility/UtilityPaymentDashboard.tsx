import { useState, useEffect } from 'react';
import axios from 'axios';
import StatCard from '../../components/common/StatCard';
import { useCurrencyFormatter } from '@/hooks/use-currency-formatter';
import { useToast } from '@/hooks/use-toast';
import {
  Zap,
  CheckCircle,
  Clock,
  XCircle,
  CircleDollarSign,
  TrendingUp,
} from 'lucide-react';

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

const UtilityPaymentDashboard = () => {
  const [utilityStats, setUtilityStats] = useState<UtilityStats | null>(null);
  const { toast } = useToast();
  const formatCurrency = useCurrencyFormatter();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const fetchUtilityStats = async () => {
    const user = localStorage.getItem("user");
    if (!user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No user found in localStorage",
      });
      return;
    }
    const userData = JSON.parse(user);
    const token = userData.token;

    try {
      const response = await axios.get(
        `${apiUrl}/GetLandlordUtilityStats/${userData.id}`,
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
    }
  };

  useEffect(() => {
    fetchUtilityStats();
  }, []);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Statistics Dashboard</h1>
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