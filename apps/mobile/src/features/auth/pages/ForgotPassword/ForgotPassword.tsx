import { useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { IconAt, IconMail } from '@tabler/icons-react';
import { useCopy } from '@sistem/shared';
import { AuthScreen } from '../../components/AuthScreen/AuthScreen';
import { AuthField } from '../../components/AuthField/AuthField';
import { AuthSubmitButton } from '../../components/AuthSubmitButton/AuthSubmitButton';
import { AuthNotice } from '../../components/AuthNotice/AuthNotice';
import { AuthFooterLink } from '../../components/AuthFooterLink/AuthFooterLink';
import { requestPasswordReset } from '../../../../services/auth/authService';
import { authErrorText, validateEmail, type AuthErrorKey } from '../../validation';
import { authCopy } from '../../copy';
import { ROUTES } from '../../../../app/config/routes';
import './ForgotPassword.css';

/** "שכחתי סיסמה" on the login screen's stage: her email → the server sends a reset link. */
export function ForgotPassword() {
  const location = useLocation();
  const copy = useCopy(authCopy);
  const prefillEmail = (location.state as { email?: string } | null)?.email ?? '';
  const [email, setEmail] = useState(prefillEmail);
  const [emailError, setEmailError] = useState<AuthErrorKey>();
  const [formError, setFormError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentMessage, setSentMessage] = useState<string>();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(undefined);

    const nextEmailError = validateEmail(email);
    setEmailError(nextEmailError);
    if (nextEmailError) return;

    setIsSubmitting(true);
    try {
      setSentMessage(await requestPasswordReset(email));
    } catch (error) {
      setFormError((error instanceof Error && error.message) || copy.somethingWrong);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Sent: the server's line (it never says whether the account exists) and the way back.
  if (sentMessage) {
    return (
      <AuthScreen>
        <AuthNotice icon={<IconMail size={24} />} title={copy.resetSentTitle} text={sentMessage}>
          <AuthSubmitButton variant="soft" to={ROUTES.LOGIN}>
            {copy.backToLogin}
          </AuthSubmitButton>
        </AuthNotice>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen title={copy.forgotTitle} footer={<AuthFooterLink to={ROUTES.LOGIN}>{copy.backToLogin}</AuthFooterLink>}>
      <form className="auth-glass-form" onSubmit={handleSubmit} noValidate>
        <p className="forgot-password-intro">{copy.forgotIntro}</p>
        <AuthField
          type="email"
          label={copy.email}
          icon={<IconAt size={20} />}
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="send"
          placeholder={copy.email}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={authErrorText(copy, emailError)}
          autoComplete="email"
        />
        {formError && <p className="auth-glass-error">{formError}</p>}
        <AuthSubmitButton loading={isSubmitting}>{copy.sendResetLink}</AuthSubmitButton>
      </form>
    </AuthScreen>
  );
}
