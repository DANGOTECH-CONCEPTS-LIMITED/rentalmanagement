
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ScrollToTop } from "./components/common/ScrollToTop";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AppLayout from "./layout/AppLayout";

// Auth Pages
import SignIn from "./pages/AuthPages/SignIn";
import NotFound from "./pages/NotFound";

// Dashboard Pages
import AdminDashboard from "./pages/Dashboard/AdminDashboard";
import LandlordDashboard from "./pages/Dashboard/LandlordDashboard";
import TenantDashboard from "./pages/Dashboard/TenantDashboard";

// Admin Pages
import RegisterLandlord from "./pages/Admin/RegisterLandlord";
import RegisterProperty from "./pages/Admin/RegisterProperty";
import ManageUsers from "./pages/Admin/ManageUsers";
import LandlordProperties from "./pages/Admin/LandlordProperties";  
import Reports from "./pages/Admin/Reports";
import SystemSettings from "./pages/Admin/SystemSettings";

// Tenant Pages
import PropertyDetails from "./pages/Tenant/PropertyDetails";
import MakePayment from "./pages/Tenant/MakePayment";
import PaymentHistory from "./pages/Tenant/PaymentHistory";
import SubmitComplaint from "./pages/Tenant/SubmitComplaint";

// Landlord Pages
import RegisterTenants from "./pages/Landlord/RegisterTenants";
import RentalContracts from "./pages/Landlord/RentalContracts";
import HandleComplaints from "./pages/Landlord/HandleComplaints";
import ManageTenants from "./pages/Landlord/ManageTenants";
import TrackPayments from "./pages/Landlord/TrackPayments";
import Index from "./pages/Index";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            {/* Home/Auth Routes */}
            <Route path="/" element={<SignIn />} />
            <Route path="/index" element={<Index />} />

            {/* Admin Routes */}
            <Route element={<ProtectedRoute role="admin" />}>
              <Route path="/admin-dashboard" element={<AppLayout role="admin" />}>
                <Route index element={<AdminDashboard />} />
                <Route path="register-landlord" element={<RegisterLandlord />} />
                <Route path="register-property" element={<RegisterProperty />} />
                <Route path="manage-users" element={<ManageUsers />} />
                <Route path="landlord-properties" element={<LandlordProperties />} />
                <Route path="reports" element={<Reports />} />
                <Route path="system-settings" element={<SystemSettings />} />
              </Route>
            </Route>

            {/* Landlord Routes */}
            <Route element={<ProtectedRoute role="landlord" />}>
              <Route path="/landlord-dashboard" element={<AppLayout role="landlord" />}>
                <Route index element={<LandlordDashboard />} />
                <Route path="register-tenants" element={<RegisterTenants />} />
                <Route path="rental-contracts" element={<RentalContracts />} />
                <Route path="complaints" element={<HandleComplaints />} />
                <Route path="manage-tenants" element={<ManageTenants />} />
                <Route path="payments" element={<TrackPayments />} />
              </Route>
            </Route>

            {/* Tenant Routes */}
            <Route element={<ProtectedRoute role="tenant" />}>
              <Route path="/tenant-dashboard" element={<AppLayout role="tenant" />}>
                <Route index element={<TenantDashboard />} />
                <Route path="property-details" element={<PropertyDetails />} />
                <Route path="make-payment" element={<MakePayment />} />
                <Route path="payment-history" element={<PaymentHistory />} />
                <Route path="submit-complaint" element={<SubmitComplaint />} />
              </Route>
            </Route>

            {/* Fallback Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
