import type { WorkoutSession } from '@sistem/types';
import { apiClient } from '../api/apiClient';
import type { StartFreeWorkoutPayload } from '../../features/workouts/data/freeWorkout';

// PROPOSED endpoint (not on the server yet — see docs/phase-reports/design-trainee-workouts.md). It moves
// into @sistem/api-client with the server change once the owner approves it.
export async function startFreeWorkout(payload: StartFreeWorkoutPayload): Promise<{ session: WorkoutSession; resumed: boolean }> {
  const { data } = await apiClient.post<{ session: WorkoutSession; resumed: boolean }>('/workout-logs/free', payload);
  return data;
}
