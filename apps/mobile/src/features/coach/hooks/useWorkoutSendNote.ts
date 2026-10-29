import { useSendNote } from '@sistem/shared';
import { getSendDefaults, saveSendDefaults } from '../../../services/coach/coachService';

const API = { getSendDefaults, saveSendDefaults };

/** The publish sheet's message + tip for a workout plan (rules: @sistem/shared sendNote). */
export function useWorkoutSendNote() {
  return useSendNote('workouts', API);
}
