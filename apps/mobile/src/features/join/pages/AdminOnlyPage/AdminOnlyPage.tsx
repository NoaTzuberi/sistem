import { useNavigate } from 'react-router-dom';
import { useCopy } from '@sistem/shared';
import { ROUTES } from '../../../../app/config/routes';
import { useAuth } from '../../../../services/auth/AuthContext';
import { AuthScreen } from '../../../auth/components/AuthScreen/AuthScreen';
import { AuthButton } from '../../../auth/components/AuthButton/AuthButton';
import { CoachDashboardLink } from '../../../auth/components/CoachDashboardLink/CoachDashboardLink';
import { joinCopy } from '../../copy';
import './AdminOnlyPage.css';

/** An admin account without a coach role: the app has nothing for her — the dashboard does. */
export function AdminOnlyPage() {
  const copy = useCopy(joinCopy);
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate(ROUTES.LOGIN, { replace: true });
  }

  return (
    <AuthScreen title={copy.adminOnlyTitle} footer={<CoachDashboardLink />}>
      <p className="admin-only-text">{copy.adminOnlyText}</p>
      <AuthButton variant="soft" onClick={handleLogout}>
        {copy.logout}
      </AuthButton>
    </AuthScreen>
  );
}
