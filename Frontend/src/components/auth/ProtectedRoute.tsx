import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import PasswordChangeModal from "./PasswordChangeModal";

interface ProtectedRouteProps {
  role?: 1 | 2 | 3;
  fallback?: string;
}

const roleRedirects = {
  1: "/admin-dashboard",
  2: "/landlord-dashboard",
  3: "/tenant-dashboard",
};

const LoadingSpinner = () => (
  <div className="flex h-screen w-full items-center justify-center">
    <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
  </div>
);

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ role, fallback }) => {
  const { isAuthenticated, user, loading, showPasswordModal } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Show password change modal if needed
  if (showPasswordModal && !user?.verified) {
    return <PasswordChangeModalWrapper />;
  }

  if (role && user?.systemRoleId !== role) {
    const redirectPath =
      fallback ||
      roleRedirects[user?.systemRoleId as keyof typeof roleRedirects] ||
      "/";
    return <Navigate to={redirectPath} replace />;
  }

  return <Outlet />;
};

// Helper component to render modal in route context
const PasswordChangeModalWrapper = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSuccess = () => {
    // Navigate based on user role after successful password change
    switch (user?.systemRoleId) {
      case 1:
        navigate("/admin-dashboard");
        break;
      case 2:
        navigate("/landlord-dashboard");
        break;
      case 3:
        navigate("/tenant-dashboard");
        break;
      default:
        navigate("/");
    }
  };

  return (
    <>
      <PasswordChangeModal onSuccess={handleSuccess} />
      {/* Blank screen behind modal */}
      <div className="fixed inset-0 bg-white/80 z-40" />
    </>
  );
};

export default ProtectedRoute;
