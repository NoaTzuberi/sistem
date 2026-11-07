import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { IconKey, IconLinkOff } from '@tabler/icons-react';
import { useCopy } from '@sistem/shared';
import { AuthScreen } from '../../components/AuthScreen/AuthScreen';
import { AuthField } from '../../components/AuthField/AuthField';
import { AuthSubmitButton } from '../../components/AuthSubmitButton/AuthSubmitButton';
import { AuthNotice } from '../../components/AuthNotice/AuthNotice';
import { AuthFooterLink } from '../../components/AuthFooterLink/AuthFooterLink';
import { PasswordVisibilityToggle } from '../../components/PasswordVisibilityToggle/PasswordVisibilityToggle';
import { resetPassword } from '../../../../services/auth/authService';
import { useAuth } from '../../../../services/auth/AuthContext';
import { showAppToast } from '../../../../services/toast/appToast';
import { authErrorText, validatePassword, validateConfirmPassword, type AuthErrorKey } from '../../validation';
import { authCopy } from '../../copy';
import { ROUTES } from '../../../../app/config/routes';

/** "איפוס סיסמה" from the emailed link: a new password, then straight into the app with a short toast. */
export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();
  const copy = useCopy(authCopy);
  const { signInWithSession } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<AuthErrorKey>();
  const [confirmPasswordError, setConfirmPasswordError] = useState<AuthErrorKey>();
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [formError, setFormError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const passwordsMatch = password === confirmPassword;
  const isFormInvalid = Boolean(validatePassword(password) || !confirmPassword || !passwordsMatch);
  const backToLogin = <AuthFooterLink to={ROUTES.LOGIN}>{copy.backToLogin}</AuthFooterLink>;

  function updatePassword(value: string) {
    setPassword(value);
    if (confirmTouched) setConfirmPasswordError(validateConfirmPassword(value, confirmPassword));
  }

  function updateConfirmPassword(value: string) {
    setConfirmPassword(value);
    if (confirmTouched) setConfirmPasswordError(validateConfirmPassword(password, value));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(undefined);

    const nextPasswordError = validatePassword(password);
    const nextConfirmPasswordError = validateConfirmPassword(password, confirmPassword);
    setPasswordError(nextPasswordError);
    setConfirmPasswordError(nextConfirmPasswordError);
    setConfirmTouched(true);

    if (nextPasswordError || nextConfirmPasswordError) return;

    setIsSubmitting(true);
    try {
      // Every other device is signed out; this one gets a fresh session (the app state picks the screen).
      const session = await resetPassword(token, password, confirmPassword);
      signInWithSession(session.token, session.user);
      showAppToast((language) => authCopy[language].passwordUpdated);
      navigate(ROUTES.HOME, { replace: true });
    } catch (error) {
      setFormError((error instanceof Error && error.message) || copy.somethingWrong);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <AuthScreen footer={backToLogin}>
        <AuthNotice icon={<IconLinkOff size={24} />} title={copy.resetTitle} text={copy.resetLinkInvalid}>
          <AuthSubmitButton to={ROUTES.FORGOT_PASSWORD}>{copy.requestNewLink}</AuthSubmitButton>
        </AuthNotice>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen title={copy.resetTitle} footer={backToLogin}>
      <form className="auth-glass-form" onSubmit={handleSubmit} noValidate>
        <AuthField
          type={passwordVisible ? 'text' : 'password'}
          label={copy.newPassword}
          icon={<IconKey size={20} />}
          placeholder={copy.newPassword}
          value={password}
          onChange={(event) => updatePassword(event.target.value)}
          onBlur={() => setPasswordError(validatePassword(password))}
          error={authErrorText(copy, passwordError)}
          autoComplete="new-password"
          trailing={
            <PasswordVisibilityToggle
              visible={passwordVisible}
              showLabel={copy.passwordHidden}
              hideLabel={copy.passwordVisible}
              onToggle={() => setPasswordVisible((visible) => !visible)}
            />
          }
        />
        <AuthField
          type={confirmPasswordVisible ? 'text' : 'password'}
          label={copy.confirmPassword}
          icon={<IconKey size={20} />}
          placeholder={copy.confirmPassword}
          value={confirmPassword}
          onChange={(event) => updateConfirmPassword(event.target.value)}
          onBlur={() => {
            setConfirmTouched(true);
            setConfirmPasswordError(validateConfirmPassword(password, confirmPassword));
          }}
          error={confirmPasswordError ? copy.passwordsMismatch : undefined}
          statusText={confirmTouched && confirmPassword && passwordsMatch ? copy.passwordsMatch : undefined}
          autoComplete="new-password"
          enterKeyHint="go"
          trailing={
            <PasswordVisibilityToggle
              visible={confirmPasswordVisible}
              showLabel={copy.passwordHidden}
              hideLabel={copy.passwordVisible}
              onToggle={() => setConfirmPasswordVisible((visible) => !visible)}
            />
          }
        />
        {formError && <p className="auth-glass-error">{formError}</p>}
        <AuthSubmitButton loading={isSubmitting} disabled={isFormInvalid}>
          {copy.resetButton}
        </AuthSubmitButton>
      </form>
    </AuthScreen>
  );
}
