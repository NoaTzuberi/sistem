import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PageLayout } from '../../../../components/layout/PageLayout/PageLayout';
import { Container } from '../../../../components/layout/Container/Container';
import { Section } from '../../../../components/layout/Section/Section';
import { Input } from '../../../../components/common/Input/Input';
import { Button } from '../../../../components/common/Button/Button';
import { AuthCard } from '../../components/AuthCard/AuthCard';
import { requestPasswordReset } from '../../../../services/auth/authService';
import { authErrorText, validateEmail, type AuthErrorKey } from '../../validation';
import { useCopy } from '@sistem/shared';
import { authCopy } from '../../copy';
import { ROUTES } from '../../../../app/config/routes';
import './ForgotPassword.css';

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
    <PageLayout>
      <Section className="auth-page">
        <Container>
          <AuthCard title={copy.forgotTitle}>
            {successMessage ? (
              <p className="forgot-password-success">{successMessage}</p>
            ) : (
              <form className="auth-form" onSubmit={handleSubmit} noValidate>
                <p className="text-body forgot-password-copy">{copy.forgotIntro}</p>
                <Input
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
                <Button type="submit" variant="primary" loading={isSubmitting}>
                  {copy.sendResetLink}
                </Button>
              </form>
            )}
            <p className="auth-switch">
              <Link to={ROUTES.LOGIN}>{copy.backToLogin}</Link>
            </p>
          </AuthCard>
        </Container>
      </Section>
    </PageLayout>
  );
}
