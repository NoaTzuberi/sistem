import type { AxiosInstance } from 'axios';
import type { CardioLog, CoachCardioLogList, SaveCardioLogPayload, TraineeCardioWorkoutResponse } from '@sistem/types';

// Cardio workouts are plan workouts (kind 'cardio'), read and saved with the plan. These are the
// cardio-only calls: her workout page and log (/api/cardio), and the coach's read of her logs.

export function createCardioApi(client: AxiosInstance) {
  async function getCardioWorkout(planId: string, workoutId: string): Promise<TraineeCardioWorkoutResponse> {
    const { data } = await client.get<TraineeCardioWorkoutResponse>(`/cardio/plans/${planId}/workouts/${workoutId}`);
    return data;
  }

  async function saveCardioLog(payload: SaveCardioLogPayload): Promise<CardioLog> {
    const { data } = await client.post<{ log: CardioLog }>('/cardio/logs', payload);
    return data.log;
  }

  return { getCardioWorkout, saveCardioLog };
}

export function createCoachCardioApi(client: AxiosInstance) {
  async function listTraineeCardioLogs(traineeId: string): Promise<CardioLog[]> {
    const { data } = await client.get<CoachCardioLogList>(`/coach/trainees/${traineeId}/cardio-logs`);
    return data.items;
  }

  return { listTraineeCardioLogs };
}

export type CardioApi = ReturnType<typeof createCardioApi>;
export type CoachCardioApi = ReturnType<typeof createCoachCardioApi>;
