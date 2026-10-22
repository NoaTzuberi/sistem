import { createTraineeApi } from '@sistem/api-client';
import { apiClient } from '../api/apiClient';

// Her relationships: live coachings (the coaching-aware hooks) and communities (names only).
export const { listMyCoachings, listMyCommunities } = createTraineeApi(apiClient);
