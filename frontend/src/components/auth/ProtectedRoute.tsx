import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: UserRole[];
  redirectTo?: string;
}

export const ProtectedRoute = ({ 
  children, 
  requiredRoles = [], 
  redirectTo = '/auth' 
}: ProtectedRouteProps) => {
  const { user, userRoles, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    const currentPath = `${location.pathname}${location.search}${location.hash}`;
    const [basePath, baseQuery] = redirectTo.split('?');
    const params = new URLSearchParams(baseQuery || '');
    params.set('redirectTo', currentPath);
    const queryString = params.toString();
    const destination = queryString ? `${basePath}?${queryString}` : basePath;

    return <Navigate to={destination} replace />;
  }

  // Check if user has any of the required roles
  if (requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive mb-4">Accès refusé</h1>
            <p className="text-muted-foreground mb-4">
              Vous n'avez pas les permissions nécessaires pour accéder à cette page.
            </p>
            <div className="text-sm text-muted-foreground">
              <p>Rôles requis: {requiredRoles.join(', ')}</p>
              <p>Vos rôles: {userRoles.length > 0 ? userRoles.join(', ') : 'Aucun'}</p>
            </div>
          </div>
        </div>
      );
    }
  }


  return <>{children}</>;
};
