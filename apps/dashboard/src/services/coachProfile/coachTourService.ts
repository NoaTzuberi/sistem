import { createCoachTourApi } from '@sistem/api-client';
import { apiClient } from '../api/apiClient';

// The first-visit dashboard tour (CoachProfile.tourCompletedAt).
export const { getTour, completeTour } = createCoachTourApi(apiClient);
