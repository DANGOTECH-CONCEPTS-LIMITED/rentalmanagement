
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Home, Wallet, TrendingUp } from "lucide-react";
import StatCard from "../../components/common/StatCard";
import Button from "../../components/ui/button/Button";
import { useNavigate } from "react-router-dom";

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
  }, []);

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
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard Overview</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Properties"
          value={stats.totalProperties}
          icon={<Home />}
          change={{ value: 12, type: "increase" }}
        />
        <StatCard
          title="Total Landlords"
          value={stats.totalLandlords}
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
