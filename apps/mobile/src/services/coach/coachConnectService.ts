import { createCoachConnectApi } from '@sistem/api-client';
import { apiClient } from '../api/apiClient';

// Coach mode Phase B: messages with her trainees and reactions on the feed.
export const { listThreads, getCoachUnreadMessages, listTraineeMessages, sendTraineeMessage, markTraineeMessagesRead, setReaction } =
  createCoachConnectApi(apiClient);
