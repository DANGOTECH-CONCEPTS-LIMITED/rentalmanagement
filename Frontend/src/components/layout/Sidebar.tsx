import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "../../hooks/use-mobile";
import {
  Home, Users, FileText, Settings, BarChart3, Menu, LogOut, ChevronRight,
  House, MessageSquare, CreditCard, Plus, X, FileSearch, DoorOpen, Receipt,
  TrendingDown, UserCircle, Zap, Smartphone, Inbox, Eye, Calendar,
} from "lucide-react";
import { cn } from "../../lib/utils";

interface SidebarProps {
  role: number;
}

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
}

interface NavGroup {
  label: string;
  icon: React.ReactNode;
  children: NavItem[];
}

type NavEntry = NavItem | NavGroup;

function isNavGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

// ── Collapsible group component ───────────────────────────────────────────────
const NavGroupItem = ({
  group,
  showExpanded,
  onNavigate,
}: {
  group: NavGroup;
  showExpanded: boolean;
  onNavigate?: () => void;
}) => {
  const location = useLocation();
  const isChildActive = group.children.some((c) =>
    location.pathname.startsWith(c.path)
  );
  const [open, setOpen] = useState(isChildActive);

  return (
    <li>
      <button
        onClick={() => { if (showExpanded) setOpen((o) => !o); }}
        className={cn(
          "sidebar-link w-full",
          isChildActive && !open ? "bg-white/10 text-white" : "",
          !showExpanded ? "justify-center px-2" : ""
        )}
      >
        <span>{group.icon}</span>
        {showExpanded && (
          <>
            <span className="flex-1 text-left">{group.label}</span>
            <ChevronRight
              size={14}
              className={cn(
                "shrink-0 transition-transform duration-200",
                open ? "rotate-90" : ""
              )}
            />
          </>
        )}
      </button>

      <AnimatePresence initial={false}>
        {showExpanded && open && (
          <motion.ul
            key="children"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden pl-3 mt-0.5 space-y-0.5 border-l border-white/10 ml-4"
          >
            {group.children.map((child) => (
              <li key={child.path}>
                <NavLink
                  to={child.path}
                  end
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn("sidebar-link py-2 text-[13px]", isActive ? "active" : "")
                  }
                >
                  <span className="opacity-80">{child.icon}</span>
                  <span className="flex-1">{child.label}</span>
                </NavLink>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </li>
  );
};

// ── Sidebar nav list (shared between desktop & mobile) ────────────────────────
const NavList = ({
  entries,
  showExpanded,
  onNavigate,
}: {
  entries: NavEntry[];
  showExpanded: boolean;
  onNavigate?: () => void;
}) => (
  <ul className="space-y-1 px-3">
    {entries.map((entry, idx) =>
      isNavGroup(entry) ? (
        <motion.div
          key={entry.label}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.04 }}
        >
          <NavGroupItem
            group={entry}
            showExpanded={showExpanded}
            onNavigate={onNavigate}
          />
        </motion.div>
      ) : (
        <motion.li
          key={entry.path}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.04 }}
        >
          <NavLink
            to={entry.path}
            end
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "sidebar-link",
                isActive ? "active" : "",
                !showExpanded ? "justify-center px-2" : ""
              )
            }
          >
            <span>{entry.icon}</span>
            {showExpanded && <span className="flex-1">{entry.label}</span>}
          </NavLink>
        </motion.li>
      )
    )}
  </ul>
);

