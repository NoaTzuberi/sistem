import { createTraineeConnectApi } from '@sistem/api-client';
import { apiClient } from '../api/apiClient';

// The trainee's messages with her coach, and her coach's reactions.
export const { getMyThread, getMyUnreadMessages, sendMyMessage, markMyMessagesRead, listMyReactions, markMyReactionsSeen } =
  createTraineeConnectApi(apiClient);
