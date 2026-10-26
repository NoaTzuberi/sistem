import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCopy } from '@sistem/shared';
import { appCopy } from '../../../copy';
import { ROUTES } from '../../../app/config/routes';
import { setPassword } from '../../../services/auth/authService';
import { useAuth } from '../../../services/auth/AuthContext';
import { dashboardHome } from '../data/roles';

// Same minimum as the server (auth.validation MIN_PASSWORD_LENGTH); the server checks it again.
const MIN_PASSWORD_LENGTH = 8;

/** The one-time link: the token from the URL, two password fields, then she is signed in. `onSaved` hides shown passwords. */
export function useSetPassword(onSaved?: () => void) {
  const copy = useCopy(appCopy).setPassword;
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const { signInWithToken } = useAuth();
  const [password, setPasswordValue] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) return setError(copy.tooShort);
    if (password !== confirm) return setError(copy.mismatch);
    setError(undefined);
    setIsSaving(true);
    try {
      const { token: session, user } = await setPassword(token, password);
      onSaved?.();
      signInWithToken(session, user);
      navigate(dashboardHome(user, { home: ROUTES.HOME, admin: ROUTES.ADMIN_COACHES }) ?? ROUTES.LOGIN, { replace: true });
    } catch (saveError) {
      setError((saveError instanceof Error && saveError.message) || copy.failed);
    } finally {
      setIsSaving(false);
    }
  }

  return { hasToken: token.length > 0, password, setPassword: setPasswordValue, confirm, setConfirm, error, isSaving, submit };
}
