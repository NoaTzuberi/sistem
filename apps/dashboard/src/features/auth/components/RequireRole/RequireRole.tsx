import { sharedCopy, useCopy } from '@sistem/shared';
import type { UserRole } from '@sistem/types';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../../../services/auth/AuthContext';
import { ROUTES } from '../../../../app/config/routes';
import { dashboardHome, hasRole } from '../../data/roles';
import './RequireRole.css';

interface RequireRoleProps {
  role: UserRole;
}

/** Client-side gate only: every /api/coach and /api/admin route checks the role on the server. */
export function RequireRole({ role }: RequireRoleProps) {
  const shared = useCopy(sharedCopy);
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <p className="require-role-loading">{shared.common.loading}</p>;
  }

  if (!hasRole(user, role)) {
    // Signed in with the other dashboard role (an admin-only account, or a coach on the admin page) → her own start.
    const home = dashboardHome(user, { home: ROUTES.HOME, admin: ROUTES.ADMIN_COACHES });
    return <Navigate to={home ?? ROUTES.LOGIN} replace />;
  }

  return <Outlet />;
}
