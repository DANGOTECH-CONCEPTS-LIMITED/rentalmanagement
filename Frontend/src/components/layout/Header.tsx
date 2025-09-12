import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  Bell,
  Sun,
  Moon,
  Search,
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
      className="h-16 border-b border-white/20 bg-gradient-to-r from-slate-900/80 via-purple-900/80 to-slate-900/80 backdrop-blur-xl sticky top-0 z-20 flex items-center justify-between px-6 relative overflow-hidden"
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full blur-2xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-full blur-2xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="relative z-10 flex items-center">
        {/* <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search..."
            className="pl-10 pr-4 py-2 text-sm bg-muted rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-transparent w-full md:w-72"
          />
        </div> */}
      </div>

      <div className="relative z-10 flex items-center space-x-4">
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-full hover:bg-white/10 transition-colors text-white"
          aria-label="Toggle dark mode"
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button
          className="p-2 rounded-full hover:bg-white/10 transition-colors relative text-white"
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
        <div className="relative ml-3" ref={userDropdownRef}>
          {/* <button
            type="button"
            className="flex items-center space-x-2 focus:outline-none"
            onClick={() => setShowUserDropdown(!showUserDropdown)}
          >
            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center uppercase font-medium text-sm">
              {user?.fullName?.charAt(0) || "U"}
            </div>
          </button> */}
          <div
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="bg-white/10 backdrop-blur-sm rounded-full p-1 cursor-pointer border border-white/20 hover:bg-white/20 transition-all duration-200"
          >
            <img
              className="h-8 w-8 rounded-full"
              src={
                `${
                  import.meta.env.VITE_API_BASE_URL
                }/uploads/${user.passportPhoto?.split(/[/\\]/).pop()}` ||
                "https://media.istockphoto.com/id/1495088043/vector/user-profile-icon-avatar-or-person-icon-profile-picture-portrait-symbol-default-portrait.jpg?s=612x612&w=0&k=20&c=dhV2p1JwmloBTOaGAtaA3AW1KSnjsdMt7-U_3EZElZ0="
              }
              alt="User profile"
            />
          </div>

          {showUserDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-48 bg-white/10 backdrop-blur-xl rounded-xl shadow-2xl py-1 z-50 cursor-pointer border border-white/20"
            >
              <div className="flex items-center px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors">
                <User className="mr-2 h-4 w-4" />
                {user?.fullName}
              </div>
              <hr className="border-white/20" />
              <div className="flex items-center px-4 py-2 text-sm text-white gap-2 hover:bg-white/10 transition-colors">
                <p>Role:</p>
                {roles.find((role) => role.id === user?.systemRoleId)?.name}
              </div>
              <hr className="border-white/20" />
              <div
                className="flex items-center px-4 py-2 text-sm text-white gap-2 hover:bg-white/10 transition-colors"
                onClick={() => setShowPasswordModal(true)}
              >
                <Settings />
                Change Password
              </div>
            </motion.div>
          )}
        </div>

        {showPasswordModal && (
          <div className="absolute right-0 h-[85vh] top-[3.5rem] inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-gradient-to-br from-slate-900/90 via-purple-900/90 to-slate-900/90 backdrop-blur-xl rounded-2xl w-full max-w-md border border-white/20 shadow-2xl"
            >
              <div className="flex justify-between items-center p-4 border-b border-white/20">
                <h3 className="text-lg font-semibold text-white">
                  Change Password
                </h3>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {error && (
                  <div className="text-red-400 text-sm p-3 bg-red-500/20 rounded-lg border border-red-500/30">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1 text-white/90">
                    Current Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                      <Lock size={16} className="text-white/60" />
                    </div>
                    <input
                      type="text"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="pl-10 w-full h-10 rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm text-white placeholder-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-white/90">
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                      <Key size={16} className="text-white/60" />
                    </div>
                    <input
                      type="text"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10 w-full h-10 rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm text-white placeholder-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                      required
                      minLength={4}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-white/90">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                      <Key size={16} className="text-white/60" />
                    </div>
                    <input
                      type="text"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 w-full h-10 rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm text-white placeholder-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full mt-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                  isLoading={loading}
                >
                  Change Password
                </Button>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </motion.header>
  );
};

export default Header;
