import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, ArrowRight, Home, ArrowLeft, CheckCircle2, Eye, EyeOff, Key } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

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
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
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

  return (
    <div className="min-h-screen flex bg-[#F8FAFC]">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1E3A5F] to-[#1D4ED8] flex-col justify-between p-12">
        <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute bottom-0 -left-20 h-72 w-72 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute top-1/2 right-8 h-48 w-48 rounded-full bg-blue-400/10" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 border border-white/20">
            <Home className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">Nyumba Yo</span>
        </div>

        {/* Center */}
        <div className="relative z-10 space-y-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 border border-white/20">
            <Key className="h-8 w-8 text-blue-300" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white leading-tight">
              Set New Password
            </h1>
            <p className="mt-3 text-slate-300 leading-relaxed max-w-xs">
              Paste the token from your email, then choose a strong new password for your account.
            </p>
          </div>
          <ul className="space-y-2.5">
            {["At least 4 characters long", "Avoid reusing old passwords", "Use a mix of letters and numbers"].map((tip) => (
              <li key={tip} className="flex items-center gap-2.5 text-sm text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-blue-300 shrink-0" />
                {tip}
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-white/80">System online — all services running</span>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[400px]"
        >
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1D4ED8]">
              <Home className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-[#0F172A]">Nyumba Yo</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">Reset your password</h2>
            <p className="mt-1 text-sm text-[#64748B]">Enter the token from your email and choose a new password.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Token */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#0F172A]">Reset Token</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste token from email"
                  required
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white py-3 pl-10 pr-4 text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/15 font-mono"
                />
              </div>
            </div>

            {/* New password */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#0F172A]">New Password</label>
              <div className="relative">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  minLength={4}
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white py-3 pl-10 pr-11 text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/15"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] transition-colors"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#0F172A]">Confirm New Password</label>
              <div className="relative">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  autoComplete="new-password"
                  className={`w-full rounded-xl border bg-white py-3 pl-10 pr-11 text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition-all focus:ring-2 ${
                    !passwordsMatch
                      ? "border-red-300 focus:border-red-400 focus:ring-red-400/15"
                      : "border-[#E2E8F0] focus:border-[#1D4ED8] focus:ring-[#1D4ED8]/15"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] transition-colors"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {!passwordsMatch && (
                <p className="text-xs text-red-500">Passwords don't match.</p>
              )}
            </div>

            {message && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                {message}
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading || !passwordsMatch || !!message}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1D4ED8] py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1e40af] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/40 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Resetting…
                </>
              ) : (
                <>
                  Reset Password
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <button
            onClick={() => navigate("/")}
            className="mt-8 flex items-center gap-1.5 text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors mx-auto"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default ResetPassword;
