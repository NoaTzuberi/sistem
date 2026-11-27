import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCopy } from '@sistem/shared';
import { ROUTES } from '../../../app/config/routes';
import { useAuth } from '../../../services/auth/AuthContext';
import { enableOwnCoachMode } from '../../../services/admin/adminService';
import { hasRole } from '../../auth/data/roles';
import { adminCopy } from '../copy';

/**
 * "Coach mode for my account": the server adds the coach role + her profile to THIS account (idempotent),
 * then she lands on the coach dashboard. Offered only while her account has no coach role.
 */
export function useOwnCoachMode() {
  const copy = useCopy(adminCopy);
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function enable() {
    setIsBusy(true);
    setError(undefined);
    try {
      updateUser(await enableOwnCoachMode());
      navigate(ROUTES.HOME);
    } catch (failure) {
      setError((failure instanceof Error && failure.message) || copy.actionError);
    } finally {
      setIsBusy(false);
    }
  }

  return { isOffered: !hasRole(user, 'coach'), isBusy, error, enable };
}