// ── Main sidebar component ────────────────────────────────────────────────────
const Sidebar: React.FC<SidebarProps> = ({ role }) => {
  const { logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const isMobile = useIsMobile();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const entries = getNavEntries(role);
  const showExpanded = !isCollapsed || isHovering;
  const sidebarWidth = isCollapsed && !isHovering ? "w-20" : "w-64";

  const sidebarStyle = {
    backgroundImage: [
      "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
      "linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
      "linear-gradient(180deg, #0a0f1e 0%, #0d1f4a 50%, #1a3a6e 100%)",
    ].join(", "),
    backgroundSize: "40px 40px, 40px 40px, 100% 100%",
  };

  if (isMobile) {
    return (
      <>
        <button
          onClick={() => setIsMobileOpen(true)}
          className="fixed top-4 left-4 z-30 p-2 rounded-md bg-primary text-white shadow-md"
        >
          <Menu size={20} />
        </button>

        {isMobileOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsMobileOpen(false)}
          />
        )}

        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: isMobileOpen ? 0 : "-100%" }}
          transition={{ duration: 0.3 }}
          className="fixed top-0 left-0 z-50 h-screen w-4/5 max-w-xs flex flex-col border-r border-white/[0.07] shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)]"
          style={sidebarStyle}
        >
          <div className="flex items-center justify-between h-16 px-4 border-b border-white/[0.07] shrink-0">
            <img src="/marple_logo.png" alt="Logo" className="h-8 w-auto object-contain" />
            <button
              onClick={() => setIsMobileOpen(false)}
              className="p-1 rounded-md text-sidebar-foreground hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="flex-1 pt-5 pb-4 overflow-y-auto">
            <NavList
              entries={entries}
              showExpanded={true}
              onNavigate={() => setIsMobileOpen(false)}
            />
          </nav>

          <div className="p-4 border-t border-white/[0.07] shrink-0">
            <button
              onClick={logout}
              className="w-full sidebar-link text-red-400 hover:bg-red-500/15 hover:text-red-300"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </motion.div>
      </>
    );
  }

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "h-screen fixed top-0 left-0 z-30 flex flex-col overflow-hidden transition-all duration-300 ease-in-out border-r border-white/[0.07] shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)]",
        sidebarWidth
      )}
      style={sidebarStyle}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-white/[0.07] shrink-0">
        <div className="flex items-center min-w-0">
          {isCollapsed && !isHovering ? (
            <img src="/marple_logo.png" alt="Logo" className="h-8 w-8 object-contain rounded-lg" />
          ) : (
            <motion.img
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              src="/marple_logo.png"
              alt="Logo"
              className="h-8 w-auto object-contain max-w-[140px]"
            />
          )}
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded-md text-sidebar-foreground hover:bg-white/10 transition-colors"
        >
          <Menu size={18} />
        </button>
      </div>

      <nav className="flex-1 pt-5 pb-4 overflow-y-auto">
        <NavList entries={entries} showExpanded={showExpanded} />
      </nav>

      <div className="p-4 border-t border-white/[0.07] shrink-0">
        <button
          onClick={logout}
          className={cn(
            "w-full sidebar-link text-red-400 hover:bg-red-500/15 hover:text-red-300",
            !showExpanded ? "justify-center px-2" : ""
          )}
        >
          <LogOut size={18} />
          {showExpanded && <span>Logout</span>}
        </button>
      </div>
    </motion.div>
  );
};

