import { getActiveLanguage } from '@sistem/shared';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import type { WorkoutLog, WorkoutLogSetUpdate, WorkoutLogStatus, WorkoutSession } from '@sistem/types';
import { extractErrorMessage } from '@sistem/api-client';
import {
  abandonWorkout,
  finishWorkout as finishWorkoutRequest,
  getSession,
  updateWorkoutSets,
} from '../../../services/workoutLogs/workoutLogsService';
import { clearCachedSession, loadCachedSession, saveCachedSession } from '../data/sessionCache';
import type { CachedSession } from '../data/sessionCache';
import { MAX_SETS_PER_EXERCISE, SYNC_DEBOUNCE_MS, SYNC_RETRY_MS } from '../data/sessionConfig';
import {
  applyUpdates,
  buildSessionModel,
  carryForward,
  initialValues,
  restAfter,
  setKey,
  toSetUpdate,
  withPendingExtraSets,
} from '../data/sessionSets';
import type { SessionModel, SetValues, SetValuesByKey } from '../data/sessionSets';
import { workoutCopy } from '../copy';

export type SyncState = 'saved' | 'saving' | 'offline';

export interface RestState {
  endsAt: number;
  totalSec: number;
}

export type FinishResult =
  | { kind: 'finished'; log: WorkoutLog }
  | { kind: 'queued' }
  | { kind: 'error'; message: string };

/** No response at all: offline, or the server is unreachable. */
function isNetworkError(error: unknown): boolean {
  return axios.isAxiosError(error) && !error.response;
}

function statusOf(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}

/**
 * The active session: the server's log merged with the changes kept on the phone,
 * saved locally on every change and sent to the server in small batches. The server
 * stays the source of truth — when it says the workout is no longer in progress
 * (finished or discarded on another device), the local copy is dropped.
 */
