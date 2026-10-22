import { forwardRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IconAdjustments, IconChevronRight, IconClipboardList, IconWorld } from '@tabler/icons-react';
import { LANGUAGES, fill, sharedCopy, unitLabel, useCopy } from '@sistem/shared';
import { Eyebrow } from '../../../../components/common/Eyebrow/Eyebrow';
import { ROUTES } from '../../../../app/config/routes';
import { useAuth } from '../../../../services/auth/AuthContext';
import { useLanguagePreference } from '../../hooks/useLanguagePreference';
import { useMyUnits } from '../../hooks/useMyBody';
import { profileCopy } from '../../copy';
import './ProfileSettings.css';

function LinkRow({ to, icon, title, hint }: { to: string; icon: ReactNode; title: string; hint: string }) {
  return (
    <li>
      <Link to={to} className="pf-row">
        <span className="pf-row-icon" aria-hidden="true">
          {icon}
        </span>
        <span className="pf-row-text">
          {title}
          <span className="pf-row-hint">{hint}</span>
        </span>
        <IconChevronRight className="pf-row-chevron flip-rtl" size={16} aria-hidden="true" />
      </Link>
    </li>
  );
}

/**
 * Settings on Profile, in two white groups: (1) the language (saved as hers); (2) her questionnaire and
 * units / time zone (the Settings screen). Then log out with a confirm, and the app version.
 * Notification / reminder switches, privacy and personal-details screens don't exist yet (Phase 5b / backlog) — not shown (see the report).
 */
export const ProfileSettings = forwardRef<HTMLHeadingElement>(function ProfileSettings(_props, ref) {
  const copy = useCopy(profileCopy);
  const shared = useCopy(sharedCopy);
  const { language, changeLanguage, isSaving, failed } = useLanguagePreference();
  const { units } = useMyUnits();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [confirmLogout, setConfirmLogout] = useState(false);

  function handleLogout() {
    logout();
    navigate(ROUTES.LOGIN, { replace: true });
  }

  return (
    <section className="pf-settings" aria-labelledby="pf-settings-title">
      <h2 ref={ref} className="pf-section-title pf-settings-title" id="pf-settings-title" tabIndex={-1}>
        <Eyebrow>{copy.eyebrow.settings}</Eyebrow>
        {copy.settingsTitle}
      </h2>

      <ul className="pf-settings-list">
        <li className="pf-row" role="group" aria-labelledby="pf-language-label">
          <span className="pf-row-icon" aria-hidden="true">
            <IconWorld size={18} />
          </span>
          <span className="pf-row-text" id="pf-language-label">
            {copy.languageTitle}
          </span>
          <span className="pf-language">
            {LANGUAGES.map((option) => (
              <button
                key={option}
                type="button"
                lang={option}
                className="pf-language-option"
                aria-pressed={option === language}
                aria-label={shared.languageNames[option]}
                disabled={isSaving}
                onClick={() => void changeLanguage(option)}
              >
                {copy.languageShort[option]}
              </button>
            ))}
          </span>
        </li>
      </ul>
      {failed && (
        <p className="pf-settings-error" role="alert">
          {copy.languageSaveError}
        </p>
      )}

      <ul className="pf-settings-list">
        <LinkRow
          to={ROUTES.PROFILE_QUESTIONNAIRE}
          icon={<IconClipboardList size={18} />}
          title={copy.questionnaireTitle}
          hint={copy.questionnaireHint}
        />
        <LinkRow
          to={ROUTES.SETTINGS}
          icon={<IconAdjustments size={18} />}
          title={copy.unitsTitle}
          hint={`${unitLabel(units.weight, language)} · ${unitLabel(units.length, language)}`}
        />
      </ul>

      {confirmLogout ? (
        <div className="pf-logout-confirm" role="group" aria-labelledby="pf-logout-question">
          <p className="pf-logout-question" id="pf-logout-question">
            {copy.logoutConfirm}
          </p>
          <div className="pf-logout-actions">
            <button type="button" className="pf-logout pf-logout-final" onClick={handleLogout}>
              {shared.common.logout}
            </button>
            <button type="button" className="pf-logout pf-logout-cancel" onClick={() => setConfirmLogout(false)}>
              {copy.cancel}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="pf-logout" onClick={() => setConfirmLogout(true)}>
          {shared.common.logout}
        </button>
      )}

      <p className="pf-version">
        <Eyebrow keepInEnglish>{fill(copy.eyebrow.version, { version: __APP_VERSION__ })}</Eyebrow>
      </p>
    </section>
  );
});
