import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, ArrowRight, ArrowLeft, CheckCircle2, Eye, EyeOff, Key } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const tips = [
  "At least 4 characters long",
  "Avoid reusing old passwords",
  "Use a mix of letters and numbers",
];

const ResetPassword = () => {
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { resetPassword, loading } = useAuth();
  const navigate = useNavigate();

  const passwordsMatch = confirmPassword.length === 0 || newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setError("Passwords don't match."); return; }
    try {
      await resetPassword(token, newPassword);
      setMessage("Password reset successfully. Redirecting to sign in…");
      setError("");
      sessionStorage.removeItem("resetEmail");
      setTimeout(() => navigate("/"), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset failed. Try again.");
      setMessage("");
    }
  };

  const inputBase: React.CSSProperties = {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    borderColor: "#e2e8f0",
    background: "#fff",
    color: "#0f172a",
  };

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ── Left panel ─────────────────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col justify-between p-14"
        style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0f2044 45%, #1a3a6e 100%)" }}
      >
        {/* Orbs */}
        <div className="pointer-events-none absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)" }} />
        <div className="pointer-events-none absolute bottom-0 -left-24 h-80 w-80 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)" }} />
        <div className="pointer-events-none absolute top-1/2 right-0 h-64 w-64 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(251,191,36,0.08) 0%, transparent 70%)" }} />
        {/* Grid */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

        {/* Logo */}
        <div className="relative z-10">
          <img src="/marple_logo.png" alt="Marple Properties" className="h-12 w-auto object-contain" />
        </div>

        {/* Center */}
        <div className="relative z-10 space-y-8">
          {/* Icon */}
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.25)" }}>
            <Key className="h-7 w-7" style={{ color: "#fbbf24" }} />
          </div>

          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[11px] font-medium tracking-widest uppercase text-white/60">
                Set New Password
              </span>
            </div>

            <h1
              className="text-4xl font-bold text-white leading-[1.2]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Reset Your<br />
              <span style={{ color: "#fbbf24" }}>Password</span>
            </h1>
            <p className="text-sm leading-relaxed max-w-xs" style={{ color: "rgba(203,213,225,0.85)", fontWeight: 300 }}>
              Paste the token from your email, then choose a strong new password for your account.
            </p>
          </div>

          <ul className="space-y-3">
            {tips.map((tip) => (
              <li key={tip} className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.3)" }}>
                  <CheckCircle2 className="h-3 w-3" style={{ color: "#fbbf24" }} />
                </div>
                <span className="text-sm" style={{ color: "rgba(226,232,240,0.85)", fontWeight: 400 }}>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom */}
        <div className="relative z-10 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-medium text-white/60">All systems online</span>
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-14"
        style={{ background: "#f8fafc" }}>
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[400px]"
        >
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden">
            <img src="/marple_logo.png" alt="Marple Properties" className="h-12 w-auto object-contain" />
          </div>

          {/* Heading */}
          <div className="mb-9">
            <h2
              className="text-[2rem] font-bold leading-tight"
              style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#0a0f1e", letterSpacing: "-0.02em" }}
            >
              Reset your password
            </h2>
            <p className="mt-2 text-sm" style={{ color: "#64748b", fontWeight: 400 }}>
              Enter the token from your email and choose a{" "}
              <span style={{ color: "#1d4ed8", fontWeight: 600 }}>new password</span>.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Token */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>
                Reset Token
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#94a3b8" }} />
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste token from email"
                  required
                  className="w-full rounded-xl border py-3 pl-10 pr-4 text-sm outline-none transition-all font-mono"
                  style={inputBase}
                  onFocus={(e) => { e.target.style.borderColor = "#1d4ed8"; e.target.style.boxShadow = "0 0 0 3px rgba(29,78,216,0.10)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }}
                />
              </div>
            </div>

            {/* New password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>
                New Password
              </label>
              <div className="relative">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#94a3b8" }} />
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  minLength={4}
                  autoComplete="new-password"
                  className="w-full rounded-xl border py-3 pl-10 pr-11 text-sm outline-none transition-all"
                  style={inputBase}
                  onFocus={(e) => { e.target.style.borderColor = "#1d4ed8"; e.target.style.boxShadow = "0 0 0 3px rgba(29,78,216,0.10)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }}
                />
                <button type="button" onClick={() => setShowNew(!showNew)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors" style={{ color: "#94a3b8" }}>
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>
                Confirm New Password
              </label>
              <div className="relative">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#94a3b8" }} />
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  autoComplete="new-password"
                  className="w-full rounded-xl border py-3 pl-10 pr-11 text-sm outline-none transition-all"
                  style={{
                    ...inputBase,
                    borderColor: !passwordsMatch ? "#fca5a5" : "#e2e8f0",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = !passwordsMatch ? "#f87171" : "#1d4ed8";
                    e.target.style.boxShadow = `0 0 0 3px ${!passwordsMatch ? "rgba(239,68,68,0.10)" : "rgba(29,78,216,0.10)"}`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = !passwordsMatch ? "#fca5a5" : "#e2e8f0";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors" style={{ color: "#94a3b8" }}>
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {!passwordsMatch && (
                <p className="text-xs" style={{ color: "#ef4444" }}>Passwords don't match.</p>
              )}
            </div>

            {message && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />{message}
              </motion.div>
            )}

            {error && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                <div className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />{error}
              </motion.div>
            )}

            <motion.button
              type="submit"
              disabled={loading || !passwordsMatch || !!message}
              whileTap={{ scale: 0.98 }}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)",
                boxShadow: "0 4px 14px rgba(29,78,216,0.35)",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              {loading ? (
                <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Resetting…</>
              ) : (
                <>Reset Password<ArrowRight className="h-4 w-4" /></>
              )}
            </motion.button>
          </form>

          <div className="my-8 flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: "#e2e8f0" }} />
            <span className="text-[11px] uppercase tracking-widest" style={{ color: "#94a3b8" }}>Secure Reset</span>
            <div className="flex-1 h-px" style={{ background: "#e2e8f0" }} />
          </div>

          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-sm font-medium transition-colors mx-auto"
            style={{ color: "#64748b" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#0f172a")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </button>

          <p className="mt-6 text-center text-[11px]" style={{ color: "#cbd5e1" }}>
            © {new Date().getFullYear()} Marple Properties. All rights reserved.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default ResetPassword;
