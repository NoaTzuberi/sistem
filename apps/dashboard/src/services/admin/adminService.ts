import { createAdminApi } from '@sistem/api-client';
import { apiClient } from '../api/apiClient';

export const { listCoaches, createCoach, resendPasswordLink, createResetLink, setCoachStatus } = createAdminApi(apiClient);
