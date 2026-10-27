import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthScreen } from '../../components/AuthScreen/AuthScreen';
import { AuthField } from '../../components/AuthField/AuthField';
import { AuthButton } from '../../components/AuthButton/AuthButton';
import { requestPasswordReset } from '../../../../services/auth/authService';
import { authErrorText, validateEmail, type AuthErrorKey } from '../../validation';
import { useCopy } from '@sistem/shared';
import { authCopy } from '../../copy';
import { ROUTES } from '../../../../app/config/routes';

export function ForgotPassword() {
  const location = useLocation();
  const copy = useCopy(authCopy);
  const prefillEmail = (location.state as { email?: string } | null)?.email ?? '';
  const [email, setEmail] = useState(prefillEmail);
  const [emailError, setEmailError] = useState<AuthErrorKey>();
  const [formError, setFormError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(undefined);

    const nextEmailError = validateEmail(email);
    setEmailError(nextEmailError);
    if (nextEmailError) return;

    setIsSubmitting(true);
    try {
      const message = await requestPasswordReset(email);
      setSuccessMessage(message);
    } catch (error) {
      setFormError((error instanceof Error && error.message) || copy.somethingWrong);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthScreen title={copy.forgotTitle}>
      {successMessage ? (
        <p className="auth-form-text" role="status">
          {successMessage}
        </p>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <p className="auth-form-text">{copy.forgotIntro}</p>
          <AuthField
            type="email"
            label={copy.email}
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="send"
            placeholder={copy.emailPlaceholder}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={authErrorText(copy, emailError)}
            autoComplete="email"
          />
          {formError && <p className="auth-form-error">{formError}</p>}
          <AuthButton type="submit" loading={isSubmitting}>
            {copy.sendResetLink}
          </AuthButton>
        </form>
      )}
      <div className="auth-link-row">
        <Link className="auth-link" to={ROUTES.LOGIN}>
          {copy.backToLogin}
        </Link>
      </div>
    </AuthScreen>
  );
}
