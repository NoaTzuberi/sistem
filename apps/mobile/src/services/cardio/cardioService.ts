import { createCardioApi } from '@sistem/api-client';
import { apiClient } from '../api/apiClient';

// Her cardio workouts (plan workouts of kind 'cardio'): one workout's page and its log — and her own
// cardio workouts (self-guided, outside any plan).
export const {
  getCardioWorkout,
  saveCardioLog,
  listOwnCardioWorkouts,
  getOwnCardioWorkout,
  createOwnCardioWorkout,
  updateOwnCardioWorkout,
  deleteOwnCardioWorkout,
} = createCardioApi(apiClient);
