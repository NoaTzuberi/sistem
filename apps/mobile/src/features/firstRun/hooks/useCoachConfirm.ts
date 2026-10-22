import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { JoinPreview } from '@sistem/types';
import { fill, getActiveLanguage } from '@sistem/shared';
import { ROUTES, coachCodePath } from '../../../app/config/routes';
import type { CoachCodeMode } from '../../../app/config/routes';
import { landingPath } from '../../../app/router/landingPath';
import { useAuth } from '../../../services/auth/AuthContext';
import { JoinRequestError, acceptJoin, previewJoin } from '../../../services/invites/joinService';
import { firstRunCopy } from '../copy';

/**
 * "Is this your coach?": the coach card (from the code screen, else fetched again — a reopened link),
 * and "Yes" = the join on the server (Coaching 'waiting' + her primary community).
 */
export function useCoachConfirm(mode: CoachCodeMode, code: string) {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();
  const passed = (location.state as { preview?: JoinPreview } | null)?.preview;
  const [preview, setPreview] = useState<JoinPreview | null>(passed && passed.code === code ? passed : null);
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  const backToCode = useCallback(() => navigate(coachCodePath(mode), { replace: true }), [mode, navigate]);

  useEffect(() => {
    if (preview) return;
    let isCurrent = true;
    previewJoin(code)
      .then((loaded) => {
        if (!isCurrent) return;
        if (loaded.type !== 'coaching' || loaded.action !== 'join') backToCode();
        else setPreview(loaded);
      })
      .catch(() => isCurrent && backToCode());
    return () => {
      isCurrent = false;
    };
  }, [backToCode, code, preview]);

  async function confirm() {
    const copy = firstRunCopy[getActiveLanguage()];
    setIsJoining(true);
    setError(null);
    try {
      const response = await acceptJoin(code);
      setUser(response.user);
      if (mode === 'firstRun') {
        navigate(landingPath(response.user.appState), { replace: true });
      } else {
        navigate(ROUTES.TRAINEE_HOME, { replace: true, state: { joinedCoach: response.coachName } });
      }
    } catch (caught) {
      if (caught instanceof JoinRequestError && caught.status === 409 && caught.otherCoachName) {
        setError(fill(copy.confirm.otherCoach, { coach: caught.otherCoachName }));
      } else {
        setError(copy.confirm.failed);
      }
    } finally {
      setIsJoining(false);
    }
  }

  return { preview, error, isJoining, confirm, backToCode };
}
