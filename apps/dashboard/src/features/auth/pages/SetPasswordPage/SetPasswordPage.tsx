import { Link } from 'react-router-dom';
import { useCopy } from '@sistem/shared';
import { appCopy } from '../../../../copy';
import { ROUTES } from '../../../../app/config/routes';
import { FlowBackground } from '../../../../components/common/FlowBackground/FlowBackground';
import { LanguageToggle } from '../../../../components/common/LanguageToggle/LanguageToggle';
import { Logo } from '../../../../components/common/Logo/Logo';
import { LoginField } from '../../components/LoginField/LoginField';
import { LockIcon } from '../../components/LoginIcons/LoginIcons';
import { useSetPassword } from '../../hooks/useSetPassword';
import './SetPasswordPage.css';

/** A new coach's one-time link (made by the admin): choose a password → signed in. */
export function SetPasswordPage() {
  const copy = useCopy(appCopy).setPassword;
  const form = useSetPassword();

  return (
    <main className="set-password-page">
      <FlowBackground />
      <LanguageToggle className="set-password-language" />
      <form className="set-password-card" onSubmit={form.submit} noValidate>
        <div className="set-password-logo-tile">
          <Logo variant="onBrand" />
        </div>
        <h1 className="set-password-title">{copy.title}</h1>
        {form.hasToken ? (
          <>
            <p className="set-password-subtitle">{copy.subtitle}</p>
            <LoginField
              label={copy.password}
              icon={<LockIcon />}
              type="password"
              dir="ltr"
              autoComplete="new-password"
              value={form.password}
              onChange={(event) => form.setPassword(event.target.value)}
              required
            />
            <LoginField
              label={copy.confirm}
              icon={<LockIcon />}
              type="password"
              dir="ltr"
              autoComplete="new-password"
              value={form.confirm}
              onChange={(event) => form.setConfirm(event.target.value)}
              required
            />
            {form.error && (
              <p className="set-password-error" role="alert">
                {form.error}
              </p>
            )}
            <button className="set-password-submit" type="submit" disabled={form.isSaving}>
              {form.isSaving ? copy.saving : copy.submit}
            </button>
          </>
        ) : (
          <p className="set-password-error" role="alert">
            {copy.missingToken}
          </p>
        )}
        <Link className="set-password-login" to={ROUTES.LOGIN}>
          {copy.toLogin}
        </Link>
      </form>
    </main>
  );
}
