import type { AxiosInstance } from 'axios';
import type { AppNotification, CoachNoteId, NotificationList, NotificationListParams, ThankCoachPayload } from '@sistem/types';

// In-app notifications, shared by the mobile app (both roles) and the coach
// dashboard. Every call is scoped to the signed-in user on the server.
export function createNotificationsApi(client: AxiosInstance) {
  async function listNotifications(params: NotificationListParams = {}): Promise<NotificationList> {
    const { data } = await client.get<NotificationList>('/notifications', { params });
    return data;
  }

  async function getUnreadCount(): Promise<number> {
    const { data } = await client.get<{ unreadCount: number }>('/notifications/unread-count');
    return data.unreadCount;
  }

  async function markRead(notificationId: string): Promise<AppNotification> {
    const { data } = await client.patch<{ notification: AppNotification }>(`/notifications/${notificationId}/read`);
    return data.notification;
  }

  async function markAllRead(): Promise<void> {
    await client.post('/notifications/read-all');
  }

  /** Trainee: "👍 Thanks!" under one of her coach's notes — the server finds the note and the coach. */
  async function thankCoach(note: CoachNoteId): Promise<void> {
    await client.post('/notifications/thanks', { note } satisfies ThankCoachPayload);
  }

  return { listNotifications, getUnreadCount, markRead, markAllRead, thankCoach };
}

export type NotificationsApi = ReturnType<typeof createNotificationsApi>;