export function useWorkoutSession(logId: string) {
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [values, setValues] = useState<SetValuesByKey>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ended, setEnded] = useState<{ status: WorkoutLogStatus } | null>(null);
  const [syncState, setSyncState] = useState<SyncState>('saved');
  const [rest, setRest] = useState<RestState | null>(null);
  const [finishQueued, setFinishQueued] = useState(false);

  // Refs mirror what the async sync loop reads, so it never sees a stale render.
  const cacheRef = useRef<CachedSession | null>(null);
  const valuesRef = useRef<SetValuesByKey>({});
  const inFlightRef = useRef(false);
  const timerRef = useRef<number | undefined>(undefined);
  const flushRef = useRef<() => void>(() => undefined);
  const finishingRef = useRef(false);

  const model = useMemo<SessionModel | null>(() => (session ? buildSessionModel(session) : null), [session]);
  const modelRef = useRef<SessionModel | null>(null);
  modelRef.current = model;

  const persist = useCallback(() => {
    if (cacheRef.current) saveCachedSession(logId, cacheRef.current);
  }, [logId]);

  const endSession = useCallback(
    (status: WorkoutLogStatus) => {
      window.clearTimeout(timerRef.current);
      cacheRef.current = null;
      clearCachedSession(logId);
      setEnded({ status });
    },
    [logId],
  );

  /** Another device finished or discarded it: find out which, then leave. */
  const handleNotActive = useCallback(async () => {
    try {
      const fresh = await getSession(logId);
      endSession(fresh.log.status);
    } catch {
      endSession('abandoned');
    }
  }, [endSession, logId]);

  const scheduleFlush = useCallback((delayMs: number) => {
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => flushRef.current(), delayMs);
  }, []);

  const flush = useCallback(async () => {
    const cached = cacheRef.current;
    if (!cached || inFlightRef.current || finishingRef.current) return;
    const snapshot = { ...cached.pending };
    if (Object.keys(snapshot).length === 0) {
      setSyncState('saved');
      return;
    }

    inFlightRef.current = true;
    setSyncState('saving');
    try {
      await updateWorkoutSets(logId, Object.values(snapshot));
      const current = cacheRef.current;
      if (current) {
        // Only what was sent and not changed again since is confirmed.
        for (const [key, update] of Object.entries(snapshot)) {
          if (current.pending[key] === update) delete current.pending[key];
        }
        persist();
        if (Object.keys(current.pending).length > 0) scheduleFlush(SYNC_DEBOUNCE_MS);
        else setSyncState('saved');
      }
    } catch (error) {
      const status = statusOf(error);
      if (status === 409) {
        void handleNotActive();
      } else if (status === 400 || status === 404) {
        // The server will never take these (e.g. the set left the plan): don't retry forever.
        const current = cacheRef.current;
        if (current) {
          for (const key of Object.keys(snapshot)) delete current.pending[key];
          persist();
        }
        if (status === 404) endSession('abandoned');
        else setSyncState('saved');
      } else {
        setSyncState('offline');
        scheduleFlush(SYNC_RETRY_MS);
      }
    } finally {
      inFlightRef.current = false;
    }
  }, [endSession, handleNotActive, logId, persist, scheduleFlush]);

  flushRef.current = () => void flush();

  // Load: the server's copy, with the phone's unsent changes on top. Offline, the
  // last copy kept on the phone opens instead.
  useEffect(() => {
    let cancelled = false;
    const cached = loadCachedSession(logId);

    function open(server: WorkoutSession, base: CachedSession | null) {
      const fresh = withPendingExtraSets(server, Object.values(base?.pending ?? {}));
      const next: CachedSession = {
        session: fresh,
        pending: base?.pending ?? {},
        touched: base?.touched ?? [],
        restEndsAt: base?.restEndsAt ?? null,
        restTotalSec: base?.restTotalSec ?? null,
        finishRequested: base?.finishRequested ?? false,
      };
      cacheRef.current = next;
      saveCachedSession(logId, next);
      const merged = applyUpdates(initialValues(fresh), Object.values(next.pending));
      valuesRef.current = merged;
      setValues(merged);
      setSession(fresh);
      if (next.restEndsAt && next.restTotalSec && next.restEndsAt > Date.now()) {
        setRest({ endsAt: next.restEndsAt, totalSec: next.restTotalSec });
      }
      setFinishQueued(next.finishRequested);
    }

    getSession(logId)
      .then((fresh) => {
        if (cancelled) return;
        if (fresh.log.status !== 'in_progress') {
          endSession(fresh.log.status);
          return;
        }
        open(fresh, cached);
        if (Object.keys(cacheRef.current?.pending ?? {}).length > 0) flushRef.current();
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (cached && (isNetworkError(error) || (statusOf(error) ?? 0) >= 500)) {
          open(cached.session, cached);
          setSyncState('offline');
          scheduleFlush(SYNC_RETRY_MS);
        } else if (statusOf(error) === 404) {
          clearCachedSession(logId);
          setLoadError(workoutCopy[getActiveLanguage()].session.notFound);
        } else {
          setLoadError(extractErrorMessage(error, workoutCopy[getActiveLanguage()].session.loadError));
        }
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timerRef.current);
    };
  }, [endSession, logId, scheduleFlush]);

  /** Applies changes to some sets: on screen, on the phone, then (soon) to the server. */
  const commit = useCallback(
    (changes: SetValuesByKey) => {
      const cached = cacheRef.current;
      const currentModel = modelRef.current;
      if (!cached || !currentModel) return;
      const next = { ...valuesRef.current, ...changes };
      for (const [key, changed] of Object.entries(changes)) {
        const set = currentModel.setByKey.get(key);
        if (set) cached.pending[key] = toSetUpdate(set, changed);
      }
      valuesRef.current = next;
      setValues(next);
      persist();
      scheduleFlush(SYNC_DEBOUNCE_MS);
    },
    [persist, scheduleFlush],
  );

  /** Edits a number on a set (reps / weight / seconds). */
  const editSet = useCallback(
    (key: string, patch: Partial<Omit<SetValues, 'completed'>>) => {
      const cached = cacheRef.current;
      const current = valuesRef.current[key];
      if (!cached || !current) return;
      if (!cached.touched.includes(key)) cached.touched.push(key);
      commit({ [key]: { ...current, ...patch } });
    },
    [commit],
  );

  /**
   * "+ Extra set": a working set after the exercise's last one, with that set's numbers.
   * It joins the phone's copy of the log at once (so the screen and a reload show it); the
   * server adds it when the update for the next set index arrives.
   */
  const addSet = useCallback(
    (planExerciseId: string) => {
      const cached = cacheRef.current;
      if (!cached) return;
      const logSets = cached.session.log.sets.filter((set) => set.planExerciseId === planExerciseId);
      const last = logSets.reduce<(typeof logSets)[number] | undefined>(
        (latest, set) => (!latest || set.setIndex > latest.setIndex ? set : latest),
        undefined,
      );
      if (!last || logSets.length >= MAX_SETS_PER_EXERCISE) return;

      const lastValues = valuesRef.current[setKey(planExerciseId, last.setIndex)];
      const values: SetValues = {
        reps: lastValues?.reps ?? last.reps,
        weight: lastValues?.weight ?? last.weight,
        durationSec: lastValues?.durationSec ?? last.durationSec,
        completed: false,
      };
      const setIndex = last.setIndex + 1;
      const key = setKey(planExerciseId, setIndex);
      const fresh: WorkoutSession = {
        ...cached.session,
        log: {
          ...cached.session.log,
          sets: [
            ...cached.session.log.sets,
            { exerciseId: last.exerciseId, planExerciseId, setIndex, type: 'working', ...values, completed: false },
          ],
        },
      };
      cached.session = fresh;
      cached.pending[key] = { planExerciseId, setIndex, reps: values.reps ?? null, weight: values.weight ?? null, durationSec: values.durationSec ?? null, completed: false };
      valuesRef.current = { ...valuesRef.current, [key]: values };
      setValues(valuesRef.current);
      setSession(fresh);
      persist();
      scheduleFlush(SYNC_DEBOUNCE_MS);
    },
    [persist, scheduleFlush],
  );

  const saveRest = useCallback(
    (next: RestState | null) => {
      setRest(next);
      if (cacheRef.current) {
        cacheRef.current.restEndsAt = next?.endsAt ?? null;
        cacheRef.current.restTotalSec = next?.totalSec ?? null;
        persist();
      }
    },
    [persist],
  );

  /**
   * Marks a set done or not done (with optional final values, e.g. the seconds a hold
   * lasted). Done: later untouched sets take its values, and the rest timer starts —
   * except for the interval timer, which runs its own rests (`startRest: false`).
   */
  const setCompleted = useCallback(
    (
      key: string,
      completed: boolean,
      patch: Partial<Omit<SetValues, 'completed'>> = {},
      { startRest = true }: { startRest?: boolean } = {},
    ) => {
      const cached = cacheRef.current;
      const currentModel = modelRef.current;
      const current = valuesRef.current[key];
      if (!cached || !currentModel || !current) return;

      const updated = { ...current, ...patch, completed };
      const withSet = { ...valuesRef.current, [key]: updated };
      const carried = completed ? carryForward(currentModel, withSet, key, new Set(cached.touched)) : {};
      commit({ [key]: updated, ...carried });

      if (completed && startRest) {
        const restSec = restAfter(currentModel, { ...withSet, ...carried }, key);
        saveRest(restSec ? { endsAt: Date.now() + restSec * 1000, totalSec: restSec } : null);
      }
    },
    [commit, saveRest],
  );

  const adjustRest = useCallback(
    (deltaSec: number) => {
      if (!rest) return;
      const endsAt = Math.max(Date.now(), rest.endsAt + deltaSec * 1000);
      saveRest({ endsAt, totalSec: Math.max(1, rest.totalSec + deltaSec) });
    },
    [rest, saveRest],
  );

  const endRest = useCallback(() => saveRest(null), [saveRest]);

  const finish = useCallback(async (): Promise<FinishResult> => {
    const cached = cacheRef.current;
    if (!cached || finishingRef.current) return { kind: 'error', message: workoutCopy[getActiveLanguage()].session.finishError };
    finishingRef.current = true;
    window.clearTimeout(timerRef.current);
    try {
      // The last unsent changes travel with the finish, so nothing is lost on the way.
      const updates: WorkoutLogSetUpdate[] = Object.values(cached.pending);
      const log = await finishWorkoutRequest(logId, updates);
      cacheRef.current = null;
      clearCachedSession(logId);
      return { kind: 'finished', log };
    } catch (error) {
      const status = statusOf(error);
      if (status === 409) {
        void handleNotActive();
        return { kind: 'error', message: workoutCopy[getActiveLanguage()].session.notActive };
      }
      if (status !== undefined && status < 500) {
        return { kind: 'error', message: extractErrorMessage(error, workoutCopy[getActiveLanguage()].session.finishError) };
      }
      cached.finishRequested = true;
      persist();
      setFinishQueued(true);
      setSyncState('offline');
      return { kind: 'queued' };
    } finally {
      finishingRef.current = false;
    }
  }, [handleNotActive, logId, persist]);

  const discard = useCallback(async (): Promise<string | null> => {
    try {
      await abandonWorkout(logId);
      endSession('abandoned');
      return null;
    } catch (error) {
      if (statusOf(error) === 409) {
        void handleNotActive();
        return null;
      }
      return isNetworkError(error) ? workoutCopy[getActiveLanguage()].session.discardOffline : extractErrorMessage(error, workoutCopy[getActiveLanguage()].session.discardError);
    }
  }, [endSession, handleNotActive, logId]);

  // Back online / back in the foreground: send what is waiting right away.
  useEffect(() => {
    function retry() {
      if (document.visibilityState === 'visible' || navigator.onLine) flushRef.current();
    }
    window.addEventListener('online', retry);
    document.addEventListener('visibilitychange', retry);
    return () => {
      window.removeEventListener('online', retry);
      document.removeEventListener('visibilitychange', retry);
    };
  }, []);

  return {
    session,
    model,
    values,
    loadError,
    ended,
    syncState,
    rest,
    finishQueued,
    editSet,
    addSet,
    setCompleted,
    adjustRest,
    endRest,
    finish,
    discard,
  };
}
