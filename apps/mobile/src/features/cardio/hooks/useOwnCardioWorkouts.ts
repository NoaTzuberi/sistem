import { useLoad } from '@sistem/shared';
import { listOwnCardioWorkouts } from '../../../services/cardio/cardioService';

/** Her own cardio workouts (self-guided), newest first. A failed load shows nothing (the empty state stays). */
export function useOwnCardioWorkouts() {
  const { data, isLoading, reload } = useLoad(listOwnCardioWorkouts, '');
  return { workouts: data ?? [], isLoaded: data !== undefined, isLoading, reload };
}
