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
  ListOrdered,
  Plus,
  X,
  FileSearch,
  Wrench,
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
  children?: NavItem[];
  group?: string;
}

interface NavEntryProps {
  item: NavItem;
  compact: boolean;
  onNavigate?: () => void;
}

const NavEntry: React.FC<NavEntryProps> = ({ item, compact, onNavigate }) => {
  const location = useLocation();
  const children = item.children;
  const hasActiveChild = !!children?.some((child) =>
    location.pathname.startsWith(child.path)
  );
  const [open, setOpen] = useState(hasActiveChild);

  if (!children) {
    return (
      <NavLink
        to={item.path}
        end
        onClick={onNavigate}
        className={({ isActive }) =>
          cn("sidebar-link", isActive ? "active" : "", compact ? "justify-center px-2" : "")
        }
      >
        <span>{item.icon}</span>
        {!compact && <span className="flex-1">{item.label}</span>}
        {!compact && item.hasSubItems && <ChevronRight size={16} />}
      </NavLink>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn("w-full sidebar-link", compact ? "justify-center px-2" : "")}
      >
        <span>{item.icon}</span>
        {!compact && <span className="flex-1 text-left">{item.label}</span>}
        {!compact && (
          <ChevronRight
            size={16}
            className={cn("transition-transform", open ? "rotate-90" : "")}
          />
        )}
      </button>
      {open && (
        <ul className={cn("mt-1 space-y-1", compact ? "" : "pl-4")}>
          {children.map((child) => (
            <li key={child.path}>
              <NavEntry item={child} compact={compact} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

interface NavGroup {
  title?: string;
  items: NavItem[];
}

const groupNavItems = (items: NavItem[]): NavGroup[] => {
  const groups: NavGroup[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (item.group && last?.title === item.group) {
      last.items.push(item);
    } else {
      groups.push({ title: item.group, items: [item] });
    }
  }
  return groups;
};

interface NavGroupSectionProps {
  group: NavGroup;
  compact: boolean;
  onNavigate?: () => void;
}

const NavGroupSection: React.FC<NavGroupSectionProps> = ({ group, compact, onNavigate }) => {
  const location = useLocation();
  const { title, items } = group;

  const isItemActive = (item: NavItem): boolean => {
    if (item.children) {
      return item.children.some((child) => location.pathname.startsWith(child.path));
    }
    if (!item.path) return false;
    return (
      location.pathname === item.path ||
      (!item.path.endsWith("-dashboard") && location.pathname.startsWith(item.path))
    );
  };

  const hasActive = items.some(isItemActive);
  const [open, setOpen] = useState(hasActive);

  const renderItem = (item: NavItem, idx: number) => (
    <motion.li
      key={item.label}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.05 }}
    >
      <NavEntry item={item} compact={compact} onNavigate={onNavigate} />
    </motion.li>
  );

  // Ungrouped items (roles without sections) render as a flat list.
  // In the collapsed sidebar there is no room for section labels, so show
  // every item as an icon instead of hiding groups behind a header.
  if (!title || compact) {
    return <>{items.map(renderItem)}</>;
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:bg-sidebar-accent transition-colors"
      >
        <span className="flex-1 text-left">{title}</span>
        <ChevronRight
          size={14}
          className={cn("transition-transform", open ? "rotate-90" : "")}
        />
      </button>
      {open && <ul className="mt-1 space-y-1">{items.map(renderItem)}</ul>}
    </li>
  );
};

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
          className="fixed top-0 left-0 z-50 h-screen w-4/5 max-w-xs bg-sidebar/95 border-r border-sidebar-border shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)] backdrop-blur overflow-y-auto"
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
              {groupNavItems(navItems).map((group) => (
                <NavGroupSection
                  key={group.title ?? "ungrouped"}
                  group={group}
                  compact={false}
                  onNavigate={() => setIsMobileOpen(false)}
                />
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
        "h-screen fixed top-0 left-0 z-30 overflow-hidden transition-all duration-300 ease-in-out",
        sidebarWidth,
        "bg-sidebar/92 backdrop-blur flex flex-col border-r border-sidebar-border shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)]"
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border/80">
        <div className="flex items-center">
          <div className="h-9 w-9 rounded-2xl bg-primary flex items-center justify-center shadow-[0_16px_32px_-18px_rgba(37,99,235,0.9)]">
            <House className="text-white" size={16} />
          </div>
          {(!isCollapsed || isHovering) && (
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="ml-3 font-semibold text-lg"
            >
              Nyumba Yo
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
        <ul className="space-y-1.5 px-3">
          {groupNavItems(navItems).map((group) => (
            <NavGroupSection
              key={group.title ?? "ungrouped"}
              group={group}
              compact={isCollapsed && !isHovering}
            />
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
        group: "Overview",
      },
      {
        label: "Manage Users",
        icon: <Users size={18} />,
        path: "/admin-dashboard/manage-users",
        hasSubItems: false,
        group: "Properties & Users",
      },
      {
        label: "Properties",
        icon: <House size={18} />,
        path: "/admin-dashboard/landlord-properties",
        hasSubItems: false,
        group: "Properties & Users",
      },
      {
        label: "Reports",
        icon: <BarChart3 size={18} />,
        path: "",
        group: "Reports",
        children: [
          {
            label: "General Reports",
            icon: <FileText size={18} />,
            path: "/admin-dashboard/reports",
          },
          {
            label: "Utility Statistics",
            icon: <BarChart3 size={18} />,
            path: "/admin-dashboard/utility-payment-dashboard",
          },
          {
            label: "Monthly Fees Report",
            icon: <FileText size={18} />,
            path: "/admin-dashboard/meter-fees-report",
          },
          {
            label: "Accounting",
            icon: <BarChart3 size={18} />,
            path: "/admin-dashboard/accounting",
          },
          {
            label: "Financial Reports",
            icon: <BarChart3 size={18} />,
            path: "/admin-dashboard/financial-reports",
          },
        ],
      },
      {
        label: "Utility Account Management",
        icon: <Users size={18} />,
        path: "/admin-dashboard/utility-accounts",
        group: "Utilities",
      },
      {
        label: "Manage Utility Meters",
        icon: <Settings size={18} />,
        path: "/admin-dashboard/manage-utility-meters",
        group: "Utilities",
      },
      {
        label: "Add Utility Meter",
        icon: <Plus size={18} />,
        path: "/admin-dashboard/add-utility-meter",
        group: "Utilities",
      },
      {
        label: "Meter Monthly Fees",
        icon: <Settings size={18} />,
        path: "/admin-dashboard/utility-meter-fees",
        group: "Utilities",
      },
      {
        label: "Wallet Management",
        icon: <CreditCard size={18} />,
        path: "/admin-dashboard/wallet-management",
        group: "Payments & Wallets",
      },
      {
        label: "Wallet Transactions",
        icon: <ListOrdered size={18} />,
        path: "/admin-dashboard/wallet-transactions",
        group: "Payments & Wallets",
      },
      {
        label: "Bill Payments",
        icon: <FileText size={18} />,
        path: "/admin-dashboard/bill-payments",
        group: "Payments & Wallets",
      },
      {
        label: "Update Transaction",
        icon: <FileText size={18} />,
        path: "/admin-dashboard/update-transaction",
        group: "Payments & Wallets",
      },
      {
        label: "Collecto Withdraw Logs",
        icon: <FileSearch size={18} />,
        path: "/admin-dashboard/collecto-withdraw-logs",
        group: "Payments & Wallets",
      },
      {
        label: "Settings",
        icon: <Settings size={18} />,
        path: "/admin-dashboard/system-settings",
        hasSubItems: false,
        group: "System",
      },
      {
        label: "Send SMS",
        icon: <MessageSquare size={18} />,
        path: "/admin-dashboard/send-sms",
        group: "System",
      },
      {
        label: "Audit Trail",
        icon: <FileText size={18} />,
        path: "/admin-dashboard/audit-trail",
        group: "System",
      },
      {
        label: "HTTP Logs",
        icon: <FileSearch size={18} />,
        path: "/admin-dashboard/http-logs",
        group: "System",
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
        label: "Maintenance",
        icon: <Wrench size={18} />,
        path: "/landlord-dashboard/maintenance",
      },
      {
        label: "Expenses",
        icon: <CreditCard size={18} />,
        path: "/landlord-dashboard/expenses",
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
      {
        label: "Send SMS",
        icon: <MessageSquare size={18} />,
        path: "/landlord-dashboard/send-sms",
      },
      {
        label: "Reports",
        icon: <BarChart3 size={18} />,
        path: "",
        children: [
          {
            label: "Utility Report",
            icon: <FileText size={18} />,
            path: "/landlord-dashboard/utility-report",
          },
          {
            label: "Income vs Expense",
            icon: <BarChart3 size={18} />,
            path: "/landlord-dashboard/profit-loss",
          },
        ],
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
        label: "Submit Complaint",
        icon: <MessageSquare size={18} />,
        path: "/tenant-dashboard/submit-complaint",
      },
      {
        label: "Request Maintenance",
        icon: <Wrench size={18} />,
        path: "/tenant-dashboard/request-maintenance",
      },
      {
        label: "Send SMS",
        icon: <MessageSquare size={18} />,
        path: "/tenant-dashboard/send-sms",
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
        label: "Reports",
        icon: <BarChart3 size={18} />,
        path: "",
        children: [
          {
            label: "Payment Statistics",
            icon: <FileText size={18} />,
            path: "/utility-dashboard/utility-payment-dashboard",
          },
          {
            label: "Monthly Fees Report",
            icon: <FileText size={18} />,
            path: "/utility-dashboard/meter-fees-report",
          },
        ],
      },
    ];
  }

  // Default navigation items
  return [];
}

export default Sidebar;
