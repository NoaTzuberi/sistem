import { getCoachUnreadMessages } from '../../../services/coach/coachConnectService';
import { createUnreadStore } from '../../messages/data/unreadStore';

/** The coach's unread messages from her trainees (the dock badge on הודעות). */
export const coachMessageUnread = createUnreadStore(getCoachUnreadMessages);
