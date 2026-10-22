import { useState } from 'react';
import type { Language } from '@sistem/types';
import { useI18n } from '@sistem/shared';
import { useAuth } from '../../../services/auth/AuthContext';
import { updatePreferences } from '../../../services/users/usersService';

/**
 * Her UI language (Phase 15): the screen switches at once, then it is saved as her language on every
 * device; if the save fails the screen switches back. Profile's settings and the Settings screen.
 */
export function useLanguagePreference() {
  const { language, setLanguage } = useI18n();
  const { updateUser } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  async function changeLanguage(next: Language) {
    if (next === language || isSaving) return;
    const previous = language;
    setLanguage(next);
    setFailed(false);
    setIsSaving(true);
    try {
      const updated = await updatePreferences({ language: next });
      updateUser({ language: updated.language });
    } catch {
      setLanguage(previous);
      setFailed(true);
    } finally {
      setIsSaving(false);
    }
  }

  return { language, changeLanguage, isSaving, failed };
}
