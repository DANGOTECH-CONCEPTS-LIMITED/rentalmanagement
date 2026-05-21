import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { getImageUrl } from "../../lib/imageUrl";
import { useAuth } from "../../context/AuthContext";
import {
  Bell,
  Settings,
  Key,
  Lock,
  X,
  LogOut,
  FileText,
  CreditCard,
  MessageSquare,
  AlertCircle,
  CheckCheck,
  Loader2,
  Eye,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import Button from "../ui/button/Button";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NotifItem {
  id: string;
  type: "invoice" | "payment" | "complaint" | "sms" | "viewing";
  title: string;
  subtitle: string;
  time: string;
  isNew: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LAST_SEEN_KEY = "notifications_last_seen";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const typeIcon: Record<NotifItem["type"], React.ReactNode> = {
  invoice: <FileText className="h-4 w-4 text-blue-600" />,
  payment: <CreditCard className="h-4 w-4 text-emerald-600" />,
  complaint: <AlertCircle className="h-4 w-4 text-amber-600" />,
  sms: <MessageSquare className="h-4 w-4 text-violet-600" />,
  viewing: <Eye className="h-4 w-4 text-indigo-600" />,
};

const typeBg: Record<NotifItem["type"], string> = {
  invoice: "bg-blue-50",
  payment: "bg-emerald-50",
  complaint: "bg-amber-50",
  sms: "bg-violet-50",
  viewing: "bg-indigo-50",
};

// ─── Main Component ───────────────────────────────────────────────────────────

const Header = () => {
  const [roles, setRoles] = useState<{ id: number; name: string }[]>([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const [notifPos, setNotifPos] = useState({ top: 0, right: 0 });

  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [imgError, setImgError] = useState(false);

  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [lastSeen, setLastSeen] = useState<string>(
    () => localStorage.getItem(LAST_SEEN_KEY) ?? new Date(0).toISOString()
  );

  const { changePassword, logout, user } = useAuth();
  const roleName = roles.find((r) => r.id === user?.systemRoleId)?.name;
  const profileImage = user?.passportPhoto ? getImageUrl(user.passportPhoto) : null;
  const initials = user?.fullName
    ? user.fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const token = user ? (user as any).token ?? JSON.parse(localStorage.getItem("user") ?? "{}").token : null;
  const authHeader = { Authorization: `Bearer ${token}` };
  const unreadCount = notifications.filter((n) => n.isNew).length;

  // ── Fetch notifications ───────────────────────────────────────────────────

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setNotifLoading(true);
    const lastSeenDate = new Date(lastSeen);
    const items: NotifItem[] = [];

    try {
      const role = user.systemRoleId;

      // Tenant notifications
      if (role === 3) {
        const results = await Promise.allSettled([
          axios.get(`${apiUrl}/GetInvoicesByTenantId/${user.id}`, { headers: authHeader }),
          axios.get(`${apiUrl}/GetPaymentsByTenantId/${user.id}`, { headers: authHeader }),
          axios.get(`${apiUrl}/GetComplaintsByTenantId/${user.id}`, { headers: authHeader }),
        ]);

        // Invoices
        if (results[0].status === "fulfilled") {
          const invoices: any[] = results[0].value.data ?? [];
          invoices.slice(0, 20).forEach((inv: any) => {
            const t = inv.createdAt ?? inv.CreatedAt;
            items.push({
              id: `inv-${inv.id}`,
              type: "invoice",
              title: `Invoice ${inv.invoiceNumber ?? "#"}`,
              subtitle: `${inv.status ?? "Pending"} · ${inv.amount != null ? `UGX ${Number(inv.amount).toLocaleString()}` : ""}`,
              time: t,
              isNew: t ? new Date(t) > lastSeenDate : false,
            });
          });
        }

        // Payments
        if (results[1].status === "fulfilled") {
          const payments: any[] = results[1].value.data ?? [];
          payments.slice(0, 10).forEach((p: any) => {
            const t = p.createdAt ?? p.paymentDate;
            items.push({
              id: `pay-${p.id}`,
              type: "payment",
              title: "Payment Confirmed",
              subtitle: `${p.transactionId ?? ""} · UGX ${Number(p.amount ?? 0).toLocaleString()}`,
              time: t,
              isNew: t ? new Date(t) > lastSeenDate : false,
            });
          });
        }

        // Complaints
        if (results[2].status === "fulfilled") {
          const complaints: any[] = results[2].value.data ?? [];
          complaints.slice(0, 10).forEach((c: any) => {
            const t = c.dateCreated ?? c.DateCreated;
            items.push({
              id: `cmp-${c.id}`,
              type: "complaint",
              title: c.subject ?? "Complaint",
              subtitle: `Status: ${c.status ?? "Open"}`,
              time: t,
              isNew: t ? new Date(t) > lastSeenDate : false,
            });
          });
        }
      }

      // Landlord notifications
      if (role === 2) {
        const results = await Promise.allSettled([
          axios.get(`${apiUrl}/GetAllTenantComplaintsByLandlordId/${user.id}`, { headers: authHeader }),
          axios.get(`${apiUrl}/GetInvoicesByLandLordId/${user.id}`, { headers: authHeader }),
          axios.get(`${apiUrl}/GetMySmsSentLogs`, { headers: authHeader }),
          axios.get(`${apiUrl}/GetViewingRequestsByLandlordId/${user.id}`, { headers: authHeader }),
        ]);

        // Complaints
        if (results[0].status === "fulfilled") {
          const complaints: any[] = results[0].value.data ?? [];
          complaints.slice(0, 15).forEach((c: any) => {
            const t = c.dateCreated ?? c.DateCreated;
            items.push({
              id: `cmp-${c.id}`,
              type: "complaint",
              title: c.subject ?? "New Complaint",
              subtitle: `Priority: ${c.priority ?? "Normal"} · ${c.status ?? "Open"}`,
              time: t,
              isNew: t ? new Date(t) > lastSeenDate : false,
            });
          });
        }

        // Invoices
        if (results[1].status === "fulfilled") {
          const invoices: any[] = results[1].value.data ?? [];
          invoices.slice(0, 10).forEach((inv: any) => {
            const t = inv.createdAt ?? inv.CreatedAt;
            items.push({
              id: `inv-${inv.id}`,
              type: "invoice",
              title: `Invoice ${inv.invoiceNumber ?? "#"}`,
              subtitle: `${inv.status ?? "Pending"} · UGX ${Number(inv.amount ?? 0).toLocaleString()}`,
              time: t,
              isNew: t ? new Date(t) > lastSeenDate : false,
            });
          });
        }

        // SMS sent logs
        if (results[2].status === "fulfilled") {
          const logs: any[] = results[2].value.data ?? [];
          logs.slice(0, 10).forEach((s: any) => {
            items.push({
              id: `sms-${s.id}`,
              type: "sms",
              title: `SMS to ${s.phone}`,
              subtitle: s.message.slice(0, 60) + (s.message.length > 60 ? "…" : ""),
              time: s.sentAt,
              isNew: s.sentAt ? new Date(s.sentAt) > lastSeenDate : false,
            });
          });
        }

        // Viewing requests (pending only)
        if (results[3].status === "fulfilled") {
          const viewings: any[] = results[3].value.data ?? [];
          viewings.filter((v: any) => v.status === "Pending").slice(0, 10).forEach((v: any) => {
            const t = v.createdAt;
            items.push({
              id: `view-${v.id}`,
              type: "viewing",
              title: `Viewing Request — ${v.tenantName}`,
              subtitle: `${v.property?.name ?? `Property #${v.propertyId}`} · ${new Date(v.preferredDate).toLocaleDateString("en-UG", { day: "numeric", month: "short" })}`,
              time: t,
              isNew: t ? new Date(t) > lastSeenDate : false,
            });
          });
        }
      }

      // Admin notifications
      if (role === 1) {
        const results = await Promise.allSettled([
          axios.get(`${apiUrl}/GetAllTenantComplaints`, { headers: authHeader }),
          axios.get(`${apiUrl}/GetAllPayments`, { headers: authHeader }),
          axios.get(`${apiUrl}/GetAllSmsLogs`, { headers: authHeader }),
        ]);

        // Complaints
        if (results[0].status === "fulfilled") {
          const complaints: any[] = results[0].value.data ?? [];
          complaints.slice(0, 15).forEach((c: any) => {
            const t = c.dateCreated ?? c.DateCreated;
            items.push({
              id: `cmp-${c.id}`,
              type: "complaint",
              title: c.subject ?? "Complaint",
              subtitle: `Priority: ${c.priority ?? "Normal"} · ${c.status ?? "Open"}`,
              time: t,
              isNew: t ? new Date(t) > lastSeenDate : false,
            });
          });
        }

        // Payments
        if (results[1].status === "fulfilled") {
          const payments: any[] = results[1].value.data ?? [];
          payments.slice(0, 10).forEach((p: any) => {
            const t = p.createdAt ?? p.paymentDate;
            items.push({
              id: `pay-${p.id}`,
              type: "payment",
              title: "Payment Received",
              subtitle: `${p.transactionId ?? ""} · UGX ${Number(p.amount ?? 0).toLocaleString()}`,
              time: t,
              isNew: t ? new Date(t) > lastSeenDate : false,
            });
          });
        }

        // SMS logs
        if (results[2].status === "fulfilled") {
          const logs: any[] = results[2].value.data ?? [];
          logs.slice(0, 10).forEach((s: any) => {
            items.push({
              id: `sms-${s.id}`,
              type: "sms",
              title: `SMS sent to ${s.phone}`,
              subtitle: s.message.slice(0, 60) + (s.message.length > 60 ? "…" : ""),
              time: s.sentAt,
              isNew: s.sentAt ? new Date(s.sentAt) > lastSeenDate : false,
            });
          });
        }
      }
    } catch {
      // silently fail
    } finally {
      // Sort newest first
      items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setNotifications(items);
      setNotifLoading(false);
    }
  }, [user, lastSeen]);

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchRoles();
    fetchNotifications();

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !dropdownRef.current?.contains(target))
        setShowUserDropdown(false);
      if (!bellRef.current?.contains(target) && !notifRef.current?.contains(target))
        setShowNotifications(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchRoles = async () => {
    try {
      const { data } = await axios.get(`${apiUrl}/GetAllRoles`);
      setRoles(data);
    } catch {}
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleProfileClick = () => {
    if (!showUserDropdown && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 12, right: window.innerWidth - rect.right });
    }
    setShowUserDropdown((prev) => !prev);
    setShowNotifications(false);
  };

  const handleBellClick = () => {
    if (!showNotifications && bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect();
      setNotifPos({ top: rect.bottom + 12, right: window.innerWidth - rect.right });
    }
    if (!showNotifications) {
      // Mark all as read when opening
      const now = new Date().toISOString();
      localStorage.setItem(LAST_SEEN_KEY, now);
      setLastSeen(now);
      setNotifications((prev) => prev.map((n) => ({ ...n, isNew: false })));
    }
    setShowNotifications((prev) => !prev);
    setShowUserDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setError("Passwords don't match"); return; }
    try {
      setLoading(true);
      setError("");
      await changePassword(currentPassword, newPassword);
      setShowPasswordModal(false);
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      logout();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password change failed");
    } finally {
      setLoading(false);
    }
  };

  // ── Portals ───────────────────────────────────────────────────────────────

  const notificationPanel = showNotifications
    ? createPortal(
        <AnimatePresence>
          <motion.div
            ref={notifRef}
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="fixed w-80 rounded-2xl border border-border/70 bg-white shadow-[0_24px_60px_-24px_rgba(15,23,42,0.28)] z-[9998] overflow-hidden"
            style={{ top: notifPos.top, right: notifPos.right }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-slate-600" />
                <span className="text-sm font-semibold text-[#0F172A]">Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full leading-none">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={fetchNotifications}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                  title="Refresh"
                >
                  {notifLoading
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <CheckCheck className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-96 overflow-y-auto">
              {notifLoading && notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                  <p className="text-xs text-slate-400">Loading notifications…</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center">
                    <Bell className="h-5 w-5 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-500 font-medium">All caught up!</p>
                  <p className="text-xs text-slate-400">No notifications yet.</p>
                </div>
              ) : (
                <ul className="divide-y divide-[#F1F5F9]">
                  {notifications.map((n) => (
                    <li
                      key={n.id}
                      className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-50 ${
                        n.isNew ? "bg-blue-50/50" : ""
                      }`}
                    >
                      <div className={`h-8 w-8 rounded-lg ${typeBg[n.type]} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        {typeIcon[n.type]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-1">
                          <p className="text-xs font-semibold text-[#0F172A] leading-tight truncate">
                            {n.title}
                          </p>
                          {n.isNew && (
                            <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-0.5" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-tight line-clamp-2">
                          {n.subtitle}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.time)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )
    : null;

  const profileDropdown = showUserDropdown
    ? createPortal(
        <div
          ref={dropdownRef}
          className="fixed w-64 rounded-2xl border border-border/70 bg-white p-2 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.28)] z-[9998] cursor-pointer"
          style={{ top: dropdownPos.top, right: dropdownPos.right }}
        >
          <div className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-700 hover:bg-slate-50">
            {profileImage && !imgError ? (
              <img
                className="h-10 w-10 rounded-xl object-cover ring-1 ring-[#E2E8F0] shrink-0"
                src={profileImage}
                alt={user?.fullName}
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="h-10 w-10 rounded-xl bg-[#1D4ED8] flex items-center justify-center text-white text-sm font-bold shrink-0">
                {initials}
              </div>
            )}
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
            className="flex items-center px-3 py-2 text-sm text-slate-700 gap-2 rounded-xl hover:bg-slate-50 cursor-pointer"
            onClick={() => { setShowUserDropdown(false); setShowPasswordModal(true); }}
          >
            <Settings className="h-4 w-4 shrink-0" />
            Change Password
          </div>
          <div className="my-2 h-px bg-border/80" />
          <div
            className="flex items-center px-3 py-2 text-sm text-red-600 gap-2 rounded-xl hover:bg-red-50 cursor-pointer"
            onClick={() => { setShowUserDropdown(false); logout(); }}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Logout
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
              <button onClick={() => setShowPasswordModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
              {error && (
                <div className="text-red-500 text-sm p-3 bg-red-50 rounded-lg border border-red-100">{error}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={16} className="text-gray-400" />
                  </div>
                  <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                    className="pl-10 input-field" placeholder="Enter current password" required autoComplete="current-password" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Key size={16} className="text-gray-400" />
                  </div>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10 input-field" placeholder="Enter new password" required minLength={4} autoComplete="new-password" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Key size={16} className="text-gray-400" />
                  </div>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 input-field" placeholder="Confirm new password" required autoComplete="new-password" />
                </div>
              </div>
              <Button type="submit" className="w-full" isLoading={loading}>Change Password</Button>
            </form>
          </div>
        </div>,
        document.body
      )
    : null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#E2E8F0] bg-white px-4 shadow-sm md:px-6"
      >
        {/* Left — role title */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Icon badge */}
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm"
            style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)" }}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V21a.75.75 0 01-.75.75H3.75A.75.75 0 013 21V9.75z" />
            </svg>
            {/* subtle glow dot */}
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-white" />
          </div>
          {/* Text */}
          <div className="min-w-0 hidden md:block">
            <h2
              className="truncate text-[15px] font-bold leading-tight tracking-tight text-[#0F172A]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {roleName || "Dashboard"}
            </h2>
            <p
              className="text-[11px] leading-tight font-medium tracking-wide"
              style={{ color: "#94a3b8", fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: "0.04em" }}
            >
              Marple Properties
            </p>
          </div>
          {/* Mobile: just role name */}
          <h2
            className="truncate text-sm font-bold text-[#0F172A] md:hidden"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {roleName || "Dashboard"}
          </h2>
        </div>

        {/* Right — actions */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Notification bell */}
          <button
            ref={bellRef}
            onClick={handleBellClick}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A]"
            aria-label="Notifications"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#EF4444] text-[9px] font-bold text-white ring-2 ring-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          <div className="hidden md:block h-8 w-px bg-[#E2E8F0]" />

          {/* Profile trigger */}
          <div className="relative" ref={triggerRef}>
            <div
              onClick={handleProfileClick}
              className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-1.5 transition-colors hover:bg-[#F1F5F9] hover:border-[#CBD5E1]"
            >
              {profileImage && !imgError ? (
                <img
                  className="h-7 w-7 rounded-lg object-cover ring-1 ring-[#E2E8F0]"
                  src={profileImage}
                  alt={user?.fullName}
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="h-7 w-7 rounded-lg bg-[#1D4ED8] flex items-center justify-center text-white text-[10px] font-bold ring-1 ring-[#E2E8F0]">
                  {initials}
                </div>
              )}
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

      {notificationPanel}
      {profileDropdown}
      {passwordModal}
    </>
  );
};

export default Header;
