import type { AxiosInstance } from 'axios';
import type {
  CardioLog,
  CoachCardioLogList,
  OwnCardioWorkout,
  OwnCardioWorkoutList,
  SaveCardioLogPayload,
  SaveOwnCardioWorkoutPayload,
  TraineeCardioWorkoutResponse,
} from '@sistem/types';

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

  // Her own cardio workouts (self-guided): trainee-owned, run any number of times.
  async function listOwnCardioWorkouts(): Promise<OwnCardioWorkout[]> {
    const { data } = await client.get<OwnCardioWorkoutList>('/cardio/own');
    return data.items;
  }

  async function getOwnCardioWorkout(id: string): Promise<TraineeCardioWorkoutResponse> {
    const { data } = await client.get<TraineeCardioWorkoutResponse>(`/cardio/own/${id}`);
    return data;
  }

  async function createOwnCardioWorkout(payload: SaveOwnCardioWorkoutPayload): Promise<TraineeCardioWorkoutResponse> {
    const { data } = await client.post<TraineeCardioWorkoutResponse>('/cardio/own', payload);
    return data;
  }

  async function updateOwnCardioWorkout(id: string, payload: SaveOwnCardioWorkoutPayload): Promise<TraineeCardioWorkoutResponse> {
    const { data } = await client.put<TraineeCardioWorkoutResponse>(`/cardio/own/${id}`, payload);
    return data;
  }

  async function deleteOwnCardioWorkout(id: string): Promise<void> {
    await client.delete(`/cardio/own/${id}`);
  }

  return {
    getCardioWorkout,
    saveCardioLog,
    listOwnCardioWorkouts,
    getOwnCardioWorkout,
    createOwnCardioWorkout,
    updateOwnCardioWorkout,
    deleteOwnCardioWorkout,
  };
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
