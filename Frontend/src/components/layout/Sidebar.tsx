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
  Calendar,
  User,
  Menu,
  LogOut,
  ChevronRight,
  House,
  MessageSquare,
  PlusCircle,
  CreditCard,
  Clipboard,
  ClipboardCheck,
  X,
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
          className="fixed top-0 left-0 z-50 h-screen w-4/5 max-w-xs bg-sidebar border-r border-sidebar-border overflow-y-auto"
        >
          <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                <House className="text-white" size={16} />
              </div>
              <h1 className="ml-3 font-semibold text-lg">Property Hub</h1>
            </div>
            <button
              onClick={() => setIsMobileOpen(false)}
              className="p-1 rounded-md hover:bg-sidebar-accent transition-colors"
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
              className="w-full sidebar-link text-red-500 hover:bg-red-50 hover:text-red-600"
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
        "h-screen fixed top-0 left-0 z-30 shadow-sm overflow-hidden transition-all duration-300 ease-in-out",
        sidebarWidth,
        "bg-sidebar flex flex-col border-r border-sidebar-border"
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
            <House className="text-white" size={16} />
          </div>
          {(!isCollapsed || isHovering) && (
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="ml-3 font-semibold text-lg"
            >
              RENTAL HUB
            </motion.h1>
          )}
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded-md hover:bg-sidebar-accent transition-colors"
        >
          <Menu size={18} />
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
      {
        label: "Landlords",
        icon: <Users size={18} />,
        path: "/admin-dashboard/register-landlord",
        hasSubItems: false,
      },
      {
        label: "Properties",
        icon: <House size={18} />,
        path: "/admin-dashboard/register-property",
        hasSubItems: false,
      },
      {
        label: "Manage Users",
        icon: <User size={18} />,
        path: "/admin-dashboard/manage-users",
        hasSubItems: false,
      },
      {
        label: "Available Properties",
        icon: <Clipboard size={18} />,
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
      {
        label: "Register Tenants",
        icon: <PlusCircle size={18} />,
        path: "/landlord-dashboard/register-tenants",
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
        label: "Track Payments",
        icon: <CreditCard size={18} />,
        path: "/landlord-dashboard/payments",
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
        label: "Cash Transactions",
        icon: <CreditCard size={18} />,
        path: "/tenant-dashboard/cash-transactions",
      },
      {
        label: "Payment History",
        icon: <FileText size={18} />,
        path: "/tenant-dashboard/payment-history",
      },
      {
        label: "Submit Complaint",
        icon: <MessageSquare size={18} />,
        path: "/tenant-dashboard/submit-complaint",
      },
    ];
  }

  // Default navigation items
  return [];
}

export default Sidebar;
