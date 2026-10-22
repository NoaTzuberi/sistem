import { useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconClock, IconRuler2, IconScale } from '@tabler/icons-react';
import { LANGUAGES, fill, sharedCopy, unitLabel, useCopy } from '@sistem/shared';
import { AppShell } from '../../../../components/layout/AppShell/AppShell';
import { Eyebrow } from '../../../../components/common/Eyebrow/Eyebrow';
import { ROUTES } from '../../../../app/config/routes';
import { useAuth } from '../../../../services/auth/AuthContext';
import { SubScreenHeader } from '../../components/SubScreenHeader/SubScreenHeader';
import { SegmentedControl } from '../../components/SegmentedControl/SegmentedControl';
import { LogoutSheet } from '../../components/LogoutSheet/LogoutSheet';
import { useLanguagePreference } from '../../hooks/useLanguagePreference';
import { useUnitPreferences } from '../../hooks/useUnitPreferences';
import { profileCopy } from '../../copy';
import './SettingsPage.css';

const WEIGHT_UNITS = ['kg', 'lb'] as const;
const LENGTH_UNITS = ['cm', 'in'] as const;

function SettingsRow({ icon, label, labelId, children }: { icon: ReactNode; label: string; labelId: string; children: ReactNode }) {
  return (
    <div className="st-row">
      <span className="st-row-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="st-row-label" id={labelId}>
        {label}
      </span>
      <div className="st-row-control">{children}</div>
    </div>
  );
}

function SectionTitle({ eyebrow, id, children }: { eyebrow: string; id: string; children: string }) {
  return (
    <h2 className="st-section-title" id={id}>
      <Eyebrow>{eyebrow}</Eyebrow>
      {children}
    </h2>
  );
}

/**
 * Settings (PRD §5.5, direction B): units, language, account (time zone), log out, the app version.
 * Notification switches, personal details and privacy screens don't exist yet (push is Phase 5b) — not shown.
 */
export function SettingsPage() {
  const copy = useCopy(profileCopy);
  const shared = useCopy(sharedCopy);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const units = useUnitPreferences();
  const language = useLanguagePreference();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const busy = units.isSaving || language.isSaving;

  function handleLogout() {
    logout();
    navigate(ROUTES.LOGIN, { replace: true });
  }

  return (
    <AppShell bleed>
      <div className="st-screen">
        <SubScreenHeader title={copy.settingsTitle} fallbackPath={ROUTES.PROFILE} />

        <div className="st-content">
          <section className="st-section" aria-labelledby="st-units">
            <SectionTitle eyebrow={copy.eyebrow.units} id="st-units">
              {copy.unitsTitle}
            </SectionTitle>
            <div className="st-card">
              <SettingsRow icon={<IconScale size={18} />} label={copy.weightUnit} labelId="st-weight-label">
                <SegmentedControl
                  label={copy.weightUnit}
                  options={WEIGHT_UNITS.map((unit) => ({ value: unit, label: unitLabel(unit, language.language) }))}
                  value={units.units.weight}
                  disabled={busy}
                  onChange={(weight) => void units.changeUnits({ weight })}
                />
              </SettingsRow>
              <SettingsRow icon={<IconRuler2 size={18} />} label={copy.lengthUnit} labelId="st-length-label">
                <SegmentedControl
                  label={copy.lengthUnit}
                  options={LENGTH_UNITS.map((unit) => ({ value: unit, label: unitLabel(unit, language.language) }))}
                  value={units.units.length}
                  disabled={busy}
                  onChange={(length) => void units.changeUnits({ length })}
                />
              </SettingsRow>
            </div>
            <p className="st-hint">{copy.unitsHint}</p>
            {units.failed && (
              <p className="st-error" role="alert">
                {copy.unitsSaveError}
              </p>
            )}
          </section>

          <section className="st-section" aria-labelledby="st-language">
            <SectionTitle eyebrow={copy.eyebrow.language} id="st-language">
              {copy.languageTitle}
            </SectionTitle>
            <div className="st-card st-card-padded">
              <SegmentedControl
                block
                label={copy.languageTitle}
                options={LANGUAGES.map((option) => ({ value: option, label: shared.languageNames[option], lang: option }))}
                value={language.language}
                disabled={busy}
                onChange={(next) => void language.changeLanguage(next)}
              />
            </div>
            <p className="st-hint">{copy.languageHint}</p>
            {language.failed && (
              <p className="st-error" role="alert">
                {copy.languageSaveError}
              </p>
            )}
          </section>

          <section className="st-section" aria-labelledby="st-account">
            <SectionTitle eyebrow={copy.eyebrow.account} id="st-account">
              {copy.account}
            </SectionTitle>
            <div className="st-card">
              <SettingsRow icon={<IconClock size={18} />} label={copy.timezone} labelId="st-timezone-label">
                <bdi className="st-value" dir="ltr">
                  {user?.timezone}
                </bdi>
              </SettingsRow>
            </div>
          </section>

          <button type="button" className="st-logout" onClick={() => setConfirmLogout(true)}>
            {shared.common.logout}
          </button>

          <p className="st-version">
            <Eyebrow keepInEnglish>{fill(copy.eyebrow.version, { version: __APP_VERSION__ })}</Eyebrow>
          </p>
        </div>

        <LogoutSheet isOpen={confirmLogout} onClose={() => setConfirmLogout(false)} onConfirm={handleLogout} />
      </div>
    </AppShell>
  );
}
