import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ScrollToTop } from "./components/common/ScrollToTop";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AppLayout from "./layout/AppLayout";

// Auth Pages
import SignIn from "./pages/AuthPages/SignIn";
import NotFound from "./pages/NotFound";

// Dashboard Pages;
import LandlordDashboard from "./pages/Dashboard/LandlordDashboard";
import TenantDashboard from "./pages/Dashboard/TenantDashboard";

// Admin Pages
import RegisterLandlord from "./pages/Admin/RegisterLandlord";
import RegisterProperty from "./pages/Admin/RegisterProperty";
import LandlordProperties from "./pages/Admin/LandlordProperties";
import ManageUsers from "./pages/Admin/ManageUsers";
import Reports from "./pages/Admin/Reports";
import SystemSettings from "./pages/Admin/SystemSettings";

// Tenant Pages
import PropertyDetails from "./pages/Tenant/PropertyDetails";
import AvailableProperties from "./pages/Tenant/AvailableProperties";
import MakePayment from "./pages/Tenant/MakePayment";
import PaymentHistory from "./pages/Tenant/PaymentHistory";
import SubmitComplaint from "./pages/Tenant/SubmitComplaint";
import CashTransactions from "./pages/Tenant/CashTransaction";

// Landlord Pages
import RegisterTenants from "./pages/Landlord/RegisterTenants";
import ManageTenants from "./pages/Landlord/ManageTenants";
import RentalContracts from "./pages/Landlord/RentalContracts";
import HandleComplaints from "./pages/Landlord/HandleComplaints";
import TrackPayments from "./pages/Landlord/TrackPayments";
import Index from "./pages/Index";
import ForgotPassword from "./components/auth/ForgotPassword";
import ResetPassword from "./components/auth/ResetPassword";
import Transactions from "./pages/Admin/Transactions";
import SendSMSForm from "./pages/SendSMSForm";
import Properties from "./pages/Landlord/LandloardProperties";
import AdminDashboard from "./pages/Dashboard/AdminDashboard";
import UtilityDashboard from "./pages/Utility/Dashboard";
import UtilityMeter from "./pages/Utility/UtilityMeter";
import MakeUtilityPayment from "./pages/MakeutilityPayment";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <HashRouter>
          <ScrollToTop />
          <Routes>
            {/* Toasts */}
            {/* Home/Auth Routes */}
            <Route path="/" element={<SignIn />} />
            <Route path="/index" element={<Index />} />
            <Route
              path="/make-utility-payment"
              element={<MakeUtilityPayment />}
            />

            {/* Admin Routes */}
            <Route element={<ProtectedRoute role={1} />}>
              <Route path="/admin-dashboard" element={<AppLayout role={1} />}>
                <Route index element={<AdminDashboard />} />
                <Route
                  path="register-landlord"
                  element={<RegisterLandlord />}
                />
                <Route
                  path="register-property"
                  element={<RegisterProperty />}
                />
                <Route
                  path="landlord-properties"
                  element={<LandlordProperties />}
                />
                <Route path="manage-users" element={<ManageUsers />} />
                <Route path="reports" element={<Reports />} />
                <Route path="transactions" element={<Transactions />} />
                <Route path="system-settings" element={<SystemSettings />} />
                <Route path="send-sms" element={<SendSMSForm />} />
              </Route>
            </Route>

            {/* Landlord Routes */}
            <Route element={<ProtectedRoute role={2} />}>
              <Route
                path="/landlord-dashboard"
                element={<AppLayout role={2} />}
              >
                <Route index element={<LandlordDashboard />} />
                <Route path="register-tenants" element={<RegisterTenants />} />
                <Route path="manage-tenants" element={<ManageTenants />} />
                <Route path="rental-contracts" element={<RentalContracts />} />
                <Route path="complaints" element={<HandleComplaints />} />
                <Route path="payments" element={<TrackPayments />} />
                <Route path="properties" element={<Properties />} />
                <Route path="send-sms" element={<SendSMSForm />} />
              </Route>
            </Route>

            {/* Tenant Routes */}
            <Route element={<ProtectedRoute role={3} />}>
              <Route path="/tenant-dashboard" element={<AppLayout role={3} />}>
                <Route index element={<TenantDashboard />} />
                <Route path="property-details" element={<PropertyDetails />} />
                <Route
                  path="available-properties"
                  element={<AvailableProperties />}
                />
                <Route path="make-payment" element={<MakePayment />} />
                <Route path="payment-history" element={<PaymentHistory />} />
                <Route path="submit-complaint" element={<SubmitComplaint />} />
                <Route path="send-sms" element={<SendSMSForm />} />
              </Route>
            </Route>

            {/* Tenant Routes */}
            <Route element={<ProtectedRoute role={4} />}>
              <Route path="/utility-dashboard" element={<AppLayout role={4} />}>
                <Route index element={<UtilityDashboard />} />
                <Route path="utility-meter" element={<UtilityMeter />} />
              </Route>
            </Route>

            {/* Fallback Route */}
            <Route path="*" element={<NotFound />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Routes>
        </HashRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
