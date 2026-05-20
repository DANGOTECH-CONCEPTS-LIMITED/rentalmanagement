import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getImageUrl } from "../../lib/imageUrl";
import { useAuth } from "../../context/AuthContext";
import {
  Bell,
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
  const [roles, setRoles] = useState([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { changePassword, logout, user } = useAuth();
  const roleName = roles.find((role) => role.id === user?.systemRoleId)?.name;
  const FALLBACK_AVATAR =
    "https://media.istockphoto.com/id/1495088043/vector/user-profile-icon-avatar-or-person-icon-profile-picture-portrait-symbol-default-portrait.jpg?s=612x612&w=0&k=20&c=dhV2p1JwmloBTOaGAtaA3AW1KSnjsdMt7-U_3EZElZ0=";
  const profileImage = user?.passportPhoto ? getImageUrl(user.passportPhoto) : FALLBACK_AVATAR;

  useEffect(() => {
    fetchRoles();

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const insideTrigger = triggerRef.current?.contains(target);
      const insideDropdown = dropdownRef.current?.contains(target);
      if (!insideTrigger && !insideDropdown) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  const handleProfileClick = () => {
    if (!showUserDropdown && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 12,
        right: window.innerWidth - rect.right,
      });
    }
    setShowUserDropdown((prev) => !prev);
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

  const profileDropdown = showUserDropdown
    ? createPortal(
        <div
          ref={dropdownRef}
          className="fixed w-64 rounded-2xl border border-border/70 bg-white p-2 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.28)] z-[9998] cursor-pointer"
          style={{ top: dropdownPos.top, right: dropdownPos.right }}
        >
          <div className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-700 hover:bg-slate-50">
            <User className="mr-2 h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-slate-900 truncate">{user?.fullName}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <div className="my-2 h-px bg-border/80" />
          <div className="flex items-center px-3 py-2 text-sm text-slate-700 gap-2 rounded-xl hover:bg-slate-50">
            <p>Role:</p>
            <span className="font-medium text-slate-900">{roleName}</span>
          </div>
          <div
            className="flex items-center px-3 py-2 text-sm text-slate-700 gap-2 rounded-xl hover:bg-slate-50"
            onClick={() => {
              setShowUserDropdown(false);
              setShowPasswordModal(true);
            }}
          >
            <Settings className="h-4 w-4 shrink-0" />
            Change Password
          </div>
        </div>,
        document.body
      )
    : null;

  const passwordModal = showPasswordModal
    ? createPortal(
        <div className="fixed inset-0 bg-slate-950/50 flex items-center justify-center z-[9999] p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/70 bg-white shadow-[0_30px_90px_-36px_rgba(15,23,42,0.45)] overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-border/70 shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
              {error && (
                <div className="text-red-500 text-sm p-3 bg-red-50 rounded-lg border border-red-100">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="pl-10 input-field"
                    placeholder="Enter current password"
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Key size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10 input-field"
                    placeholder="Enter new password"
                    required
                    minLength={4}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Key size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 input-field"
                    placeholder="Confirm new password"
                    required
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" isLoading={loading}>
                Change Password
              </Button>
            </form>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#E2E8F0] bg-white px-4 shadow-sm md:px-6"
      >
        {/* Left — breadcrumb style title */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1D4ED8]">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V21a.75.75 0 01-.75.75H3.75A.75.75 0 013 21V9.75z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-[#0F172A] md:text-base leading-tight">
              {roleName || "Dashboard"}
            </h2>
            <p className="text-[11px] text-[#94A3B8] leading-tight hidden md:block">Nyumba Yo Platform</p>
          </div>
        </div>

        {/* Right — actions */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Notification bell */}
          <button
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A]"
            aria-label="Notifications"
          >
            <Bell size={16} />
            <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-[#EF4444] ring-2 ring-white"></span>
          </button>

          {/* Divider */}
          <div className="hidden md:block h-8 w-px bg-[#E2E8F0]" />

          {/* Profile trigger */}
          <div className="relative" ref={triggerRef}>
            <div
              onClick={handleProfileClick}
              className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-1.5 transition-colors hover:bg-[#F1F5F9] hover:border-[#CBD5E1]"
            >
              <img
                className="h-7 w-7 rounded-lg object-cover ring-1 ring-[#E2E8F0]"
                src={profileImage}
                alt="User profile"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = FALLBACK_AVATAR;
                }}
              />
              <div className="hidden text-left md:block">
                <p className="max-w-36 truncate text-xs font-semibold text-[#0F172A] leading-tight">
                  {user?.fullName || "User"}
                </p>
                <p className="text-[11px] text-[#64748B] leading-tight">{roleName || "Role"}</p>
              </div>
              <svg className="hidden md:block h-3.5 w-3.5 text-[#94A3B8] ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </motion.header>
      {profileDropdown}
      {passwordModal}
    </>
  );
};

export default Header;
