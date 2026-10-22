import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../services/auth/AuthContext';
import { TRAINEE_APP_URL } from '../../../../app/config/env';
import { ROUTES } from '../../../../app/config/routes';
import { FlowBackground } from '../../../../components/common/FlowBackground/FlowBackground';
import { Logo } from '../../../../components/common/Logo/Logo';
import { LanguageToggle } from '../../../../components/common/LanguageToggle/LanguageToggle';
import { Switch } from '../../../../components/common/Switch/Switch';
import { useCopy } from '@sistem/shared';
import { appCopy } from '../../../../copy';
import { LoginField } from '../../components/LoginField/LoginField';
import { ArrowIcon, LockIcon, MailIcon } from '../../components/LoginIcons/LoginIcons';
import { FORGOT_PASSWORD_ENABLED, REMEMBER_ME_ENABLED } from '../../data/authConfig';
import { useLoginEntrance } from '../../hooks/useLoginEntrance';
import { dashboardHome } from '../../data/roles';
import './Login.css';

const FEATURES = ['trainees', 'plans', 'nutrition'] as const;

/** The coach's login: the brand block next to the login card, over the flow lines. */
export function Login() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const copy = useCopy(appCopy);
  const { brandRef, cardRef, intro } = useLoginEntrance<HTMLElement, HTMLDivElement>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Shown only behind REMEMBER_ME_ENABLED; the auth doesn't read it yet.
  const [rememberMe, setRememberMe] = useState(false);

  const signedInHome = dashboardHome(user, { home: ROUTES.HOME, admin: ROUTES.ADMIN_COACHES });
  if (signedInHome) {
    return <Navigate to={signedInHome} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setIsSubmitting(true);
    try {
      const loggedInUser = await login({ email, password });
      // The dashboard is for coaches (and the admin). The server enforces this on every coach /
      // admin endpoint too; this only keeps trainees out of an empty UI.
      const home = dashboardHome(loggedInUser, { home: ROUTES.HOME, admin: ROUTES.ADMIN_COACHES });
      if (!home) {
        logout();
        setError(copy.coachOnly);
        return;
      }
      navigate(home, { replace: true });
    } catch (loginError) {
      setError((loginError instanceof Error && loginError.message) || copy.loginFailed);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <FlowBackground intro={intro} />

      {/* Before login the device remembers the choice; after login her saved language wins (Phase 15). */}
      <LanguageToggle className="login-language" />

      <div className="login-layout">
        <section className="login-brand" ref={brandRef}>
          {/* The original logo, untouched: its white part needs the pink tile behind it. */}
          <div className="login-logo-tile">
            <Logo variant="onBrand" size="lg" />
          </div>

          <span className="login-badge">
            <span className="login-badge-dot" aria-hidden="true" />
            {copy.login.badge}
          </span>

          <h1 className="login-headline">
            {copy.login.headlineBefore}
            {/* The brand word stays English in every language; <bdi> keeps it in order inside Hebrew. i18n-ignore */}
            <bdi lang="en">
              {/* i18n-ignore: brand word */}
              <span className="login-headline-accent">Sis</span>
              {/* i18n-ignore: brand word */}
              terhood
            </bdi>
            {copy.login.headlineAfter}
          </h1>

          <p className="login-sub">{copy.login.sub}</p>

          <ul className="login-features">
            {FEATURES.map((feature) => (
              <li className="login-feature" key={feature}>
                <span className="login-feature-title">{copy.login.features[feature].title}</span>
                <span className="login-feature-caption">{copy.login.features[feature].caption}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="login-card-column" ref={cardRef}>
          <form className="login-card" onSubmit={handleSubmit} noValidate>
            <div className="login-card-heading">
              <h2 className="login-card-title">{copy.login.title}</h2>
              <p className="login-card-subtitle">{copy.login.subtitle}</p>
            </div>

            <LoginField
              label={copy.email}
              icon={<MailIcon />}
              type="email"
              dir="ltr"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <LoginField
              label={copy.password}
              icon={<LockIcon />}
              type="password"
              dir="ltr"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              trailing={
                FORGOT_PASSWORD_ENABLED && (
                  // TODO: becomes a link to the forgot-password screen when the dashboard has one.
                  <button type="button" className="login-forgot">
                    {copy.login.forgot}
                  </button>
                )
              }
            />

            {REMEMBER_ME_ENABLED && (
              // TODO: not wired — the auth has no remember-me yet (data/authConfig.ts).
              <Switch className="login-remember" label={copy.login.rememberMe} checked={rememberMe} onChange={setRememberMe} />
            )}

            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}

            <button className="login-submit" type="submit" disabled={isSubmitting}>
              <span>{isSubmitting ? copy.loggingIn : copy.login.submit}</span>
              {!isSubmitting && <ArrowIcon />}
            </button>

            {TRAINEE_APP_URL && (
              <p className="login-trainee">
                {copy.login.traineePrompt}{' '}
                <a className="login-trainee-link" href={TRAINEE_APP_URL}>
                  {copy.login.traineeLink}
                </a>
              </p>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}
