import { createCoachDefaultsApi } from '@sistem/api-client';
import { apiClient } from '../api/apiClient';

// Her saved message + tip per plan kind (the send sheets and Settings).
export const { getSendDefaults, saveSendDefaults } = createCoachDefaultsApi(apiClient);
