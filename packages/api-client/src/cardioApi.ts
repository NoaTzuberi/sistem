import type { AxiosInstance } from 'axios';
import type {
  CardioLog,
  CardioSession,
  CoachCardioList,
  SaveCardioLogPayload,
  SaveCardioSessionPayload,
  TraineeCardioSessionResponse,
  TraineeCardioWeek,
} from '@sistem/types';

// Cardio sessions. The trainee's side (/api/cardio) is scoped to her; each day's status is
// computed on the server in her time zone. The coach's side lives under her trainee.

export function createCardioApi(client: AxiosInstance) {
  /** A week's sessions, one item per day (this week when `weekStart` is left out). */
  async function getCardioWeek(weekStart?: string): Promise<TraineeCardioWeek> {
    const { data } = await client.get<TraineeCardioWeek>('/cardio/week', { params: weekStart ? { weekStart } : undefined });
    return data;
  }

  async function getCardioSession(sessionId: string, date: string): Promise<TraineeCardioSessionResponse> {
    const { data } = await client.get<TraineeCardioSessionResponse>(`/cardio/sessions/${sessionId}`, { params: { date } });
    return data;
  }

  async function saveCardioLog(payload: SaveCardioLogPayload): Promise<CardioLog> {
    const { data } = await client.post<{ log: CardioLog }>('/cardio/logs', payload);
    return data.log;
  }

  return { getCardioWeek, getCardioSession, saveCardioLog };
}

export function createCoachCardioApi(client: AxiosInstance) {
  const cardioPath = (traineeId: string) => `/coach/trainees/${traineeId}/cardio`;

  async function listTraineeCardio(traineeId: string): Promise<CoachCardioList> {
    const { data } = await client.get<CoachCardioList>(cardioPath(traineeId));
    return data;
  }

  async function getTraineeCardioSession(traineeId: string, sessionId: string): Promise<CardioSession> {
    const { data } = await client.get<{ session: CardioSession }>(`${cardioPath(traineeId)}/${sessionId}`);
    return data.session;
  }

  async function createTraineeCardioSession(traineeId: string, payload: SaveCardioSessionPayload): Promise<CardioSession> {
    const { data } = await client.post<{ session: CardioSession }>(cardioPath(traineeId), payload);
    return data.session;
  }

  async function saveTraineeCardioSession(traineeId: string, sessionId: string, payload: SaveCardioSessionPayload): Promise<CardioSession> {
    const { data } = await client.put<{ session: CardioSession }>(`${cardioPath(traineeId)}/${sessionId}`, payload);
    return data.session;
  }

  async function deleteTraineeCardioSession(traineeId: string, sessionId: string): Promise<void> {
    await client.delete(`${cardioPath(traineeId)}/${sessionId}`);
  }

  return { listTraineeCardio, getTraineeCardioSession, createTraineeCardioSession, saveTraineeCardioSession, deleteTraineeCardioSession };
}

export type CardioApi = ReturnType<typeof createCardioApi>;
export type CoachCardioApi = ReturnType<typeof createCoachCardioApi>;
