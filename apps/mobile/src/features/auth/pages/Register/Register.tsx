import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconAt, IconKey, IconUser } from '@tabler/icons-react';
import { landingPath } from '../../../../app/router/landingPath';
import { AuthScreen } from '../../components/AuthScreen/AuthScreen';
import { JoinBanner } from '../../../firstRun/components/JoinBanner/JoinBanner';
import { useJoiningCoach } from '../../../firstRun/hooks/useJoiningCoach';
import { AuthField } from '../../components/AuthField/AuthField';
import { AuthSubmitButton } from '../../components/AuthSubmitButton/AuthSubmitButton';
import { SocialButtons } from '../../components/SocialButtons/SocialButtons';
import { useAuth } from '../../../../services/auth/AuthContext';
import { authErrorText, validateName, validateEmail, validatePassword, type AuthErrorKey } from '../../validation';
import { useCopy } from '@sistem/shared';
import { authCopy } from '../../copy';
import { PasswordVisibilityToggle } from '../../components/PasswordVisibilityToggle/PasswordVisibilityToggle';
import { ROUTES, joinPath } from '../../../../app/config/routes';
import './Register.css';

export function Register() {
  // Came through a coach's link: "Joining <coach>'s coaching" from the sign-up on.
  const joiningCoach = useJoiningCoach(false);
  const navigate = useNavigate();
  const { register } = useAuth();
  const copy = useCopy(authCopy);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [nameError, setNameError] = useState<AuthErrorKey>();
  const [emailError, setEmailError] = useState<AuthErrorKey>();
  const [passwordError, setPasswordError] = useState<AuthErrorKey>();
  const [formError, setFormError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const passwordsMatch = confirmPassword === password;
  const showConfirmStatus = confirmTouched;
  const isFormInvalid = Boolean(
    validateName(name) || validateEmail(email) || validatePassword(password) || !confirmPassword || !passwordsMatch,
  );

  function handleConfirmBlur() {
    setConfirmTouched(true);
  }

  function updateConfirmPassword(value: string) {
    setConfirmPassword(value);
  }

  function updatePassword(value: string) {
    setPassword(value);
    if (passwordError) setPasswordError(validatePassword(value));
  }

  function updateName(value: string) {
    setName(value);
    if (nameError) setNameError(validateName(value));
  }

  function updateEmail(value: string) {
    setEmail(value);
    if (emailError) setEmailError(validateEmail(value));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(undefined);

    const nextNameError = validateName(name);
    const nextEmailError = validateEmail(email);
    const nextPasswordError = validatePassword(password);
    const nextConfirmPasswordError = !confirmPassword || !passwordsMatch;
    setNameError(nextNameError);
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);

    setConfirmTouched(true);
    if (nextNameError || nextEmailError || nextPasswordError || nextConfirmPasswordError) return;

    setIsSubmitting(true);
    try {
      const { inviteCode, inviteError, user } = await register({ name, email, password, confirmPassword });
      // A code that couldn't be used: its screen says why (no dead end — "Continue" goes on). Otherwise the
      // server's state: the "how do you want to train" choice, or straight into the questionnaire (a link).
      navigate(inviteCode && inviteError ? joinPath(inviteCode) : landingPath(user.appState));
    } catch (error) {
      setFormError((error instanceof Error && error.message) || copy.registerFailed);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthScreen
      title={copy.registerTitle}
      switchLabel={copy.loginLink}
      switchTo={ROUTES.LOGIN}
      banner={joiningCoach ? <JoinBanner coachName={joiningCoach} /> : undefined}
    >
      <form className="auth-glass-form" onSubmit={handleSubmit} noValidate>
        <AuthField
          type="text"
          label={copy.name}
          icon={<IconUser size={20} />}
          placeholder={copy.namePlaceholder}
          value={name}
          onChange={(event) => updateName(event.target.value)}
          onBlur={() => setNameError(validateName(name))}
          error={authErrorText(copy, nameError)}
          autoComplete="name"
          autoCapitalize="words"
          enterKeyHint="next"
        />
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
          onChange={(event) => updateEmail(event.target.value)}
          onBlur={() => setEmailError(validateEmail(email))}
          error={authErrorText(copy, emailError)}
          autoComplete="email"
        />
        <AuthField
          type={passwordVisible ? 'text' : 'password'}
          label={copy.password}
          icon={<IconKey size={20} />}
          placeholder={copy.password}
          helperText={copy.newPasswordPlaceholder}
          value={password}
          onChange={(event) => updatePassword(event.target.value)}
          onBlur={() => setPasswordError(validatePassword(password))}
          error={authErrorText(copy, passwordError)}
          autoComplete="new-password"
          enterKeyHint="next"
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
          placeholder={copy.confirmPasswordPlaceholder}
          value={confirmPassword}
          onChange={(event) => updateConfirmPassword(event.target.value)}
          onBlur={handleConfirmBlur}
          error={showConfirmStatus && (!confirmPassword || !passwordsMatch) ? copy.passwordsMismatch : undefined}
          statusText={showConfirmStatus && passwordsMatch && confirmPassword ? copy.passwordsMatch : undefined}
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
        <AuthSubmitButton loading={isSubmitting} disabled={isFormInvalid}>{copy.registerButton}</AuthSubmitButton>
        <SocialButtons />
      </form>
    </AuthScreen>
  );
}
