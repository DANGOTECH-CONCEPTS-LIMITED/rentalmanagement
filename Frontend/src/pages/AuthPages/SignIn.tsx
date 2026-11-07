import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { motion } from "framer-motion";
import { ArrowRight, User, Lock, Eye, EyeOff } from "lucide-react";
import Button from "../../components/ui/button/Button";

const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { login, verifyMfa, loading: authLoading, error: authError } =
    useAuth();
  const navigate = useNavigate();

  const routeByRole = (systemRoleId: number) => {
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
      case 4: // Utility
        navigate("/utility-dashboard");
        break;
      default:
        navigate("/");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await login(email, password);

      // The password was accepted but the account has MFA: ask for the code next.
      if ("requiresMfa" in result && result.requiresMfa) {
        setChallengeId(result.challengeId);
        setMfaCode("");
        return;
      }

      routeByRole((result as { systemRoleId: number }).systemRoleId);
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeId) return;
    try {
      const { systemRoleId } = await verifyMfa(challengeId, mfaCode.trim());
      routeByRole(systemRoleId);
    } catch (error) {
      console.error("MFA verification error:", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-8">
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                NYUMBA YO
              </h1>
              <p className="text-gray-600">
                Your one stop property management solution
              </p>
            </div>

            {challengeId ? (
              <form onSubmit={handleVerify} className="space-y-6">
                <p className="text-sm text-gray-600">
                  Enter the 6-digit code from your authenticator app to finish signing in.
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                  className="input-field text-center text-lg tracking-[0.5em]"
                  placeholder="000000"
                  autoFocus
                  required
                />
                {authError && (
                  <p className="text-sm text-red-600">{String(authError)}</p>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  isLoading={authLoading}
                  rightIcon={<ArrowRight size={18} />}
                >
                  Verify code
                </Button>
                <button
                  type="button"
                  className="text-sm text-gray-500 hover:text-gray-700"
                  onClick={() => setChallengeId(null)}
                >
                  Use a different account
                </button>
              </form>
            ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User size={18} className="text-gray-400" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-field pl-10"
                      placeholder="Enter your email"
                      required
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock size={18} className="text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-field pl-10 pr-10"
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff size={18} className="text-gray-400" />
                      ) : (
                        <Eye size={18} className="text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {authError && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-red-600 mt-2"
                >
                  {authError}
                </motion.p>
              )}

              <Button
                type="submit"
                className="w-full"
                isLoading={authLoading}
                rightIcon={<ArrowRight size={18} />}
              >
                Sign In
              </Button>
            </form>
            )}

            <Link
              to="/forgot-password"
              className="text-sm font-medium text-primary hover:text-primary/80"
            >
              Forgot password?
            </Link>
            <p className="mt-6 text-center text-sm text-gray-600">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="font-medium text-primary hover:text-primary/80"
              >
                contact Admin
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SignIn;
