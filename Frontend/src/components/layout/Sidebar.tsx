import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { motion } from "framer-motion";
import { useIsMobile } from "../../hooks/use-mobile";
import {
  Home,
  Users,
  FileText,
  Settings,
  BarChart3,
  Menu,
  LogOut,
  ChevronRight,
  House,
  MessageSquare,
  CreditCard,
  Plus,
  X,
  FileSearch,
  DoorOpen,
  Receipt,
  TrendingDown,
  UserCircle,
  Zap,
  Smartphone,
  Inbox,
  Eye,
} from "lucide-react";
import { cn } from "../../lib/utils";

interface SidebarProps {
  role: number;
}

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  hasSubItems?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ role }) => {
  const { logout } = useAuth();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const isMobile = useIsMobile();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navItems = getNavItems(role);

  const getActiveStyle = (path: string) => {
    return (
      location.pathname === path ||
      (path !== `/${role}-dashboard` && location.pathname.startsWith(path))
    );
  };

  const sidebarWidth = isCollapsed && !isHovering ? "w-20" : "w-64";

  // For mobile: show a full-screen sidebar when menu is open
  if (isMobile) {
    return (
      <>
        {/* Mobile trigger button */}
        <button
          onClick={() => setIsMobileOpen(true)}
          className="fixed top-4 left-4 z-30 p-2 rounded-md bg-primary text-white shadow-md"
        >
          <Menu size={20} />
        </button>

        {/* Mobile sidebar overlay */}
        {isMobileOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsMobileOpen(false)}
          ></div>
        )}

        {/* Mobile sidebar */}
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: isMobileOpen ? 0 : "-100%" }}
          transition={{ duration: 0.3 }}
          className="fixed top-0 left-0 z-50 h-screen w-4/5 max-w-xs bg-sidebar border-r border-sidebar-border shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)] overflow-y-auto"
        >
          <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
            <div className="flex items-center">
              <img src="/marple_logo.png" alt="Logo" className="h-8 w-auto object-contain" />
            </div>
            <button
              onClick={() => setIsMobileOpen(false)}
              className="p-1 rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="flex-1 pt-5 pb-4 overflow-y-auto">
            <ul className="space-y-1 px-3">
              {navItems.map((item, idx) => (
                <motion.li
                  key={item.path}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <NavLink
                    to={item.path}
                    end
                    className={({ isActive }) =>
                      cn("sidebar-link", isActive ? "active" : "")
                    }
                    onClick={() => setIsMobileOpen(false)}
                  >
                    <span>{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {item.hasSubItems && <ChevronRight size={16} />}
                  </NavLink>
                </motion.li>
              ))}
            </ul>
          </nav>

          <div className="p-4 border-t border-sidebar-border">
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

  // Desktop sidebar
  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "h-screen fixed top-0 left-0 z-30 overflow-hidden transition-all duration-300 ease-in-out",
        sidebarWidth,
        "bg-sidebar flex flex-col border-r border-sidebar-border shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)]"
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border/80">
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
          className="p-1 rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <Menu size={18} />
        </button>
      </div>

      <nav className="flex-1 pt-5 pb-4 overflow-y-auto">
        <ul className="space-y-1.5 px-3">
          {navItems.map((item, idx) => (
            <motion.li
              key={item.path}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <NavLink
                to={item.path}
                end
                className={({ isActive }) =>
                  cn(
                    "sidebar-link",
                    isActive ? "active" : "",
                    isCollapsed && !isHovering ? "justify-center px-2" : ""
                  )
                }
              >
                <span>{item.icon}</span>
                {(!isCollapsed || isHovering) && (
                  <span className="flex-1">{item.label}</span>
                )}
                {(!isCollapsed || isHovering) && item.hasSubItems && (
                  <ChevronRight size={16} />
                )}
              </NavLink>
            </motion.li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <button
          onClick={logout}
          className={cn(
            "w-full sidebar-link text-red-500 hover:bg-red-50 hover:text-red-600",
            isCollapsed && !isHovering ? "justify-center px-2" : ""
          )}
        >
          <LogOut size={18} />
          {(!isCollapsed || isHovering) && <span>Logout</span>}
        </button>
      </div>
    </motion.div>
  );
};

function getNavItems(role: number): NavItem[] {
  // Admin navigation items
  if (role === 1) {
    return [
      {
        label: "Dashboard",
        icon: <Home size={18} />,
        path: "/admin-dashboard",
      },
      // {
      //   label: "Landlords",
      //   icon: <Users size={18} />,
      //   path: "/admin-dashboard/register-landlord",
      //   hasSubItems: false,
      // },
      // {
      //   label: "Properties",
      //   icon: <House size={18} />,
      //   path: "/admin-dashboard/register-property",
      //   hasSubItems: false,
      // },
      {
        label: "Manage Users",
        icon: <Users size={18} />,
        path: "/admin-dashboard/manage-users",
        hasSubItems: false,
      },
      {
        label: "Properties",
        icon: <House size={18} />,
        path: "/admin-dashboard/landlord-properties",
        hasSubItems: false,
      },
      {
        label: "Reports",
        icon: <BarChart3 size={18} />,
        path: "/admin-dashboard/reports",
        hasSubItems: false,
      },
      {
        label: "Settings",
        icon: <Settings size={18} />,
        path: "/admin-dashboard/system-settings",
        hasSubItems: false,
      },
      {
        label: "Send SMS",
        icon: <MessageSquare size={18} />,
        path: "/admin-dashboard/send-sms",
      },
      {
        label: "Manage Utility Meters",
        icon: <Settings size={18} />,
        path: "/admin-dashboard/manage-utility-meters",
      },
      {
        label: "Utility Dashboard",
        icon: <BarChart3 size={18} />,
        path: "/admin-dashboard/utility-payment-dashboard",
      },
      {
        label: "Wallet Management",
        icon: <CreditCard size={18} />,
        path: "/admin-dashboard/wallet-management",
      },
      {
        label: "Update Transaction",
        icon: <FileText size={18} />,
        path: "/admin-dashboard/update-transaction",
      },
      {
        label: "Audit Trail",
        icon: <FileText size={18} />,
        path: "/admin-dashboard/audit-trail",
      },
      {
        label: "Collecto Withdraw Logs",
        icon: <FileSearch size={18} />,
        path: "/admin-dashboard/collecto-withdraw-logs",
      },
      {
        label: "HTTP Logs",
        icon: <FileSearch size={18} />,
        path: "/admin-dashboard/http-logs",
      },
      {
        label: "Add Utility Meter",
        icon: <Plus size={18} />,
        path: "/admin-dashboard/add-utility-meter",
      },
      {
        label: "All Complaints",
        icon: <MessageSquare size={18} />,
        path: "/admin-dashboard/all-complaints",
      },
      {
        label: "Collecto Payments",
        icon: <Smartphone size={18} />,
        path: "/admin-dashboard/collecto-payments",
      },
      {
        label: "Meter Tokens",
        icon: <Zap size={18} />,
        path: "/admin-dashboard/meter-tokens",
      },
    ];
  }

  // Landlord navigation items
  if (role === 2) {
    return [
      {
        label: "Dashboard",
        icon: <Home size={18} />,
        path: "/landlord-dashboard",
      },
      // {
      //   label: "Register Tenants",
      //   icon: <PlusCircle size={18} />,
      //   path: "/landlord-dashboard/register-tenants",
      // },
      {
        label: "Properties",
        icon: <House size={18} />,
        path: "/landlord-dashboard/properties",
        hasSubItems: false,
      },
      {
        label: "Manage Contracts",
        icon: <FileText size={18} />,
        path: "/landlord-dashboard/rental-contracts",
      },
      {
        label: "Handle Complaints",
        icon: <MessageSquare size={18} />,
        path: "/landlord-dashboard/complaints",
      },
      {
        label: "Manage Tenants",
        icon: <Users size={18} />,
        path: "/landlord-dashboard/manage-tenants",
      },
      {
        label: "Units / Rooms",
        icon: <DoorOpen size={18} />,
        path: "/landlord-dashboard/units",
      },
      {
        label: "Invoices",
        icon: <Receipt size={18} />,
        path: "/landlord-dashboard/invoices",
      },
      {
        label: "Track Payments",
        icon: <CreditCard size={18} />,
        path: "/landlord-dashboard/payments",
      },
      {
        label: "Expenses",
        icon: <TrendingDown size={18} />,
        path: "/landlord-dashboard/expenses",
      },
      {
        label: "Reports",
        icon: <BarChart3 size={18} />,
        path: "/landlord-dashboard/reports",
      },
      {
        label: "Send SMS",
        icon: <MessageSquare size={18} />,
        path: "/landlord-dashboard/send-sms",
      },
      {
        label: "Utility Report",
        icon: <FileText size={18} />,
        path: "/landlord-dashboard/utility-report",
      },
      {
        label: "Utility Charge Config",
        icon: <Zap size={18} />,
        path: "/landlord-dashboard/utility-charge",
      },
      {
        label: "Viewing Requests",
        icon: <Eye size={18} />,
        path: "/landlord-dashboard/viewing-requests",
      },
    ];
  }

  // Tenant navigation items
  if (role === 3) {
    return [
      {
        label: "Dashboard",
        icon: <Home size={18} />,
        path: "/tenant-dashboard",
      },
      {
        label: "Property Details",
        icon: <House size={18} />,
        path: "/tenant-dashboard/property-details",
      },
      {
        label: "Make Payment",
        icon: <CreditCard size={18} />,
        path: "/tenant-dashboard/make-payment",
      },
       {
         label: "Payment History",
         icon: <FileText size={18} />,
         path: "/tenant-dashboard/payment-history",
       },
       {
         label: "My Contracts",
         icon: <FileText size={18} />,
         path: "/tenant-dashboard/tenant-contracts",
       },
       {
         label: "Submit Complaint",
         icon: <MessageSquare size={18} />,
         path: "/tenant-dashboard/submit-complaint",
       },
      {
        label: "My Invoices",
        icon: <Receipt size={18} />,
        path: "/tenant-dashboard/invoices",
      },
      {
        label: "My Profile",
        icon: <UserCircle size={18} />,
        path: "/tenant-dashboard/my-profile",
      },
      {
        label: "Send SMS",
        icon: <MessageSquare size={18} />,
        path: "/tenant-dashboard/send-sms",
      },
      {
        label: "My Messages",
        icon: <Inbox size={18} />,
        path: "/tenant-dashboard/messages",
      },
    ];
  }

  // Utility navigation items
  if (role === 4) {
    return [
      {
        label: "Utility Dashboard",
        icon: <Home size={18} />,
        path: "/utility-dashboard",
      },
      {
        label: "Utility Meter",
        icon: <FileText size={18} />,
        path: "/utility-dashboard/utility-meter",
      },
      {
        label: "Payment Dashboard",
        icon: <FileText size={18} />,
        path: "/utility-dashboard/utility-payment-dashboard",
      }
    ];
  }

  // Default navigation items
  return [];
}

export default Sidebar;
