import { createCoachApi, createCoachCardioApi, createCoachPaymentApi, createInvitesApi } from '@sistem/api-client';
import { apiClient } from '../api/apiClient';

// Coach mode follows and reacts (PRD §6): it reads, and publishes / duplicates plans. Plan building and
// editing stay on the web dashboard, so the other coach calls are not exposed here. Nutrition (Phase 13a)
// and portion tracking (13a+) are read-only here too.
export const {
  getCoachToday,
  getCoachActivity,
  listTrainees,
  getTrainee,
  listTraineeWorkoutLogs,
  listTraineeBodyMetrics,
  getTraineeAchievements,
  listPlans,
  createPlan,
  publishPlan,
  getNutritionPlan,
  getTraineeMealLogs,
} = createCoachApi(apiClient);

export const { listTraineeCardioLogs } = createCoachCardioApi(apiClient);

// Her own invite link (the Profile card) and payment details (read-only here — edited in the dashboard).
export const { getInvites } = createInvitesApi(apiClient);
export const { getPayment } = createCoachPaymentApi(apiClient);
