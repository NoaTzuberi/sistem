import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { extractErrorMessage } from '@sistem/api-client';
import { useCopy } from '@sistem/shared';
import type { WorkoutLog } from '@sistem/types';
import { startFreeWorkout } from '../../../services/workoutLogs/freeWorkoutService';
import { listWorkoutLogs } from '../../../services/workoutLogs/workoutLogsService';
import { workoutSessionPath } from '../../../app/config/routes';
import type { FreeWorkoutMode, FreeWorkoutMuscle, StartFreeWorkoutPayload } from '../data/freeWorkout';
import { workoutCopy } from '../copy';

/**
 * The free-workout sheet's choices and its Start. Start calls the PROPOSED endpoint
 * (freeWorkoutService) and opens the existing session screen — the server side waits for approval.
 */
/** Past workouts offered for "repeat": the newest completed log of each workout. */
const RECENT_LOGS = 8;

function recentDistinct(logs: WorkoutLog[]): WorkoutLog[] {
  const seen = new Set<string>();
  const picked: WorkoutLog[] = [];
  for (const log of logs) {
    const key = `${log.planId}:${log.workoutId}:${log.workoutTitle}`;
    if (log.status !== 'completed' || seen.has(key)) continue;
    seen.add(key);
    picked.push(log);
    if (picked.length === RECENT_LOGS) break;
  }
  return picked;
}

export function useFreeWorkout(isOpen: boolean) {
  const copy = useCopy(workoutCopy);
  const navigate = useNavigate();
  const [mode, setMode] = useState<FreeWorkoutMode>('scratch');
  const [muscles, setMuscles] = useState<FreeWorkoutMuscle[]>([]);
  const [fromLogId, setFromLogId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentLogs, setRecentLogs] = useState<WorkoutLog[] | null>(null);

  // Her past workouts, for "repeat", once the sheet first opens.
  useEffect(() => {
    if (!isOpen || recentLogs) return;
    let isCurrent = true;
    listWorkoutLogs()
      .then((logs) => {
        if (isCurrent) setRecentLogs(recentDistinct(logs));
      })
      .catch(() => {
        if (isCurrent) setRecentLogs([]);
      });
    return () => {
      isCurrent = false;
    };
  }, [isOpen, recentLogs]);

  function toggleMuscle(muscle: FreeWorkoutMuscle) {
    setMuscles((current) => (current.includes(muscle) ? current.filter((id) => id !== muscle) : [...current, muscle]));
  }

  const payload: StartFreeWorkoutPayload | null =
    mode === 'scratch'
      ? { mode }
      : mode === 'repeat'
        ? fromLogId
          ? { mode, fromLogId }
          : null
        : muscles.length > 0
          ? { mode, muscles }
          : null;

  async function start() {
    if (!payload) return;
    setIsStarting(true);
    setError(null);
    try {
      const { session, resumed } = await startFreeWorkout(payload);
      navigate(workoutSessionPath(session.log.id), { state: { justStarted: !resumed } });
    } catch (caught) {
      if (axios.isAxiosError(caught) && !caught.response) setError(copy.session.startOffline);
      else setError(extractErrorMessage(caught, copy.session.startError));
    } finally {
      setIsStarting(false);
    }
  }

  function reset() {
    setMode('scratch');
    setMuscles([]);
    setFromLogId(null);
    setError(null);
  }

  return { recentLogs, mode, setMode, muscles, toggleMuscle, fromLogId, setFromLogId, canStart: payload !== null, start, isStarting, error, reset };
}
