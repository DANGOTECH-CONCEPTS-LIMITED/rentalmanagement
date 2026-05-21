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
    <div
      className="min-h-screen flex"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* ── Left panel — branding ─────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col justify-between p-14"
        style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0f2044 45%, #1a3a6e 100%)" }}
      >
        {/* Decorative orbs */}
        <div className="pointer-events-none absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)" }} />
        <div className="pointer-events-none absolute bottom-0 -left-24 h-80 w-80 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)" }} />
        <div className="pointer-events-none absolute top-1/2 right-0 h-64 w-64 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(251,191,36,0.08) 0%, transparent 70%)" }} />

        {/* Subtle grid overlay */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

        {/* Logo */}
        <div className="relative z-10">
          <img src="/marple_logo.png" alt="Marple Properties" className="h-12 w-auto object-contain" />
        </div>

        {/* Center content */}
        <div className="relative z-10 space-y-10">
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {/* Pill label */}
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 mb-6">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-[11px] font-medium tracking-widest uppercase text-white/60">
                  Property Management
                </span>
              </div>

              <h1
                className="text-5xl leading-[1.15] font-bold text-white"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Simplify Your<br />
                <span style={{ color: "#fbbf24" }}>Property</span>{" "}
                <span className="text-blue-300">Empire</span>
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="text-base leading-relaxed max-w-sm"
              style={{ color: "rgba(203,213,225,0.85)", fontWeight: 300 }}
            >
              Your all-in-one platform for managing properties, tenants, payments,
              and utilities — beautifully organised, anywhere you are.
            </motion.p>
          </div>

          {/* Feature list */}
          <ul className="space-y-3.5">
            {features.map((f, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.1, duration: 0.45 }}
                className="flex items-center gap-3"
              >
                <div className="h-5 w-5 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.3)" }}>
                  <CheckCircle2 className="h-3 w-3" style={{ color: "#fbbf24" }} />
                </div>
                <span className="text-sm" style={{ color: "rgba(226,232,240,0.85)", fontWeight: 400 }}>
                  {f.text}
                </span>
              </motion.li>
            ))}
          </ul>
        </div>

        {/* Bottom stats row */}
        <div className="relative z-10 flex items-center gap-6">
          {[
            { val: "500+", label: "Properties" },
            { val: "2k+", label: "Tenants" },
            { val: "99.9%", label: "Uptime" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>{s.val}</p>
              <p className="text-[11px] uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.7)" }}>{s.label}</p>
            </div>
          ))}
          <div className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-medium text-white/60">All systems online</span>
          </div>
        </div>
      </div>

      {/* ── Right panel — form ────────────────────────────────────────────── */}
      <div
        className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-14"
        style={{ background: "#f8fafc" }}
      >
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[400px]"
        >
          {/* Logo (mobile only) */}
          <div className="mb-8 lg:hidden">
            <img src="/marple_logo.png" alt="Marple Properties" className="h-12 w-auto object-contain" />
          </div>

          {/* Heading */}
          <div className="mb-9">
            <h2
              className="text-[2rem] font-bold leading-tight"
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                color: "#0a0f1e",
                letterSpacing: "-0.02em",
              }}
            >
              Welcome back
            </h2>
            <p className="mt-2 text-sm" style={{ color: "#64748b", fontWeight: 400 }}>
              Sign in to your{" "}
              <span style={{ color: "#1d4ed8", fontWeight: 600 }}>Marple Properties</span>{" "}
              account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: "#475569" }}
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#94a3b8" }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="username"
                  className="w-full rounded-xl border py-3 pl-10 pr-4 text-sm outline-none transition-all"
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    borderColor: "#e2e8f0",
                    background: "#fff",
                    color: "#0f172a",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#1d4ed8";
                    e.target.style.boxShadow = "0 0 0 3px rgba(29,78,216,0.10)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e2e8f0";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: "#475569" }}
                >
                  Password
                </label>
                <a
                  href="#/forgot-password"
                  className="text-xs font-semibold transition-colors"
                  style={{ color: "#1d4ed8" }}
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#94a3b8" }} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border py-3 pl-10 pr-11 text-sm outline-none transition-all"
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    borderColor: "#e2e8f0",
                    background: "#fff",
                    color: "#0f172a",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#1d4ed8";
                    e.target.style.boxShadow = "0 0 0 3px rgba(29,78,216,0.10)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e2e8f0";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "#94a3b8" }}
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
            <motion.button
              type="submit"
              disabled={authLoading}
              whileTap={{ scale: 0.98 }}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: authLoading
                  ? "#3b5fc0"
                  : "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)",
                boxShadow: "0 4px 14px rgba(29,78,216,0.35)",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                letterSpacing: "0.01em",
              }}
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
            </motion.button>
          </form>

          {/* Divider */}
          <div className="my-8 flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: "#e2e8f0" }} />
            <span className="text-[11px] uppercase tracking-widest" style={{ color: "#94a3b8" }}>Secure Login</span>
            <div className="flex-1 h-px" style={{ background: "#e2e8f0" }} />
          </div>

          <p className="text-center text-xs" style={{ color: "#94a3b8" }}>
            Don't have an account?{" "}
            <span className="font-semibold" style={{ color: "#1d4ed8" }}>
              Contact your administrator
            </span>
          </p>

          <p className="mt-6 text-center text-[11px]" style={{ color: "#cbd5e1" }}>
            © {new Date().getFullYear()} Marple Properties. All rights reserved.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default SignIn;
