import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthScreen } from '../../components/AuthScreen/AuthScreen';
import { AuthField } from '../../components/AuthField/AuthField';
import { AuthButton } from '../../components/AuthButton/AuthButton';
import { PasswordVisibilityToggle } from '../../components/PasswordVisibilityToggle/PasswordVisibilityToggle';
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
  const [passwordVisible, setPasswordVisible] = useState(false);

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
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <AuthField
          type="email"
          label={copy.email}
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="next"
          placeholder={copy.emailPlaceholder}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={authErrorText(copy, emailError)}
          autoComplete="email"
        />
        <AuthField
          type={passwordVisible ? 'text' : 'password'}
          label={copy.password}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={authErrorText(copy, passwordError)}
          autoComplete="current-password"
          enterKeyHint="go"
          trailing={
            <PasswordVisibilityToggle
              visible={passwordVisible}
              showLabel={copy.passwordHidden}
              hideLabel={copy.passwordVisible}
              onToggle={() => setPasswordVisible((visible) => !visible)}
            />
          }
        />
        <Link to={ROUTES.FORGOT_PASSWORD} state={{ email }} className="auth-link login-forgot">
          {copy.forgotLink}
        </Link>
        {formError && <p className="auth-form-error">{formError}</p>}
        <AuthButton type="submit" loading={isSubmitting}>
          {copy.loginButton}
        </AuthButton>
        <SocialButtons />
      </form>
    </AuthScreen>
  );
}
