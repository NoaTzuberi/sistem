import { getMyUnreadMessages } from '../../../services/messages/messagesService';
import { createUnreadStore } from './unreadStore';

/** Her unread messages from her coach (Home's coach area). */
export const traineeMessageUnread = createUnreadStore(getMyUnreadMessages);
