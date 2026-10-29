import { createCoachDefaultsApi } from '@sistem/api-client';
import { apiClient } from '../api/apiClient';

// Her saved message + tip for sending a nutrition plan (the send sheet and Settings).
export const { getSendDefaults, saveSendDefaults } = createCoachDefaultsApi(apiClient);
