import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PageLayout } from '../../../../components/layout/PageLayout/PageLayout';
import { Container } from '../../../../components/layout/Container/Container';
import { Section } from '../../../../components/layout/Section/Section';
import { Input } from '../../../../components/common/Input/Input';
import { Button } from '../../../../components/common/Button/Button';
import { AuthCard } from '../../components/AuthCard/AuthCard';
import { resetPassword } from '../../../../services/auth/authService';
import { authErrorText, validatePassword, validateConfirmPassword, type AuthErrorKey } from '../../validation';
import { useCopy } from '@sistem/shared';
import { authCopy } from '../../copy';
import { PasswordVisibilityToggle } from '../../components/PasswordVisibilityToggle/PasswordVisibilityToggle';
import { ROUTES } from '../../../../app/config/routes';
import './ResetPassword.css';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();
  const copy = useCopy(authCopy);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<AuthErrorKey>();
  const [confirmPasswordError, setConfirmPasswordError] = useState<AuthErrorKey>();
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [formError, setFormError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const passwordsMatch = password === confirmPassword;
  const isFormInvalid = Boolean(validatePassword(password) || !confirmPassword || !passwordsMatch);

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
      await resetPassword(token, password, confirmPassword);
      setIsDone(true);
    } catch (error) {
      setFormError((error instanceof Error && error.message) || copy.somethingWrong);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <PageLayout>
        <Section className="auth-page">
          <Container>
            <AuthCard title={copy.resetTitle}>
              <p className="reset-password-message">{copy.resetLinkInvalid}</p>
              <p className="auth-switch">
                <Link to={ROUTES.FORGOT_PASSWORD}>{copy.requestNewLink}</Link>
              </p>
            </AuthCard>
          </Container>
        </Section>
      </PageLayout>
    );
  }

  if (isDone) {
    return (
      <PageLayout>
        <Section className="auth-page">
          <Container>
            <AuthCard title={copy.resetTitle}>
              <p className="reset-password-message">{copy.resetDone}</p>
              <Button variant="primary" onClick={() => navigate(ROUTES.LOGIN)}>
                {copy.loginButton}
              </Button>
            </AuthCard>
          </Container>
        </Section>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Section className="auth-page">
        <Container>
          <AuthCard title={copy.resetTitle}>
            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <Input
                type={passwordVisible ? 'text' : 'password'}
                label={copy.newPassword}
                placeholder={copy.newPasswordInputPlaceholder}
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
              <Input
                type={confirmPasswordVisible ? 'text' : 'password'}
                label={copy.confirmPassword}
                placeholder={copy.confirmPasswordPlaceholder}
                value={confirmPassword}
                onChange={(event) => updateConfirmPassword(event.target.value)}
                onBlur={() => {
                  setConfirmTouched(true);
                  setConfirmPasswordError(validateConfirmPassword(password, confirmPassword));
                }}
                error={confirmPasswordError ? copy.passwordsMismatch : undefined}
                statusText={confirmTouched && confirmPassword && passwordsMatch ? copy.passwordsMatch : undefined}
                autoComplete="new-password"
                trailing={
                  <PasswordVisibilityToggle
                    visible={confirmPasswordVisible}
                    showLabel={copy.passwordHidden}
                    hideLabel={copy.passwordVisible}
                    onToggle={() => setConfirmPasswordVisible((visible) => !visible)}
                  />
                }
              />
              {formError && <p className="auth-form-error">{formError}</p>}
              <Button type="submit" variant="primary" loading={isSubmitting} disabled={isFormInvalid}>
                {copy.resetButton}
              </Button>
            </form>
            <p className="auth-switch">
              <Link to={ROUTES.LOGIN}>{copy.backToLogin}</Link>
            </p>
          </AuthCard>
        </Container>
      </Section>
    </PageLayout>
  );
}
