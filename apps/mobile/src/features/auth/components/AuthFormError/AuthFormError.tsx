import { Link } from 'react-router-dom';
import { sharedCopy, useCopy } from '@sistem/shared';
import { authCopy } from '../../copy';
import type { AuthFailure } from '../../data/authFailure';
import { ROUTES } from '../../../../app/config/routes';
import './AuthFormError.css';

interface AuthFormErrorProps {
  failure: AuthFailure | undefined;
  /** The generic line for an unknown error (sign-up or login). */
  fallback: string;
}

/** The form-level error line of the auth card. Field errors show under their field, not here. */
export function AuthFormError({ failure, fallback }: AuthFormErrorProps) {
  const copy = useCopy(authCopy);
  const shared = useCopy(sharedCopy);
  if (!failure || failure.kind === 'field') return null;

  if (failure.kind === 'emailTaken') {
    return (
      <p className="auth-form-error" role="alert">
        {copy.emailTaken}{' '}
        <Link className="auth-form-error-link" to={ROUTES.LOGIN}>{copy.emailTakenLogin}</Link>
      </p>
    );
  }

  const text =
    failure.kind === 'noConnection' ? shared.common.noConnection
      : failure.kind === 'rateLimited' ? shared.common.tooManyAttempts
        : failure.kind === 'message' ? failure.text
          : fallback;
  return <p className="auth-form-error" role="alert">{text}</p>;
}
