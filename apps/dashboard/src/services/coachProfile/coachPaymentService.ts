import { createCoachPaymentApi } from '@sistem/api-client';
import { apiClient } from '../api/apiClient';

// Her temporary payment links (shown to her trainees on the coach card).
export const { getPayment, savePayment } = createCoachPaymentApi(apiClient);
