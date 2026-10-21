import { createCardioApi } from '@sistem/api-client';
import { apiClient } from '../api/apiClient';

// Her cardio workouts (plan workouts of kind 'cardio'): one workout's page and its log.
export const { getCardioWorkout, saveCardioLog } = createCardioApi(apiClient);
