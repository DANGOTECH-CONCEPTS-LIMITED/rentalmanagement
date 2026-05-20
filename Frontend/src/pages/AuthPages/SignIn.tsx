import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, Mail, ArrowRight, CheckCircle2 } from "lucide-react";

const features = [
  { text: "Manage properties and tenants in one place" },
  { text: "Track payments and invoices in real time" },
  { text: "Automated rent reminders and SMS alerts" },
  { text: "Utility billing with token generation" },
];

const SignIn = () => {
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
        case 1: navigate("/admin-dashboard"); break;
        case 2: navigate("/landlord-dashboard"); break;
        case 3: navigate("/tenant-dashboard"); break;
        case 4: navigate("/utility-dashboard"); break;
        default: navigate("/");
      }
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F8FAFC]">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1E3A5F] to-[#1D4ED8] flex-col justify-between p-12">
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute bottom-0 -left-20 h-72 w-72 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute top-1/2 right-8 h-48 w-48 rounded-full bg-blue-400/10" />

        {/* Logo */}
        <div className="relative z-10">
          <img src="/marple_logo.png" alt="Marble Logo" className="h-14 w-auto object-contain" />
        </div>

        {/* Center content */}
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight">
              Property Management<br />
              <span className="text-blue-300">Made Simple</span>
            </h1>
            <p className="mt-4 text-base text-slate-300 leading-relaxed max-w-sm">
              Your all-in-one platform for managing properties, tenants, payments, and utilities — from anywhere.
            </p>
          </div>

          <ul className="space-y-3">
            {features.map((f, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}
                className="flex items-center gap-3 text-sm text-slate-200"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-300" />
                {f.text}
              </motion.li>
            ))}
          </ul>
        </div>

        {/* Bottom badge */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-white/80">System online — all services running</span>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[400px]"
        >
          {/* Logo — always visible above heading */}
          <div className="mb-8">
            <img src="/marple_logo.png" alt="Marble Logo" className="h-16 w-auto object-contain" />
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">Welcome back</h2>
            <p className="mt-1 text-sm text-[#64748B]">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#0F172A]">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="username"
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white py-3 pl-10 pr-4 text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/15"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-[#0F172A]">Password</label>
                <a href="#/forgot-password" className="text-xs font-medium text-[#1D4ED8] hover:text-[#1e40af]">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white py-3 pl-10 pr-11 text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {authError && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                {authError}
              </motion.div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={authLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1D4ED8] py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1e40af] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/40 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {authLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-[#94A3B8]">
            Don't have an account?{" "}
            <span className="font-medium text-[#1D4ED8]">Contact your administrator</span>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default SignIn;
