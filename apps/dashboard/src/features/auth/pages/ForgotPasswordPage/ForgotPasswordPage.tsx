import { useId } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { fill, useCopy } from '@sistem/shared';
import { appCopy } from '../../../../copy';
import { ROUTES } from '../../../../app/config/routes';
import { LoginField } from '../../components/LoginField/LoginField';
import { MailIcon } from '../../components/LoginIcons/LoginIcons';
import { PasswordCard } from '../../components/PasswordCard/PasswordCard';
import { usePasswordResetRequest } from '../../hooks/usePasswordReset';
import './ForgotPasswordPage.css';

/** Login → "forgot password": the email (prefilled from the login screen) → the reset link by email. */
export function ForgotPasswordPage() {
  const appText = useCopy(appCopy);
  const copy = appText.passwordReset;
  const location = useLocation();
  const initialEmail = (location.state as { email?: string } | null)?.email ?? '';
  const request = usePasswordResetRequest(initialEmail);
  const errorId = useId();

  const errorLine = request.error && (
    <p className="pw-error" id={errorId} role="alert">
      {request.error}
    </p>
  );

  return (
    <PasswordCard title={copy.requestTitle} stateKey={request.isSent ? 'sent' : 'form'}>
      {request.isSent ? (
        <>
          <p className="pw-text" role="status">
            {copy.sentText}
          </p>
          <button className="pw-secondary" type="button" onClick={request.resend} disabled={request.secondsLeft > 0 || request.isSending}>
            {request.secondsLeft > 0 ? fill(copy.resendIn, { seconds: request.secondsLeft }) : request.isSending ? copy.sending : copy.resend}
          </button>
          {errorLine}
        </>
      ) : (
        <form className="pw-form" onSubmit={request.submit} noValidate>
          <p className="pw-text">{copy.requestText}</p>
          <LoginField
            label={appText.email}
            icon={<MailIcon />}
            type="email"
            inputMode="email"
            dir="ltr"
            autoComplete="email"
            value={request.email}
            onChange={(event) => request.setEmail(event.target.value)}
            aria-invalid={Boolean(request.error)}
            aria-describedby={request.error ? errorId : undefined}
            required
          />
          {errorLine}
          <button className="pw-submit" type="submit" disabled={request.isSending}>
            {request.isSending ? copy.sending : copy.send}
          </button>
        </form>
      )}
      <Link className="pw-back forgot-password-back" to={ROUTES.LOGIN}>
        {copy.toLogin}
      </Link>
    </PasswordCard>
  );
}
