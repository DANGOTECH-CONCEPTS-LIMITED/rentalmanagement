import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Bell, Sun, Moon, User, Settings, Key, Lock, X } from "lucide-react";
import { motion } from "framer-motion";
import axios from "axios";
import Button from "../ui/button/Button";

const Header = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [roles, setRoles] = useState([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { changePassword, logout, user } = useAuth();
  const roleName = roles.find((role) => role.id === user?.systemRoleId)?.name;
  const profileImage = user?.passportPhoto
    ? `${import.meta.env.VITE_API_BASE_URL}/uploads/${user.passportPhoto
        ?.split(/[/\\]/)
        .pop()}`
    : "https://media.istockphoto.com/id/1495088043/vector/user-profile-icon-avatar-or-person-icon-profile-picture-portrait-symbol-default-portrait.jpg?s=612x612&w=0&k=20&c=dhV2p1JwmloBTOaGAtaA3AW1KSnjsdMt7-U_3EZElZ0=";

  useEffect(() => {
    fetchRoles();

    const handleClickOutside = (event: MouseEvent) => {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target as Node)
      ) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchRoles = async () => {
    try {
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/GetAllRoles`,
      );
      setRoles(data);
    } catch (error) {
      console.log("error", error);
    }
  };

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);

    if (newMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await changePassword(currentPassword, newPassword);
      setShowPasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      logout();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password change failed");
    } finally {
      setLoading(false);
    }
  };

  const inputClasses =
    "w-full pl-12 pr-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-blue-100/70 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200";

  const iconColor = "text-blue-100";

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-white/20  bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 px-4 backdrop-blur-xl md:px-6"
    >
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">
          Workspace
        </p>
        <h2 className="truncate text-lg font-semibold text-white md:text-xl">
          {roleName || "Dashboard"}
        </h2>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <button
          onClick={toggleDarkMode}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white shadow-sm transition-colors hover:bg-white/20"
          aria-label="Toggle dark mode"
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button
          className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white shadow-sm transition-colors hover:bg-white/20"
          aria-label="Notifications"
        >
          <Bell size={18} />
          <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500"></span>
        </button>

        {/* Profile dropdown */}
        <div className="relative ml-1" ref={userDropdownRef}>
          <div
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-2 py-2 shadow-sm transition-colors hover:bg-white/20"
          >
            <img
              className="h-9 w-9 rounded-xl object-cover"
              src={profileImage}
              alt="User profile"
            />
            <div className="hidden text-left md:block">
              <p className="max-w-40 truncate text-sm font-semibold text-white">
                {user?.fullName || "User"}
              </p>
              <p className="text-xs text-blue-100">{roleName || "Role"}</p>
            </div>
          </div>

          {showUserDropdown && (
            <div className="absolute right-0 mt-3 w-64 rounded-2xl border border-white/20 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-2 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.5)] z-50 cursor-pointer backdrop-blur-xl">
              <div className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-white hover:bg-white/10">
                <User className="mr-2 h-4 w-4 text-blue-100" />
                <div>
                  <p className="font-medium text-white">{user?.fullName}</p>
                  <p className="text-xs text-blue-100">{user?.email}</p>
                </div>
              </div>
              <div className="my-2 h-px bg-white/10" />
              <div className="flex items-center px-3 py-2 text-sm text-white gap-2 rounded-xl hover:bg-white/10">
                <p>Role:</p>
                <span className="font-medium text-white">{roleName}</span>
              </div>
              <div
                className="flex items-center px-3 py-2 text-sm text-white gap-2 rounded-xl hover:bg-white/10"
                onClick={() => setShowPasswordModal(true)}
              >
                <Settings className="h-4 w-4 text-blue-100" />
                Change Password
              </div>
            </div>
          )}
        </div>

        {showPasswordModal && (
          <div className="fixed inset-0 bg-slate-950/70 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-md rounded-[28px] border border-white/20 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-0 shadow-[0_30px_90px_-36px_rgba(15,23,42,0.45)] backdrop-blur-xl">
              <div className="flex justify-between items-center p-5 border-b border-white/20">
                <h3 className="text-lg font-semibold text-white">
                  Change Password
                </h3>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="text-blue-200 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {error && (
                  <div className="text-red-300 text-sm p-3 bg-red-500/10 border border-red-400/30 rounded-lg">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1 text-white">
                    Current Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock size={16} className={iconColor} />
                    </div>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className={inputClasses}
                      placeholder="Enter current password"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-white">
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Key size={16} className={iconColor} />
                    </div>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={inputClasses}
                      placeholder="Enter new password"
                      required
                      minLength={4}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-white">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Key size={16} className={iconColor} />
                    </div>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={inputClasses}
                      placeholder="Confirm new password"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full mt-4"
                  isLoading={loading}
                >
                  Change Password
                </Button>
              </form>
            </div>
          </div>
        )}
      </div>
    </motion.header>
  );
};

export default Header;
