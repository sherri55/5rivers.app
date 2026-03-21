import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/auth';
import { PageSpinner } from '@/components/ui/Spinner';

// ============================================
// ProtectedRoute — redirects to /login if
// the user is not authenticated.
// ============================================

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <PageSpinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
