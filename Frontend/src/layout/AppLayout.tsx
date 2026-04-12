import { Outlet } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";
import { useIsMobile } from "../hooks/use-mobile";

interface AppLayoutProps {
  role: number;
}

const AppLayout: React.FC<AppLayoutProps> = ({ role }) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // Use the user's role if available, otherwise use the provided role
  const effectiveRole = user?.systemRoleId || role;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar role={effectiveRole} />

      <div
        className={`flex min-w-0 flex-1 flex-col ${isMobile ? "pl-0" : "pl-64"} w-full`}
      >
        <Header />

        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex-1 overflow-auto"
        >
          <div
            className={`mx-auto w-full p-4 sm:p-5 md:p-6 xl:p-8 ${
              isMobile ? "max-w-full" : "max-w-[1680px]"
            }`}
          >
            <Outlet />
          </div>
        </motion.main>
      </div>
    </div>
  );
};

export default AppLayout;
