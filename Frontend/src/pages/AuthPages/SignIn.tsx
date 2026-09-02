import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { motion } from "framer-motion";
import {
  ArrowRight,
  User,
  Lock,
  Eye,
  EyeOff,
  Building2,
  Users,
  BarChart3,
  Shield,
  Droplets,
} from "lucide-react";
import logo from "../../assets/logo.png";
import Button from "../../components/ui/button/Button";

const SignIn = () => {
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login, loading: authLoading, error: authError } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { systemRoleId } = await login(email, password);

      switch (systemRoleId) {
        case 1: // Admin
          navigate("/admin-dashboard");
          break;
        case 2: // Landlord
          navigate("/landlord-dashboard");
          break;
        case 3: // Tenant
          navigate("/tenant-dashboard");
          break;
        case 4: // Tenant
          navigate("/utility-dashboard");
          break;
        default:
          navigate("/");
      }
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const features = [
    {
      icon: Building2,
      title: "Property Management",
      description: "Manage all your properties in one place",
    },
    {
      icon: Users,
      title: "Tenant Management",
      description: "Track tenants and their information",
    },
    {
      icon: Droplets,
      title: "Prepaid Water Meters",
      description: "IoT-powered utilities with smart monitoring",
    },
    {
      icon: BarChart3,
      title: "Analytics & Reports",
      description: "Get insights into your portfolio",
    },
    {
      icon: Shield,
      title: "Secure & Reliable",
      description: "Enterprise-grade security",
    },
  ];

  return (
    <div className="signin-page">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ y: [0, -20, 0], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-20 left-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl"
        />
        <motion.div
          animate={{ y: [0, 20, 0], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: Infinity, delay: 2 }}
          className="absolute bottom-20 right-10 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl"
        />
        <motion.div
          animate={{ y: [0, -15, 0], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 12, repeat: Infinity, delay: 4 }}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl"
        />
      </div>

      {/* Left Side - Brand & Features */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        className="signin-left"
      >
        <div>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3 mb-12"
          >
            <img
              src={logo}
              alt="NYUMBA YO Logo"
              className="w-12 h-12 object-contain"
            />
            <div>
              <h1 className="text-3xl font-bold text-white">NYUMBA YO</h1>
              <p className="text-blue-200 text-sm">Property Management Suite</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-8"
          >
            <div>
              <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
                Manage Your Properties with Confidence
              </h2>
              <p className="text-blue-100 text-lg">
                Streamline your property management operations with our
                comprehensive platform designed for modern landlords and
                property managers.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="flex gap-4 group"
                  >
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-blue-500/20 group-hover:bg-blue-500/30 transition-colors">
                        <Icon className="h-6 w-6 text-blue-300" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold mb-1">
                        {feature.title}
                      </h3>
                      <p className="text-blue-200 text-sm">
                        {feature.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-blue-200 text-sm mt-10"
        >
          <p>© 2024 - {currentYear} NYUMBA YO. All rights reserved.</p>
        </motion.div>
      </motion.div>

      {/* Right Side - Sign In Form & Company Info */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        className="signin-right"
      >
        <div className="signin-form-wrapper">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-8"
          >
            <div className="mb-8 text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <img
                  src={logo}
                  alt="NYUMBA YO Logo"
                  className="w-12 h-12 object-contain"
                />
                <div className="text-left">
                  <h1 className="text-2xl font-bold text-white leading-none">
                    NYUMBA YO
                  </h1>
                  <p className="text-blue-200 text-xs">Property Management</p>
                </div>
              </div>
              <h2 className="text-xl font-semibold text-white mb-1">
                Welcome Back
              </h2>
              <p className="text-blue-100 text-sm">
                Sign in to your account to continue
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <label className="block text-sm font-medium text-white mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User size={18} className="text-blue-300" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                    placeholder="you@example.com"
                    required
                    autoComplete="username"
                  />
                </div>
              </motion.div>

              {/* Password Field */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <label className="block text-sm font-medium text-white mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock size={18} className="text-blue-300" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-blue-300 hover:text-blue-200 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </motion.div>

              {authError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/20 border border-red-400/50 rounded-lg p-3 text-red-200 text-sm"
                >
                  {authError}
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                  isLoading={authLoading}
                  rightIcon={<ArrowRight size={18} />}
                >
                  Sign In
                </Button>
              </motion.div>
            </form>

            <div className="mt-6 text-center">
              <Link
                to="/forgot-password"
                className="text-blue-200 hover:text-blue-100 text-sm font-medium transition-colors"
              >
                Forgot your password?
              </Link>
            </div>

            <p className="mt-6 pt-6 border-t border-white/10 text-center text-sm text-blue-200">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="font-semibold text-blue-300 hover:text-blue-200 transition-colors"
              >
                Contact Admin
              </Link>
            </p>
          </motion.div>

          {/* Mobile Brand Footer */}
          <div className="lg:hidden mt-8 text-center text-blue-200 text-sm">
            <p>© 2024 - {currentYear} NYUMBA YO. All rights reserved.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SignIn;
