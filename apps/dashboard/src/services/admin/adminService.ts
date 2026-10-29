import { createAdminApi, createAdminFoodsApi } from '@sistem/api-client';
import { apiClient } from '../api/apiClient';

export const { listCoaches, createCoach, resendPasswordLink, createResetLink, setCoachStatus } = createAdminApi(apiClient);

export const { listSystemFoods, createSystemFood, updateSystemFood, deleteSystemFood, restoreSystemFood } = createAdminFoodsApi(apiClient);
