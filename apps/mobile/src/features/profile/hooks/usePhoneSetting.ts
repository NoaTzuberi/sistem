import { useState } from 'react';
import { extractErrorMessage } from '@sistem/api-client';
import { getActiveLanguage } from '@sistem/shared';
import { useAuth } from '../../../services/auth/AuthContext';
import { updatePhone } from '../../../services/users/usersService';
import { profileCopy } from '../copy';

/**
 * Her optional phone in Settings: a sheet with one field. The server checks and normalizes it (E.164);
 * its message (in her language) shows under the field when the number isn't valid.
 */
export function usePhoneSetting(showToast: (message: string) => void) {
  const { user, updateUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);

  function open() {
    setDraft(user?.phone ?? '');
    setError(undefined);
    setIsOpen(true);
  }

  async function save(value: string | null) {
    setIsSaving(true);
    setError(undefined);
    try {
      const updated = await updatePhone(value);
      updateUser({ phone: updated.phone });
      setIsOpen(false);
      const copy = profileCopy[getActiveLanguage()].phone;
      showToast(updated.phone ? copy.saved : copy.cleared);
    } catch (caught) {
      setError(extractErrorMessage(caught, profileCopy[getActiveLanguage()].phone.saveError));
    } finally {
      setIsSaving(false);
    }
  }

  return {
    phone: user?.phone ?? null,
    isOpen,
    open,
    close: () => setIsOpen(false),
    draft,
    setDraft,
    error,
    isSaving,
    save: () => save(draft.trim() || null),
    clear: () => save(null),
  };
}

export type PhoneSetting = ReturnType<typeof usePhoneSetting>;
