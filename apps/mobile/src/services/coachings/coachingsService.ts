import { createTraineeApi } from '@sistem/api-client';
import { apiClient } from '../api/apiClient';

// Her relationships: live coachings (the coaching-aware hooks, ending one herself) and communities (names only).
export const { listMyCoachings, endMyCoaching, listMyCommunities } = createTraineeApi(apiClient);
