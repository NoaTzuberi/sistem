import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCopy, useEndCoaching } from '@sistem/shared';
import { endMyCoaching } from '../../../services/coachings/coachingsService';
import { fetchCurrentUser } from '../../../services/auth/authService';
import { useAuth } from '../../../services/auth/AuthContext';
import { ROUTES } from '../../../app/config/routes';
import { profileCopy } from '../copy';

/**
 * She ends her own coaching: the shared confirm flow → the call → a fresh user from the server (self-guided
 * now, the server decides) → Home, which shows the toast once (`endedCoach` in the nav state).
 */
export function useEndMyCoaching(coachingId: string | null, coachName: string) {
  const copy = useCopy(profileCopy).myCoach;
  const { setUser, updateUser } = useAuth();
  const navigate = useNavigate();

  const end = useCallback(async () => {
    await endMyCoaching(coachingId ?? undefined);
    // It ended on the server: a failed refresh must not read as a failed end.
    try {
      setUser(await fetchCurrentUser());
    } catch {
      updateUser({ coachingStatus: null });
    }
  }, [coachingId, setUser, updateUser]);

  const onEnded = useCallback(() => {
    navigate(ROUTES.TRAINEE_HOME, { replace: true, state: { endedCoach: coachName } });
  }, [coachName, navigate]);

  return useEndCoaching(end, onEnded, copy.error);
}
