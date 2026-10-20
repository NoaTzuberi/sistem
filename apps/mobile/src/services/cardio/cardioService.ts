import { createCardioApi } from '@sistem/api-client';
import { apiClient } from '../api/apiClient';

// Her cardio sessions; each day's status is computed on the server.
export const { getCardioWeek, getCardioSession, saveCardioLog } = createCardioApi(apiClient);
