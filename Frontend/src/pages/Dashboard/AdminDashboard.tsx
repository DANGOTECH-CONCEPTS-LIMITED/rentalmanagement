import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, 
  Home, 
  Wallet, 
  TrendingUp, 
  Building2, 
  CreditCard, 
  Settings, 
  BarChart3,
  Plus,
  ArrowRight,
  DollarSign,
  Percent,
  Activity
} from "lucide-react";
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

interface BalanceResponse {
  status: string;
  status_message: string;
  data: {
    currentBalance: number | boolean;
    message: string;
  };
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

  const [balance, setBalance] = useState<BalanceResponse | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [balanceType, setBalanceType] = useState<string>("");

  const navigate = useNavigate();

  const user = localStorage.getItem("user");
  let token = "";

  try {
    if (user) {
      const userData = JSON.parse(user);
      token = userData.token;
    } else {
      console.error("No user found in localStorage");
    }
  } catch (error) {
    console.error("Error parsing user data:", error);
  }

  const fetchBalance = async (type: string) => {
    const apiUrl = import.meta.env.VITE_API_BASE_URL;
    try {
      setBalanceLoading(true);
      setBalanceError(null);
      setBalanceType(type);

      const response = await fetch(`${apiUrl}/currentBalance`, {
        method: "POST",
        headers: {
          accept: "*/*",
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type }),
      });

      const data: BalanceResponse = await response.json();

      console.log("Balance data", data);

      if (!response.ok) {
        throw new Error(
          data.status_message || `HTTP error! status: ${response.status}`
        );
      }

      if (data.data.currentBalance === false) {
        throw new Error(data.data.message || "Unknown balance type");
      }

      setBalance(data);
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
      console.log("GetLandlords data", data);
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
      console.error("Error fetching properties:", error);
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
      title: "Register Landlord",
      description: "Add a new landlord to the system",
      path: "/admin-dashboard/register-landlord",
      icon: <Users className="w-6 h-6" />,
      color: "bg-blue-500",
      gradient: "from-blue-500 to-blue-600"
    },
    {
      title: "Register Property",
      description: "Add a new property to listing",
      path: "/admin-dashboard/register-property",
      icon: <Building2 className="w-6 h-6" />,
      color: "bg-green-500",
      gradient: "from-green-500 to-green-600"
    },
    {
      title: "View Reports",
      description: "Access detailed analytics",
      path: "/admin-dashboard/reports",
      icon: <BarChart3 className="w-6 h-6" />,
      color: "bg-purple-500",
      gradient: "from-purple-500 to-purple-600"
    },
    {
      title: "System Settings",
      description: "Configure system preferences",
      path: "/admin-dashboard/system-settings",
      icon: <Settings className="w-6 h-6" />,
      color: "bg-orange-500",
      gradient: "from-orange-500 to-orange-600"
    },
  ];

  const balanceTypes = [
    { type: "SMS", label: "SMS Balance", icon: <Activity className="w-4 h-4" /> },
    { type: "BULK", label: "Bulk Balance", icon: <CreditCard className="w-4 h-4" /> },
    { type: "Wallet", label: "Wallet Balance", icon: <Wallet className="w-4 h-4" /> }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    },
    hover: {
      scale: 1.02,
      transition: {
        duration: 0.2,
        ease: "easeInOut"
      }
    }
  };

  return (
    <motion.div 
      className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Section */}
      <motion.div 
        className="mb-8"
        variants={itemVariants}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Admin Dashboard
            </h1>
            <p className="text-gray-600">
              Welcome back! Here's what's happening with your property management system.
            </p>
          </div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              onClick={() => navigate("/admin-dashboard/register-property")}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl shadow-lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Property
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Balance Section */}
      <motion.div 
        className="mb-8"
        variants={itemVariants}
      >
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">System Balances</h2>
          <div className="flex flex-wrap gap-4">
            {balanceTypes.map((balanceType, index) => (
              <motion.div
                key={balanceType.type}
                variants={cardVariants}
                whileHover="hover"
                initial="hidden"
                animate="visible"
                transition={{ delay: index * 0.1 }}
              >
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    fetchBalance(balanceType.type);
                  }}
                  disabled={balanceLoading}
                  variant={
                    balanceType.type === balanceType.type && balance?.data.currentBalance !== false
                      ? "primary"
                      : "outline"
                  }
                  className={`min-w-40 h-12 rounded-xl border-2 transition-all duration-300 ${
                    balanceType.type === balanceType.type && balance?.data.currentBalance !== false
                      ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-500"
                      : "bg-white hover:bg-gray-50 border-gray-200 hover:border-blue-300"
                  }`}
                >
                  {balanceLoading && balanceType.type === balanceType.type ? (
                    <div className="flex items-center gap-2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24">
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
                      </motion.div>
                      Loading...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {balanceType.icon}
                      {balanceType.label}
                    </div>
                  )}
                </Button>
              </motion.div>
            ))}
          </div>

          {/* Balance Display */}
          <AnimatePresence>
            {balance && balance.status === "200" && balance.data.message && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-800">{balanceType} Balance</h3>
                    <p className="text-2xl font-bold text-green-900">{balance.data.message}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {balanceError && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Activity className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-red-800">Error</h3>
                  <p className="text-red-700">{balanceError}</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Statistics Cards */}
      <motion.div 
        className="mb-8"
        variants={itemVariants}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            variants={cardVariants}
            whileHover="hover"
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Home className="w-6 h-6 text-blue-600" />
              </div>
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <TrendingUp className="w-5 h-5 text-green-500" />
              </motion.div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">Total Properties</h3>
            <p className="text-2xl font-bold text-gray-900 mb-2">{properties.length}</p>
            <div className="flex items-center text-sm text-green-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              +12% from last month
            </div>
          </motion.div>

          <motion.div
            variants={cardVariants}
            whileHover="hover"
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <TrendingUp className="w-5 h-5 text-green-500" />
              </motion.div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">Total Landlords</h3>
            <p className="text-2xl font-bold text-gray-900 mb-2">{landlords.length}</p>
            <div className="flex items-center text-sm text-green-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              +8% from last month
            </div>
          </motion.div>

          <motion.div
            variants={cardVariants}
            whileHover="hover"
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Wallet className="w-6 h-6 text-purple-600" />
              </div>
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <TrendingUp className="w-5 h-5 text-green-500" />
              </motion.div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">Total Revenue</h3>
            <p className="text-2xl font-bold text-gray-900 mb-2">UGX{stats.totalRevenue.toLocaleString()}</p>
            <div className="flex items-center text-sm text-green-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              +15% from last month
            </div>
          </motion.div>

          <motion.div
            variants={cardVariants}
            whileHover="hover"
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-100 rounded-xl">
                <Percent className="w-6 h-6 text-orange-600" />
              </div>
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <TrendingUp className="w-5 h-5 text-green-500" />
              </motion.div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">Occupancy Rate</h3>
            <p className="text-2xl font-bold text-gray-900 mb-2">{stats.occupancyRate}%</p>
            <div className="flex items-center text-sm text-green-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              +5% from last month
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div 
        className="mb-8"
        variants={itemVariants}
      >
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action, index) => (
            <motion.div
              key={action.title}
              variants={cardVariants}
              whileHover="hover"
              initial="hidden"
              animate="visible"
              transition={{ delay: index * 0.1 }}
              className="group cursor-pointer"
              onClick={() => navigate(action.path)}
            >
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 group-hover:border-gray-200">
                <div className={`p-3 rounded-xl mb-4 bg-gradient-to-r ${action.gradient} text-white`}>
                  {action.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {action.title}
                </h3>
                <p className="text-sm text-gray-600 mb-4">{action.description}</p>
                <div className="flex items-center text-blue-600 font-medium text-sm group-hover:text-blue-700 transition-colors">
                  Get Started
                  <motion.div
                    className="ml-2"
                    initial={{ x: 0 }}
                    whileHover={{ x: 5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </motion.div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Recent Activity Section */}
      <motion.div 
        className="mb-8"
        variants={itemVariants}
      >
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Activity</h2>
          <div className="space-y-4">
            {[
              { action: "New property registered", time: "2 minutes ago", type: "property" },
              { action: "Landlord payment received", time: "15 minutes ago", type: "payment" },
              { action: "Tenant complaint resolved", time: "1 hour ago", type: "complaint" },
              { action: "System maintenance completed", time: "2 hours ago", type: "system" }
            ].map((activity, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className={`p-2 rounded-lg ${
                  activity.type === 'property' ? 'bg-blue-100' :
                  activity.type === 'payment' ? 'bg-green-100' :
                  activity.type === 'complaint' ? 'bg-orange-100' :
                  'bg-purple-100'
                }`}>
                  {activity.type === 'property' && <Building2 className="w-4 h-4 text-blue-600" />}
                  {activity.type === 'payment' && <Wallet className="w-4 h-4 text-green-600" />}
                  {activity.type === 'complaint' && <Activity className="w-4 h-4 text-orange-600" />}
                  {activity.type === 'system' && <Settings className="w-4 h-4 text-purple-600" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{activity.action}</p>
                  <p className="text-sm text-gray-500">{activity.time}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AdminDashboard;
