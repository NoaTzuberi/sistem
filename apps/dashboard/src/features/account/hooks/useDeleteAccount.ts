import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveLanguage } from '@sistem/shared';
import { deleteAccount } from '../../../services/auth/authService';
import { useAuth } from '../../../services/auth/AuthContext';
import { ROUTES } from '../../../app/config/routes';
import { accountCopy } from '../copy';

/**
 * The delete-account sheet: her password, then DELETE /api/account. Gone = signed out here and back
 * to the login screen. The server refuses while she has live trainees (its sentence is shown).
 */
export function useDeleteAccount() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [isDeleting, setIsDeleting] = useState(false);

  function close() {
    if (isDeleting) return;
    setIsOpen(false);
    setPassword('');
    setError(undefined);
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
      setError((deleteError instanceof Error && deleteError.message) || accountCopy[getActiveLanguage()].failed);
      setIsDeleting(false);
    }
  }

  return {
    isOpen,
    open: () => setIsOpen(true),
    close,
    password,
    setPassword,
    error,
    isDeleting,
    canSubmit: password.length > 0 && !isDeleting,
    submit,
  };
}
