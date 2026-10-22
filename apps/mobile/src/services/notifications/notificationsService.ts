import { createNotificationsApi } from '@sistem/api-client';
import { apiClient } from '../api/apiClient';

export const { listNotifications, getUnreadCount, markRead, markAllRead, thankCoach } = createNotificationsApi(apiClient);
