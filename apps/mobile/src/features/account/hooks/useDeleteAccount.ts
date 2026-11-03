import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveLanguage } from '@sistem/shared';
import { deleteAccount } from '../../../services/auth/authService';
import { useAuth } from '../../../services/auth/AuthContext';
import { ROUTES } from '../../../app/config/routes';
import { accountCopy } from '../copy';

/**
 * The delete-account sheet: her password, then DELETE /api/account. Gone = signed out on this device
 * and back to the login screen (the server already refuses her old tokens everywhere).
 */
export function useDeleteAccount(onClose: () => void) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [isDeleting, setIsDeleting] = useState(false);

  function close() {
    if (isDeleting) return;
    setPassword('');
    setError(undefined);
    onClose();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password || isDeleting) return;
    setError(undefined);
    setIsDeleting(true);
    try {
      await deleteAccount({ password });
      logout();
      navigate(ROUTES.LOGIN, { replace: true });
    } catch (deleteError) {
      // The server's sentence (wrong password, active trainees…) is already in her language.
      setError((deleteError instanceof Error && deleteError.message) || accountCopy[getActiveLanguage()].failed);
      setIsDeleting(false);
    }
  }

  return { password, setPassword, error, isDeleting, canSubmit: password.length > 0 && !isDeleting, submit, close };
}
