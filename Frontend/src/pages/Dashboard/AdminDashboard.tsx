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

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalProperties: 0,
    totalLandlords: 0,
    totalRevenue: 0,
    occupancyRate: 0,
  });
  const [properties, setProperties] = useState([]);
  const [landlords, setLandlords] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    // Simulated API call
    const fetchStats = async () => {
      // In a real app, this would be an API call
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
      console.error("Error fetching landlords:", error);
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

  const quickActions = [
    {
      title: "Register Landlord",
      description: "Add a new landlord to the system",
      path: "/admin-dashboard/register-landlord",
    },
    {
      title: "Register Property",
      description: "Add a new property listing",
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Properties"
          value={properties.length}
          icon={<Home />}
          change={{ value: 12, type: "increase" }}
        />
        <StatCard
          title="Total Landlords"
          value={landlords.length}
          icon={<Users />}
          change={{ value: 8, type: "increase" }}
        />
        <StatCard
          title="Total Revenue"
          value={`$${stats.totalRevenue.toLocaleString()}`}
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