// ── Nav entries per role ──────────────────────────────────────────────────────
function getNavEntries(role: number): NavEntry[] {
  if (role === 1) {
    return [
      { label: "Dashboard", icon: <Home size={18} />, path: "/admin-dashboard" },
      {
        label: "Users & Properties",
        icon: <Users size={18} />,
        children: [
          { label: "Manage Users", icon: <Users size={16} />, path: "/admin-dashboard/manage-users" },
          { label: "Properties", icon: <House size={16} />, path: "/admin-dashboard/landlord-properties" },
        ],
      },
      {
        label: "Finance",
        icon: <CreditCard size={18} />,
        children: [
          { label: "Wallet Management", icon: <CreditCard size={16} />, path: "/admin-dashboard/wallet-management" },
          { label: "Update Transaction", icon: <FileText size={16} />, path: "/admin-dashboard/update-transaction" },
          { label: "Collecto Payments", icon: <Smartphone size={16} />, path: "/admin-dashboard/collecto-payments" },
          { label: "Collecto Withdraw Logs", icon: <FileSearch size={16} />, path: "/admin-dashboard/collecto-withdraw-logs" },
        ],
      },
      {
        label: "Utilities",
        icon: <Zap size={18} />,
        children: [
          { label: "Manage Utility Meters", icon: <Settings size={16} />, path: "/admin-dashboard/manage-utility-meters" },
          { label: "Utility Dashboard", icon: <BarChart3 size={16} />, path: "/admin-dashboard/utility-payment-dashboard" },
          { label: "Add Utility Meter", icon: <Plus size={16} />, path: "/admin-dashboard/add-utility-meter" },
          { label: "Meter Tokens", icon: <Zap size={16} />, path: "/admin-dashboard/meter-tokens" },
        ],
      },
      {
        label: "Logs & Audit",
        icon: <FileSearch size={18} />,
        children: [
          { label: "Audit Trail", icon: <FileText size={16} />, path: "/admin-dashboard/audit-trail" },
          { label: "HTTP Logs", icon: <FileSearch size={16} />, path: "/admin-dashboard/http-logs" },
        ],
      },
      {
        label: "Communications",
        icon: <MessageSquare size={18} />,
        children: [
          { label: "Send SMS", icon: <MessageSquare size={16} />, path: "/admin-dashboard/send-sms" },
          { label: "All Complaints", icon: <MessageSquare size={16} />, path: "/admin-dashboard/all-complaints" },
        ],
      },
      { label: "Reports", icon: <BarChart3 size={18} />, path: "/admin-dashboard/reports" },
      { label: "Settings", icon: <Settings size={18} />, path: "/admin-dashboard/system-settings" },
      { label: "My Profile", icon: <UserCircle size={18} />, path: "/admin-dashboard/my-profile" },
    ];
  }

  if (role === 2) {
    return [
      { label: "Dashboard", icon: <Home size={18} />, path: "/landlord-dashboard" },
      {
        label: "Properties",
        icon: <House size={18} />,
        children: [
          { label: "Properties", icon: <House size={16} />, path: "/landlord-dashboard/properties" },
          { label: "Units / Rooms", icon: <DoorOpen size={16} />, path: "/landlord-dashboard/units" },
        ],
      },
      {
        label: "Tenants",
        icon: <Users size={18} />,
        children: [
          { label: "Manage Tenants", icon: <Users size={16} />, path: "/landlord-dashboard/manage-tenants" },
          { label: "Manage Contracts", icon: <FileText size={16} />, path: "/landlord-dashboard/rental-contracts" },
          { label: "Viewing Requests", icon: <Eye size={16} />, path: "/landlord-dashboard/viewing-requests" },
          { label: "Handle Complaints", icon: <MessageSquare size={16} />, path: "/landlord-dashboard/complaints" },
        ],
      },
      {
        label: "Finance",
        icon: <CreditCard size={18} />,
        children: [
          { label: "Track Payments", icon: <CreditCard size={16} />, path: "/landlord-dashboard/payments" },
          { label: "Invoices", icon: <Receipt size={16} />, path: "/landlord-dashboard/invoices" },
          { label: "Invoice Schedule", icon: <Calendar size={16} />, path: "/landlord-dashboard/invoice-settings" },
          { label: "Expenses", icon: <TrendingDown size={16} />, path: "/landlord-dashboard/expenses" },
        ],
      },
      {
        label: "Utilities",
        icon: <Zap size={18} />,
        children: [
          { label: "Utility Report", icon: <FileText size={16} />, path: "/landlord-dashboard/utility-report" },
          // { label: "Utility Charge Config", icon: <Zap size={16} />, path: "/landlord-dashboard/utility-charge" },
        ],
      },
      { label: "Reports", icon: <BarChart3 size={18} />, path: "/landlord-dashboard/reports" },
      { label: "Send SMS", icon: <MessageSquare size={18} />, path: "/landlord-dashboard/send-sms" },
      { label: "My Profile", icon: <UserCircle size={18} />, path: "/landlord-dashboard/my-profile" },
    ];
  }

  if (role === 3) {
    return [
      { label: "Dashboard", icon: <Home size={18} />, path: "/tenant-dashboard" },
      {
        label: "My Property",
        icon: <House size={18} />,
        children: [
          { label: "Property Details", icon: <House size={16} />, path: "/tenant-dashboard/property-details" },
          { label: "My Contracts", icon: <FileText size={16} />, path: "/tenant-dashboard/tenant-contracts" },
        ],
      },
      {
        label: "Payments",
        icon: <CreditCard size={18} />,
        children: [
          { label: "Make Payment", icon: <CreditCard size={16} />, path: "/tenant-dashboard/make-payment" },
          { label: "Payment History", icon: <FileText size={16} />, path: "/tenant-dashboard/payment-history" },
          { label: "My Invoices", icon: <Receipt size={16} />, path: "/tenant-dashboard/invoices" },
        ],
      },
      {
        label: "Support",
        icon: <MessageSquare size={18} />,
        children: [
          { label: "Submit Complaint", icon: <MessageSquare size={16} />, path: "/tenant-dashboard/submit-complaint" },
          { label: "My Messages", icon: <Inbox size={16} />, path: "/tenant-dashboard/messages" },
          { label: "Send SMS", icon: <MessageSquare size={16} />, path: "/tenant-dashboard/send-sms" },
        ],
      },
      { label: "My Profile", icon: <UserCircle size={18} />, path: "/tenant-dashboard/my-profile" },
    ];
  }

  if (role === 4) {
    return [
      { label: "Utility Dashboard", icon: <Home size={18} />, path: "/utility-dashboard" },
      { label: "Utility Meter", icon: <FileText size={18} />, path: "/utility-dashboard/utility-meter" },
      { label: "Payment Dashboard", icon: <FileText size={18} />, path: "/utility-dashboard/utility-payment-dashboard" },
    ];
  }

  return [];
}

export default Sidebar;
