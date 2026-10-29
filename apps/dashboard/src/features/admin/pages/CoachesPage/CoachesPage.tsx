import { useState } from 'react';
import { Link } from 'react-router-dom';
import { fill, sharedCopy, useCopy } from '@sistem/shared';
import { ROUTES } from '../../../../app/config/routes';
import { ConfirmDialog } from '../../../../components/common/ConfirmDialog/ConfirmDialog';
import { LanguageToggle } from '../../../../components/common/LanguageToggle/LanguageToggle';
import { Logo } from '../../../../components/common/Logo/Logo';
import { PageHeader } from '../../../../components/common/PageHeader/PageHeader';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import { SideSheet } from '../../../../components/common/SideSheet/SideSheet';
import { StateLine } from '../../../../components/common/StateLine/StateLine';
import { Tag } from '../../../../components/common/Tag/Tag';
import { useSaveLanguage } from '../../../../hooks/useSaveLanguage';
import { useAuth } from '../../../../services/auth/AuthContext';
import { hasRole } from '../../../auth/data/roles';
import { AdminFoodBank } from '../../components/AdminFoodBank/AdminFoodBank';
import { CreateCoachSheet } from '../../components/CreateCoachSheet/CreateCoachSheet';
import { PasswordLink } from '../../components/PasswordLink/PasswordLink';
import { adminCopy } from '../../copy';
import { useAdminCoaches } from '../../hooks/useAdminCoaches';
import './CoachesPage.css';

/**
 * The platform admin's page: the coach accounts (never trainee data). Its own simple frame — an
 * admin-only account has no coach dashboard around it.
 */
export function CoachesPage() {
  const copy = useCopy(adminCopy);
  const shared = useCopy(sharedCopy);
  const { user, logout } = useAuth();
  const { saveLanguage } = useSaveLanguage();
  const admin = useAdminCoaches();
  const [isCreating, setIsCreating] = useState(false);

  return (
    <div className="coaches-page">
      <header className="coaches-bar">
        <div className="coaches-logo-tile">
          <Logo variant="onBrand" />
        </div>
        <span className="coaches-role">{copy.adminRole}</span>
        <div className="coaches-bar-actions">
          {hasRole(user, 'coach') && (
            <Link className="coaches-bar-link" to={ROUTES.HOME}>
              {copy.backToDashboard}
            </Link>
          )}
          <LanguageToggle onChange={saveLanguage} />
          <PillButton size="sm" onClick={logout}>
            {shared.common.logout}
          </PillButton>
        </div>
      </header>

      <main className="coaches-main">
        <PageHeader title={copy.title} subtitle={copy.subtitle}>
          <PillButton variant="primary" onClick={() => setIsCreating(true)}>
            {copy.addCoach}
          </PillButton>
        </PageHeader>

        {admin.error ? (
          <StateLine error={admin.error} onRetry={admin.reload} />
        ) : admin.isLoading ? (
          <StateLine />
        ) : admin.coaches.length === 0 ? (
          <p className="coaches-empty">{copy.empty}</p>
        ) : (
          <div className="coaches-table-wrap">
            <table className="coaches-table">
              <thead>
                <tr>
                  <th scope="col">{copy.columns.name}</th>
                  <th scope="col">{copy.columns.email}</th>
                  <th scope="col">{copy.columns.status}</th>
                  <th scope="col">{copy.columns.password}</th>
                  <th scope="col">{copy.columns.trainees}</th>
                  <th scope="col">{copy.columns.actions}</th>
                </tr>
              </thead>
              <tbody>
                {admin.coaches.map((coach) => {
                  const isBusy = admin.busyId === coach.id;
                  return (
                    <tr key={coach.id}>
                      <td>
                        <bdi>{coach.name}</bdi>
                      </td>
                      <td>
                        <bdi dir="ltr">{coach.email}</bdi>
                      </td>
                      <td>
                        <Tag tone={coach.status === 'active' ? 'accent' : 'quiet'}>
                          {coach.status === 'active' ? copy.statusActive : copy.statusSuspended}
                        </Tag>
                      </td>
                      <td>{coach.passwordSet ? copy.passwordSet : copy.passwordPending}</td>
                      <td className="coaches-number">{coach.traineeCount}</td>
                      <td>
                        <div className="coaches-actions">
                          <PillButton size="sm" disabled={isBusy} onClick={() => admin.newLink(coach)}>
                            {copy.newLink}
                          </PillButton>
                          {coach.passwordSet && (
                            <PillButton size="sm" disabled={isBusy} onClick={() => admin.resetLink(coach)}>
                              {copy.resetLink}
                            </PillButton>
                          )}
                          {coach.status === 'active' ? (
                            <PillButton size="sm" variant="danger" disabled={isBusy} onClick={() => admin.askSuspend(coach)}>
                              {copy.suspend}
                            </PillButton>
                          ) : (
                            <PillButton size="sm" disabled={isBusy} onClick={() => admin.reactivate(coach)}>
                              {copy.reactivate}
                            </PillButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {admin.actionError && (
          <p className="coaches-error" role="alert">
            {admin.actionError}
          </p>
        )}

        <AdminFoodBank />
      </main>

      <CreateCoachSheet isOpen={isCreating} onClose={() => setIsCreating(false)} onCreate={admin.create} />

      <SideSheet
        isOpen={admin.link !== null}
        onClose={admin.closeLink}
        title={admin.link?.coach.name ?? ''}
        footer={
          <PillButton variant="dark" onClick={admin.closeLink}>
            {copy.done}
          </PillButton>
        }
      >
        {admin.link && <PasswordLink result={admin.link} />}
      </SideSheet>

      <ConfirmDialog
        isOpen={admin.toSuspend !== null}
        title={fill(copy.suspendTitle, { name: admin.toSuspend?.name ?? '' })}
        text={copy.suspendText}
        confirmLabel={copy.suspend}
        cancelLabel={copy.cancel}
        onConfirm={admin.confirmSuspend}
        onCancel={admin.cancelSuspend}
      />
    </div>
  );
}
