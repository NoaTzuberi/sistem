import { useCopy } from '@sistem/shared';
import { LogoutButton } from '../../../../components/common/LogoutButton/LogoutButton';
import { AuthScreen } from '../../../auth/components/AuthScreen/AuthScreen';
import { CoachDashboardLink } from '../../../auth/components/CoachDashboardLink/CoachDashboardLink';
import { joinCopy } from '../../copy';
import './AdminOnlyPage.css';

/** An admin account without a coach role: the app has nothing for her — the dashboard does. */
export function AdminOnlyPage() {
  const copy = useCopy(joinCopy);
  return (
    <AuthScreen title={copy.adminOnlyTitle} footer={<CoachDashboardLink />}>
      <div className="admin-only-body">
        <p className="admin-only-text">{copy.adminOnlyText}</p>
        <LogoutButton />
      </div>
    </AuthScreen>
  );
}
