import { useNavigate } from 'react-router-dom';
import { IconDeviceDesktop, IconExternalLink, IconLanguage, IconLogout, IconSwitchHorizontal } from '@tabler/icons-react';
import type { Language } from '@sistem/types';
import { sharedCopy, useCopy, useI18n } from '@sistem/shared';
import { AppShell } from '../../../../components/layout/AppShell/AppShell';
import { AvatarPhoto } from '../../../../components/common/AvatarPhoto/AvatarPhoto';
import { Eyebrow } from '../../../../components/common/Eyebrow/Eyebrow';
import { LanguageSwitch } from '../../../../components/common/LanguageSwitch/LanguageSwitch';
import { DeleteAccountButton } from '../../../account/components/DeleteAccountButton/DeleteAccountButton';
import { COACH_DASHBOARD_URL } from '../../../../app/config/env';
import { ROUTES } from '../../../../app/config/routes';
import { useAuth } from '../../../../services/auth/AuthContext';
import { openExternal } from '../../../../services/external/openExternal';
import { updatePreferences } from '../../../../services/users/usersService';
import { initialsOf } from '../../../home/data/homeDisplay';
import { appCopy } from '../../../../copy';
import { coachCopy } from '../../copy';
import { CoachLinkRow } from '../../components/CoachLinkRow/CoachLinkRow';
import { ModeSwitch } from '../../components/ModeSwitch/ModeSwitch';
import { PaymentsRow } from '../../components/PaymentsRow/PaymentsRow';
import { ProfileRow } from '../../components/ProfileRow/ProfileRow';
import '../../components/CoachStage/CoachStage.css';
import './CoachProfilePage.css';

/**
 * The coach's Profile (design group 5): the ink stage with her name card, then white grouped lists — her link,
 * payments, the dashboard, settings (language; the mode switch with both roles) and log out. Her full settings
 * live on the dashboard.
 */
export function CoachProfilePage() {
  const coach = useCopy(coachCopy);
  const copy = coach.profile;
  const app = useCopy(appCopy);
  const shared = useCopy(sharedCopy);
  const { setLanguage } = useI18n();
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const name = user?.name ?? '';

  function saveLanguage(next: Language, previous: Language) {
    updatePreferences({ language: next })
      .then((updated) => updateUser({ language: updated.language }))
      .catch(() => setLanguage(previous));
  }

  function handleLogout() {
    logout();
    navigate(ROUTES.LOGIN, { replace: true });
  }

  return (
    <AppShell bleed surface="soft">
      <div className="cp-screen">
        <header className="cp-hero">
          <div className="coach-stage cp-stage" aria-hidden="true" />
          <h1 className="cp-sr-only">{app.tabs.profile}</h1>
          <section className="cp-card">
            <span className="cp-avatar" aria-hidden="true">
              <bdi>{initialsOf(name)}</bdi>
              <AvatarPhoto url={user?.avatar?.url ?? null} />
            </span>
            <Eyebrow keepInEnglish>{app.eyebrow.coach}</Eyebrow>
            <p className="cp-name display-title" dir="auto">
              {name}
            </p>
          </section>
        </header>

        <section className="cp-group" aria-labelledby="cp-link-title">
          <h2 className="cp-group-title" id="cp-link-title">
            {copy.myLink}
          </h2>
          <ul className="cp-list">
            <CoachLinkRow />
          </ul>
        </section>

        <section className="cp-group" aria-labelledby="cp-payments-title">
          <h2 className="cp-group-title" id="cp-payments-title">
            {copy.payments}
          </h2>
          <ul className="cp-list">
            <PaymentsRow />
          </ul>
        </section>

        <section className="cp-group" aria-labelledby="cp-dashboard-title">
          <h2 className="cp-group-title" id="cp-dashboard-title">
            {copy.dashboardTitle}
          </h2>
          {COACH_DASHBOARD_URL && (
            <ul className="cp-list">
              <ProfileRow
                icon={<IconDeviceDesktop size={20} />}
                label={coach.openFullDashboard}
                onClick={() => openExternal(COACH_DASHBOARD_URL!)}
                trailing={<IconExternalLink className="cp-trail-icon" size={18} aria-hidden="true" />}
              />
            </ul>
          )}
          <p className="cp-note">{copy.desk}</p>
        </section>

        <section className="cp-group" aria-labelledby="cp-settings-title">
          <h2 className="cp-group-title" id="cp-settings-title">
            {copy.settings}
          </h2>
          <ul className="cp-list">
            <ProfileRow
              icon={<IconLanguage size={20} />}
              label={shared.language}
              trailing={<LanguageSwitch onChange={(next) => saveLanguage(next, next === 'he' ? 'en' : 'he')} />}
            />
            {user?.canSwitchAppMode && <ProfileRow icon={<IconSwitchHorizontal size={20} />} label={copy.modeTitle} below={<ModeSwitch />} />}
          </ul>
        </section>

        <section className="cp-group">
          <ul className="cp-list">
            <ProfileRow icon={<IconLogout className="flip-rtl" size={20} />} label={shared.common.logout} onClick={handleLogout} />
          </ul>
        </section>

        {!user?.roles.includes('admin') && (
          <div className="cp-delete">
            <DeleteAccountButton />
          </div>
        )}
      </div>
    </AppShell>
  );
}
