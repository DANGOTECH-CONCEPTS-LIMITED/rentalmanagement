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
      className="h-16 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-6"
    >
      <div className="flex items-center">
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

      <div className="flex items-center space-x-4">
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-full hover:bg-muted transition-colors"
          aria-label="Toggle dark mode"
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button
          className="p-2 rounded-full hover:bg-muted transition-colors relative"
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
            className="bg-gray-200 rounded-full p-1 cursor-pointer"
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
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 cursor-pointer">
              <div className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                <User className="mr-2 h-4 w-4" />
                {user?.fullName}
              </div>
              <hr />
              <div className="flex items-center px-4 py-2 text-sm text-gray-700 gap-2 hover:bg-gray-100">
                <p>Role:</p>
                {roles.find((role) => role.id === user?.systemRoleId)?.name}
              </div>
              <hr />
              <div
                className="flex items-center px-4 py-2 text-sm text-gray-700 gap-2 hover:bg-gray-100"
                onClick={() => setShowPasswordModal(true)}
              >
                <Settings />
                Change Password
              </div>
            </div>
          )}
        </div>

        {showPasswordModal && (
          <div className="absolute right-0 h-[85vh] top-[3.5rem] inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-md">
              <div className="flex justify-between items-center p-4 border-b">
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
                      type="text"
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
                      type="text"
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
                      type="text"
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
