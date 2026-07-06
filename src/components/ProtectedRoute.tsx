import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredAccountType?: string;
  requireSuperAdmin?: boolean;
}

const ProtectedRoute = ({ children, requiredAccountType, requireSuperAdmin }: ProtectedRouteProps) => {
  const { user, profile, loading, isSuperAdmin } = useAuth();
  const { isImpersonating, impersonatedUser } = useImpersonation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background font-cairo">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">جارٍ التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Super admin requiring routes
  if (requireSuperAdmin && !isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  // When impersonating, allow super admin to access any dashboard
  if (isImpersonating && isSuperAdmin && impersonatedUser) {
    if (requiredAccountType && impersonatedUser.account_type !== requiredAccountType) {
      return <Navigate to="/" replace />;
    }
    return <>{children}</>;
  }

  // Normal account type check
  if (requiredAccountType && profile?.account_type !== requiredAccountType && !isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
