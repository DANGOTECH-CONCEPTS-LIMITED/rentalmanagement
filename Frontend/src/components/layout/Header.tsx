import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  Bell,
  Sun,
  Moon,
  User,
  Settings,
  Key,
  Lock,
  X,
} from "lucide-react";
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
        `${import.meta.env.VITE_API_BASE_URL}/GetAllRoles`
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

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-border/70 bg-background/80 px-4 backdrop-blur-xl md:px-6"
    >
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
          Workspace
        </p>
        <h2 className="truncate text-lg font-semibold text-slate-950 md:text-xl">
          {roleName || "Dashboard"}
        </h2>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <button
          onClick={toggleDarkMode}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-white/90 text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
          aria-label="Toggle dark mode"
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button
          className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-white/90 text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
          aria-label="Notifications"
        >
          <Bell size={18} />
          <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500"></span>
        </button>

        {/* <div className="flex items-center space-x-3">
          <div className="">
            <p className="text-sm font-medium">{user?.fullName}</p>
            <p className="text-xs text-muted-foreground">
              {roles.find((role) => role.id === user?.systemRoleId)?.name}
            </p>
          </div>
          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center uppercase font-medium text-sm">
            {user?.fullName?.charAt(0) || "U"}
          </div>
        </div> */}
        {/* Profile dropdown */}
        <div className="relative ml-1" ref={userDropdownRef}>
          <div
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border/70 bg-white/92 px-2 py-2 shadow-sm transition-colors hover:bg-slate-50"
          >
            <img
              className="h-9 w-9 rounded-xl object-cover"
              src={profileImage}
              alt="User profile"
            />
            <div className="hidden text-left md:block">
              <p className="max-w-40 truncate text-sm font-semibold text-slate-900">
                {user?.fullName || "User"}
              </p>
              <p className="text-xs text-muted-foreground">{roleName || "Role"}</p>
            </div>
          </div>

          {showUserDropdown && (
            <div className="absolute right-0 mt-3 w-64 rounded-2xl border border-border/70 bg-white/96 p-2 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.28)] z-50 cursor-pointer backdrop-blur">
              <div className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-700 hover:bg-slate-50">
                <User className="mr-2 h-4 w-4" />
                <div>
                  <p className="font-medium text-slate-900">{user?.fullName}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <div className="my-2 h-px bg-border/80" />
              <div className="flex items-center px-3 py-2 text-sm text-slate-700 gap-2 rounded-xl hover:bg-slate-50">
                <p>Role:</p>
                <span className="font-medium text-slate-900">{roleName}</span>
              </div>
              <div
                className="flex items-center px-3 py-2 text-sm text-slate-700 gap-2 rounded-xl hover:bg-slate-50"
                onClick={() => setShowPasswordModal(true)}
              >
                <Settings className="h-4 w-4" />
                Change Password
              </div>
            </div>
          )}
        </div>

        {showPasswordModal && (
          <div className="fixed inset-0 bg-slate-950/50 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-md rounded-[28px] border border-white/70 bg-white p-0 shadow-[0_30px_90px_-36px_rgba(15,23,42,0.45)]">
              <div className="flex justify-between items-center p-5 border-b border-border/70">
                <h3 className="text-lg font-semibold">Change Password</h3>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {error && (
                  <div className="text-red-500 text-sm p-2 bg-red-50 rounded">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Current Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                      <Lock size={16} className="text-gray-400" />
                    </div>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="pl-10 input-field"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                      <Key size={16} className="text-gray-400" />
                    </div>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10 input-field"
                      required
                      minLength={4}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                      <Key size={16} className="text-gray-400" />
                    </div>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 input-field"
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
