import { useCallback } from 'react';
import type { MyCoaching } from '@sistem/types';
import { useLoad } from '@sistem/shared';
import { listMyCoachings } from '../services/coachings/coachingsService';

/**
 * Her live coachings — a LIST (one today; several once multi-coach is on). The plan / log hooks take
 * one of their ids; the app shows her current coaching until the UI groups workouts by coach.
 * Errors leave the list empty (the screens never depend on it yet).
 */
export function useActiveCoachings(enabled = true): { coachings: MyCoaching[]; isLoading: boolean; reload: () => void } {
  const load = useCallback(() => (enabled ? listMyCoachings() : Promise.resolve([])), [enabled]);
  const { data, isLoading, reload } = useLoad(load, '');
  return { coachings: data ?? [], isLoading, reload };
}
