import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  User,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Building2,
  Home,
  Key,
  Shield,
} from "lucide-react";
import Button from "../../components/ui/button/Button";

const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState({ email: false, password: false });
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

  // Floating animation variants
  const floatingVariants = {
    animate: {
      y: [-10, 10, -10],
      transition: {
        duration: 6,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  // Form animation variants
  const formVariants = {
    hidden: { opacity: 0, x: 50, scale: 0.95 },
    visible: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut",
        staggerChildren: 0.1,
      },
    },
  };

  const inputVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.4, ease: "easeOut" },
    },
  };

  // Image animation variants
  const imageVariants = {
    hidden: { opacity: 0, x: -50, scale: 0.95 },
    visible: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        duration: 0.8,
        ease: "easeOut",
        delay: 0.2,
      },
    },
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        {/* Gradient Orbs */}
        <motion.div
          className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full blur-3xl"
          animate={{
            x: [0, -80, 0],
            y: [0, 60, 0],
            scale: [1, 0.8, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>

      {/* Main Content - Split Layout */}
      <div className="relative z-10 min-h-screen flex">
        {/* Left Side - Property Management Image/Content */}
        <div className="hidden lg:flex lg:w-1/2 relative">
          <motion.div
            variants={imageVariants}
            initial="hidden"
            animate="visible"
            className="w-full h-full flex items-center justify-center relative"
          >
            {/* Property Management Illustration */}
            <div className="relative w-full h-full flex items-center justify-center p-12">
              {/* Main Building Illustration */}
              <div className="relative">
                {/* Building Base */}
                <motion.div
                  className="w-80 h-96 bg-gradient-to-b from-white/20 to-white/10 rounded-t-3xl border border-white/30 backdrop-blur-sm"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                >
                  {/* Windows */}
                  <div className="grid grid-cols-3 gap-4 p-6">
                    {[...Array(9)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-16 h-16 bg-gradient-to-br from-blue-400/30 to-purple-400/30 rounded-lg border border-white/20 backdrop-blur-sm"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.8 + i * 0.1, duration: 0.4 }}
                      />
                    ))}
                  </div>
                </motion.div>

                {/* Roof */}
                <motion.div
                  className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-96 h-8 bg-gradient-to-r from-purple-500/40 to-blue-500/40 rounded-t-full"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                />

                {/* Door */}
                <motion.div
                  className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-20 h-32 bg-gradient-to-b from-yellow-400/40 to-orange-400/40 rounded-t-2xl border border-white/30"
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: 0.7, duration: 0.5 }}
                />
              </div>

              {/* Floating Icons */}
              <motion.div
                className="absolute top-20 right-20 text-white/60"
                variants={floatingVariants}
                animate="animate"
              >
                <Home size={48} />
              </motion.div>
              <motion.div
                className="absolute bottom-40 left-20 text-white/60"
                variants={floatingVariants}
                animate="animate"
                style={{ animationDelay: "1s" }}
              >
                <Key size={40} />
              </motion.div>
              <motion.div
                className="absolute top-1/2 right-10 text-white/60"
                variants={floatingVariants}
                animate="animate"
                style={{ animationDelay: "2s" }}
              >
                <Shield size={36} />
              </motion.div>

              {/* Feature Cards */}
              <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex space-x-6">
                <motion.div
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 text-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2, duration: 0.6 }}
                >
                  <Building2 size={24} className="text-white/80 mx-auto mb-2" />
                  <p className="text-white/80 text-sm font-medium">
                    Property Management
                  </p>
                </motion.div>
                <motion.div
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 text-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.4, duration: 0.6 }}
                >
                  <Sparkles size={24} className="text-white/80 mx-auto mb-2" />
                  <p className="text-white/80 text-sm font-medium">
                    Smart Solutions
                  </p>
                </motion.div>
              </div>
            </div>

            {/* Overlay Text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className="text-center text-white/90"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.6, duration: 0.8 }}
              >
                <h2 className="text-2xl font-bold mb-4">
                  Welcome to NYUMBA YO
                </h2>
                <p className="text-lg text-white/70 max-w-md">
                  Streamline your property management with our comprehensive
                  platform
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <motion.div
            variants={formVariants}
            initial="hidden"
            animate="visible"
            className="w-full max-w-md"
          >
            <div className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
              {/* Header with gradient */}
              <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 p-8 text-center relative overflow-hidden">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"
                  animate={{
                    x: ["-100%", "100%"],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
                <motion.h1
                  className="text-3xl font-bold text-white mb-2 relative z-10"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                >
                  NYUMBA YO
                </motion.h1>
                <motion.p
                  className="text-white/90 relative z-10"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                >
                  Your one stop property management solution
                </motion.p>
              </div>

              <div className="p-8">
                <motion.form
                  onSubmit={handleSubmit}
                  className="space-y-6"
                  variants={formVariants}
                >
                  <motion.div variants={inputVariants} className="space-y-4">
                    <div>
                      <motion.label
                        className="block text-sm font-medium text-white/90 mb-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                      >
                        Email
                      </motion.label>
                      <motion.div
                        className="relative"
                        whileHover={{ scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User size={18} className="text-white/60" />
                        </div>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onFocus={() =>
                            setIsFocused({ ...isFocused, email: true })
                          }
                          onBlur={() =>
                            setIsFocused({ ...isFocused, email: false })
                          }
                          className={`w-full px-4 py-3 pl-10 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 ${
                            isFocused.email
                              ? "bg-white/20 border-purple-500/50"
                              : ""
                          }`}
                          placeholder="Enter your email"
                          required
                          autoComplete="username"
                        />
                      </motion.div>
                    </div>

                    <div>
                      <motion.label
                        className="block text-sm font-medium text-white/90 mb-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7 }}
                      >
                        Password
                      </motion.label>
                      <motion.div
                        className="relative"
                        whileHover={{ scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock size={18} className="text-white/60" />
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onFocus={() =>
                            setIsFocused({ ...isFocused, password: true })
                          }
                          onBlur={() =>
                            setIsFocused({ ...isFocused, password: false })
                          }
                          className={`w-full px-4 py-3 pl-10 pr-10 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 ${
                            isFocused.password
                              ? "bg-white/20 border-purple-500/50"
                              : ""
                          }`}
                          placeholder="Enter your password"
                          required
                          autoComplete="current-password"
                        />
                        <motion.button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/60 hover:text-white/80 transition-colors"
                          onClick={() => setShowPassword(!showPassword)}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <AnimatePresence mode="wait">
                            {showPassword ? (
                              <motion.div
                                key="eye-off"
                                initial={{ opacity: 0, rotate: -90 }}
                                animate={{ opacity: 1, rotate: 0 }}
                                exit={{ opacity: 0, rotate: 90 }}
                                transition={{ duration: 0.2 }}
                              >
                                <EyeOff size={18} />
                              </motion.div>
                            ) : (
                              <motion.div
                                key="eye"
                                initial={{ opacity: 0, rotate: -90 }}
                                animate={{ opacity: 1, rotate: 0 }}
                                exit={{ opacity: 0, rotate: 90 }}
                                transition={{ duration: 0.2 }}
                              >
                                <Eye size={18} />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.button>
                      </motion.div>
                    </div>
                  </motion.div>

                  <AnimatePresence>
                    {authError && (
                      <motion.p
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3"
                      >
                        {authError}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <motion.div
                    variants={inputVariants}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
                      isLoading={authLoading}
                      rightIcon={<ArrowRight size={18} />}
                    >
                      Sign In
                    </Button>
                  </motion.div>
                </motion.form>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8, duration: 0.6 }}
                  className="mt-6 space-y-4"
                >
                  <Link
                    to="/forgot-password"
                    className="block text-sm font-medium text-white/80 hover:text-white transition-colors duration-200 text-center"
                  >
                    Forgot password?
                  </Link>
                  <p className="text-center text-sm text-white/60">
                    Don't have an account?{" "}
                    <Link
                      to="/signup"
                      className="font-medium text-purple-300 hover:text-purple-200 transition-colors duration-200"
                    >
                      contact Admin
                    </Link>
                  </p>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
