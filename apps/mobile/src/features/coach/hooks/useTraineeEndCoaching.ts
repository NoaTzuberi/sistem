import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { sharedCopy, useCopy, useEndCoaching } from '@sistem/shared';
import { coachTraineesPath } from '../../../app/config/routes';
import { endCoaching } from '../../../services/coach/coachService';

/** "סיום ליווי" on her page: confirm → the call → the list's archive, where she now is. */
export function useTraineeEndCoaching(traineeId: string) {
  const navigate = useNavigate();
  const copy = useCopy(sharedCopy).coach.endCoaching;
  const end = useCallback(() => endCoaching(traineeId), [traineeId]);
  const onEnded = useCallback(() => navigate(coachTraineesPath('archive'), { replace: true }), [navigate]);
  return useEndCoaching(end, onEnded, copy.error);
}
