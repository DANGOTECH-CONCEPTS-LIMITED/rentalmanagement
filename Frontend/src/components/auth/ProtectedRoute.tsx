
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  role?: 'admin' | 'landlord' | 'tenant';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ role }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // If role is specified and doesn't match, redirect to appropriate dashboard
  if (role && user?.role !== role) {
    switch (user?.role) {
      case 'admin':
        return <Navigate to="/admin-dashboard" replace />;
      case 'landlord':
        return <Navigate to="/landlord-dashboard" replace />;
      case 'tenant':
        return <Navigate to="/tenant-dashboard" replace />;
      default:
        return <Navigate to="/" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
