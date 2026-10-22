import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { IconAt, IconKey } from '@tabler/icons-react';
import { AuthScreen } from '../../components/AuthScreen/AuthScreen';
import { AuthField } from '../../components/AuthField/AuthField';
import { AuthSubmitButton } from '../../components/AuthSubmitButton/AuthSubmitButton';
import { SocialButtons } from '../../components/SocialButtons/SocialButtons';
import { CoachDashboardLink } from '../../components/CoachDashboardLink/CoachDashboardLink';
import { useAuth } from '../../../../services/auth/AuthContext';
import { authErrorText, validateEmail, validateLoginPassword, type AuthErrorKey } from '../../validation';
import { useCopy } from '@sistem/shared';
import { authCopy } from '../../copy';
import { ROUTES, joinPath } from '../../../../app/config/routes';
import { clearPendingInvite, getPendingInvite } from '../../../../services/invites/pendingInvite';
import './Login.css';

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const copy = useCopy(authCopy);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<AuthErrorKey>();
  const [passwordError, setPasswordError] = useState<AuthErrorKey>();
  const [formError, setFormError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(undefined);

    const nextEmailError = validateEmail(email);
    const nextPasswordError = validateLoginPassword(password);
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);

    if (nextEmailError || nextPasswordError) return;

    setIsSubmitting(true);
    try {
      await login({ email, password });
      // "/" sends the user to the landing screen for their server-decided state.
      // She opened a coach's link first: back to it to confirm joining.
      const pendingInvite = getPendingInvite();
      clearPendingInvite();
      navigate(pendingInvite ? joinPath(pendingInvite) : ROUTES.HOME);
    } catch (error) {
      // The server's message is already in the language on screen; '' = no answer.
      setFormError((error instanceof Error && error.message) || copy.loginFailed);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthScreen title={copy.loginTitle} switchLabel={copy.registerLink} switchTo={ROUTES.REGISTER} footer={<CoachDashboardLink />}>
      <form className="auth-glass-form" onSubmit={handleSubmit} noValidate>
        <AuthField
          type="email"
          label={copy.email}
          icon={<IconAt size={20} />}
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="next"
          placeholder={copy.email}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={authErrorText(copy, emailError)}
          autoComplete="email"
        />
        <AuthField
          type="password"
          label={copy.password}
          icon={<IconKey size={20} />}
          placeholder={copy.password}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={authErrorText(copy, passwordError)}
          autoComplete="current-password"
          enterKeyHint="go"
          trailing={
            <Link to={ROUTES.FORGOT_PASSWORD} className="login-forgot-pill" aria-label={copy.forgotLink}>
              {copy.forgotShort}
            </Link>
          }
        />
        {formError && <p className="auth-glass-error">{formError}</p>}
        <AuthSubmitButton loading={isSubmitting}>{copy.loginButton}</AuthSubmitButton>
        <SocialButtons />
      </form>
    </AuthScreen>
  );
}
