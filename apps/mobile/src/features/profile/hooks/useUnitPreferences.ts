import { useState } from 'react';
import type { UnitPreferences } from '@sistem/types';
import { useAuth } from '../../../services/auth/AuthContext';
import { updatePreferences } from '../../../services/users/usersService';
import { useMyUnits } from './useMyBody';

/**
 * Her display units (Settings): saved on her account (PATCH /users/preferences). Only what she sees
 * changes — body values are always stored in kg / cm and converted on screen.
 */
export function useUnitPreferences() {
  const { updateUser } = useAuth();
  const { units } = useMyUnits();
  const [isSaving, setIsSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  async function changeUnits(patch: Partial<UnitPreferences>) {
    setFailed(false);
    setIsSaving(true);
    try {
      const updated = await updatePreferences({ units: patch });
      updateUser({ units: updated.units });
    } catch {
      setFailed(true);
    } finally {
      setIsSaving(false);
    }
  }

  return { units, changeUnits, isSaving, failed };
}
