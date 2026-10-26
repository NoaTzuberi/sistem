import type { Language } from '@sistem/types';
import { sharedCopy, useCopy, useI18n } from '@sistem/shared';
import { LogoutButton } from '../../../../components/common/LogoutButton/LogoutButton';
import { LanguageSwitch } from '../../../../components/common/LanguageSwitch/LanguageSwitch';
import { useAuth } from '../../../../services/auth/AuthContext';
import { updatePreferences } from '../../../../services/users/usersService';
import { appCopy } from '../../../../copy';
import { coachCopy } from '../../copy';
import { CoachCard } from '../../components/CoachCard/CoachCard';
import { CoachLinkCard } from '../../components/CoachLinkCard/CoachLinkCard';
import { CoachScreen } from '../../components/CoachScreen/CoachScreen';
import { DashboardLinkRow } from '../../components/DashboardLinkRow/DashboardLinkRow';
import { DeskNote } from '../../components/DeskNote/DeskNote';
import { ModeSwitch } from '../../components/ModeSwitch/ModeSwitch';
import { PaymentsCard } from '../../components/PaymentsCard/PaymentsCard';
import './CoachProfilePage.css';

// The coach's Profile (docs/design/coach-app.html): her link, payments, the mode switch (coach + trainee),
// settings and log-out. Her full settings live on the dashboard.
export function CoachProfilePage() {
  const copy = useCopy(coachCopy).profile;
  const app = useCopy(appCopy);
  const shared = useCopy(sharedCopy);
  const { setLanguage } = useI18n();
  const { user, updateUser } = useAuth();

  function saveLanguage(next: Language, previous: Language) {
    updatePreferences({ language: next })
      .then((updated) => updateUser({ language: updated.language }))
      .catch(() => setLanguage(previous));
  }

  return (
    <CoachScreen
      top={
        <div className="coach-screen-top">
          <h1 className="coach-screen-title display-title">{app.tabs.profile}</h1>
        </div>
      }
    >
      <CoachLinkCard />
      <PaymentsCard />
      {user?.canSwitchAppMode && (
        <CoachCard title={copy.modeTitle}>
          <ModeSwitch />
        </CoachCard>
      )}
      <CoachCard title={copy.settings}>
        <div className="coach-profile-settings">
          <span className="coach-profile-settings-label">{shared.language}</span>
          <LanguageSwitch onChange={(next) => saveLanguage(next, next === 'he' ? 'en' : 'he')} />
        </div>
        <DashboardLinkRow />
      </CoachCard>
      <DeskNote text={copy.desk} />
      <div className="coach-profile-logout">
        <LogoutButton />
      </div>
    </CoachScreen>
  );
}
