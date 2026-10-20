import { createCoachCardioApi } from '@sistem/api-client';
import { apiClient } from '../api/apiClient';

// Her cardio sessions and logs (/api/coach/trainees/:id/cardio).
export const { listTraineeCardio, getTraineeCardioSession, createTraineeCardioSession, saveTraineeCardioSession, deleteTraineeCardioSession } =
  createCoachCardioApi(apiClient);
