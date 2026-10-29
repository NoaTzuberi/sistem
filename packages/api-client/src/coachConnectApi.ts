import type { AxiosInstance } from 'axios';
import type {
  ChatMessage,
  CoachReactionList,
  CoachThreadList,
  MessagePage,
  ReactionId,
  SetReactionPayload,
  TraineeThreadResponse,
  UnreadMessagesResponse,
} from '@sistem/types';

// Coach mode Phase B: messages (coach ↔ trainee) and the coach's reactions. The server checks the role,
// the live coaching and the rate limit on each call.

function pageParams(before?: string | null, limit?: number) {
  return { ...(before ? { before } : {}), ...(limit ? { limit } : {}) };
}

/** The coach's side (/api/coach). */
export function createCoachConnectApi(client: AxiosInstance) {
  const messagesPath = (traineeId: string) => `/coach/trainees/${traineeId}/messages`;

  async function listThreads(): Promise<CoachThreadList> {
    return (await client.get<CoachThreadList>('/coach/messages')).data;
  }

  async function getCoachUnreadMessages(): Promise<number> {
    return (await client.get<UnreadMessagesResponse>('/coach/messages/unread')).data.unread;
  }

  async function listTraineeMessages(traineeId: string, before?: string | null, limit?: number): Promise<MessagePage> {
    return (await client.get<MessagePage>(messagesPath(traineeId), { params: pageParams(before, limit) })).data;
  }

  async function sendTraineeMessage(traineeId: string, text: string): Promise<ChatMessage> {
    return (await client.post<{ message: ChatMessage }>(messagesPath(traineeId), { text })).data.message;
  }

  /** Her messages become read; answers with the coach's unread count left (all threads). */
  async function markTraineeMessagesRead(traineeId: string): Promise<number> {
    return (await client.post<UnreadMessagesResponse>(`${messagesPath(traineeId)}/read`)).data.unread;
  }

  async function setReaction(traineeId: string, payload: SetReactionPayload): Promise<ReactionId | null> {
    return (await client.put<{ reaction: ReactionId | null }>(`/coach/trainees/${traineeId}/reactions`, payload)).data.reaction;
  }

  return { listThreads, getCoachUnreadMessages, listTraineeMessages, sendTraineeMessage, markTraineeMessagesRead, setReaction };
}

/** The trainee's side (/api/messages, /api/reactions). */
export function createTraineeConnectApi(client: AxiosInstance) {
  async function getMyThread(before?: string | null, limit?: number): Promise<TraineeThreadResponse> {
    return (await client.get<TraineeThreadResponse>('/messages', { params: pageParams(before, limit) })).data;
  }

  async function getMyUnreadMessages(): Promise<number> {
    return (await client.get<UnreadMessagesResponse>('/messages/unread')).data.unread;
  }

  async function sendMyMessage(text: string): Promise<ChatMessage> {
    return (await client.post<{ message: ChatMessage }>('/messages', { text })).data.message;
  }

  async function markMyMessagesRead(): Promise<void> {
    await client.post('/messages/read');
  }

  /** Her coach's reactions: the last two weeks, or every one on a log. */
  async function listMyReactions(logId?: string): Promise<CoachReactionList> {
    return (await client.get<CoachReactionList>('/reactions', { params: logId ? { logId } : {} })).data;
  }

  async function markMyReactionsSeen(): Promise<void> {
    await client.post('/reactions/seen');
  }

  return { getMyThread, getMyUnreadMessages, sendMyMessage, markMyMessagesRead, listMyReactions, markMyReactionsSeen };
}

export type CoachConnectApi = ReturnType<typeof createCoachConnectApi>;
export type TraineeConnectApi = ReturnType<typeof createTraineeConnectApi>;
