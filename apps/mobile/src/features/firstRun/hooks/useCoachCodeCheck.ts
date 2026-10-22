import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fill, getActiveLanguage } from '@sistem/shared';
import { coachConfirmPath, joinPath } from '../../../app/config/routes';
import type { CoachCodeMode } from '../../../app/config/routes';
import { JoinRequestError, previewJoin } from '../../../services/invites/joinService';
import { firstRunCopy } from '../copy';

/**
 * Checks a code on the server (never in the app) and moves on: a coaching code → "Is this your coach?";
 * a community-only code → the regular /join screen. Anything else stays here with one inline error.
 */
export function useCoachCodeCheck(mode: CoachCodeMode) {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bumped on every refusal, so the shake plays again on a second wrong code.
  const [shakeKey, setShakeKey] = useState(0);

  const check = useCallback(
    async (code: string) => {
      const copy = firstRunCopy[getActiveLanguage()];
      setIsChecking(true);
      setError(null);
      try {
        const preview = await previewJoin(code);
        if (preview.type === 'community') {
          navigate(joinPath(code));
          return;
        }
        if (preview.action === 'other_coach') {
          setError(fill(copy.confirm.otherCoach, { coach: preview.otherCoachName ?? '' }));
        } else if (preview.action === 'not_trainee') {
          setError(copy.code.notTrainee);
        } else if (preview.action === 'already_hers') {
          setError(fill(copy.confirm.alreadyHers, { coach: preview.coachName }));
        } else {
          navigate(coachConfirmPath(mode, code), { state: { preview } });
          return;
        }
      } catch (caught) {
        setError(caught instanceof JoinRequestError && (caught.problem || caught.status === 404) ? copy.code.invalid : copy.code.failed);
      } finally {
        setIsChecking(false);
      }
      setShakeKey((key) => key + 1);
    },
    [mode, navigate],
  );

  return { check, isChecking, error, shakeKey, clearError: useCallback(() => setError(null), []) };
}
