import { createTraineeApi } from '@sistem/api-client';
import { apiClient } from '../api/apiClient';

// Free workouts (her own, outside any plan): start one, add an exercise to it, and the exercise picker.
export const { startFreeWorkout, addFreeExercise, searchFreeExercises } = createTraineeApi(apiClient);
