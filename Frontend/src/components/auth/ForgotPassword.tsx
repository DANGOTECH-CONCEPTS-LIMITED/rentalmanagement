import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Button from "../ui/button/Button";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { forgotPassword, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await forgotPassword(email);
      setMessage("Password reset token is sent to your email");
      sessionStorage.setItem("resetEmail", email);
      setTimeout(() => navigate("/reset-password"), 2000);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send reset email"
      );
      setMessage("");
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
                Forgot Password
              </h1>
              <p className="text-gray-600">
                Enter your email to receive a reset link
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail size={18} className="text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field pl-10"
                    placeholder="Enter your email"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {message && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-green-600 mt-2"
                >
                  {message}
                </motion.p>
              )}

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-red-600 mt-2"
                >
                  {error}
                </motion.p>
              )}

              <Button
                type="submit"
                className="w-full"
                isLoading={loading}
                rightIcon={<ArrowRight size={18} />}
              >
                Send Reset Link
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-600">
              Remember your password?{" "}
              <Link
                to="/"
                className="font-medium text-primary hover:text-primary/80"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
