import { createCoachApi, createCoachCardioApi, createCoachDefaultsApi, createCoachPaymentApi, createInvitesApi } from '@sistem/api-client';
import { apiClient } from '../api/apiClient';

// Coach mode follows and reacts (PRD §6): it reads, publishes / duplicates plans, and makes the light edits
// (move a workout's day, swap an exercise — Phase B). Plan building stays on the web dashboard. Nutrition (Phase 13a)
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
  savePlan,
  deletePlan,
  publishPlan,
  getExerciseFamily,
  searchExerciseFamilies,
  getNutritionPlan,
  getTraineeMealLogs,
  endCoaching,
  listArchive,
  getArchivedTrainee,
  listArchivedWorkoutLogs,
} = createCoachApi(apiClient);

export const { listTraineeCardioLogs } = createCoachCardioApi(apiClient);

// Her own invite link (the Profile card) and payment details (read-only here — edited in the dashboard).
export const { getInvites, createPersonalInvite } = createInvitesApi(apiClient);
export const { getPayment } = createCoachPaymentApi(apiClient);
// Her fixed message + tip per plan kind (the publish sheet; edited in the dashboard's Settings).
export const { getSendDefaults, saveSendDefaults } = createCoachDefaultsApi(apiClient);
