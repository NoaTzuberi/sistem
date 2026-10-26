import { useCallback } from 'react';
import { sharedCopy, useCopy, useLoad } from '@sistem/shared';
import { listTraineeCardioLogs, listTraineeWorkoutLogs } from '../../../services/coach/coachService';
import { mergeLoggedWorkouts } from '../data/loggedWorkouts';

/** Her finished workouts, strength and cardio, newest first (the coach's read: her coaching + her own). */
export function useTraineeWorkouts(traineeId: string) {
  const copy = useCopy(sharedCopy).coach;
  const load = useCallback(
    async () => {
      const [strength, cardio] = await Promise.all([listTraineeWorkoutLogs(traineeId), listTraineeCardioLogs(traineeId)]);
      return mergeLoggedWorkouts(strength, cardio);
    },
    [traineeId],
  );
  return useLoad(load, copy.logsLoadError);
}
