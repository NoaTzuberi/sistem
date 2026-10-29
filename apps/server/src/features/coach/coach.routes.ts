import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { loadCoachArchivedTrainee, loadCoachTrainee } from '../../middleware/coachTrainee.middleware';
import {
  getTrainees,
  getStats,
  getToday,
  getActivity,
  getExercises,
  getTrainee,
  getTraineePlans,
  getTraineePlanWeeks,
  getTraineeWorkoutLogs,
  getTraineeBodyMetrics,
  getTraineeAchievements,
  createTraineePlan,
  getTraineePlan,
  saveTraineePlan,
  publishTraineePlan,
  unpublishTraineePlan,
  deleteTraineePlan,
} from './coach.controller';
import {
  getLatestTraineeRecommendation,
  getTraineeRecommendation,
  createTraineeRecommendation,
} from '../aiRecommendations/aiRecommendation.controller';
import {
  getFoods,
  postFood,
  patchFood,
  deleteFood,
  postRestoreFood,
  putFoodHidden,
  getSettings,
  putSettings,
  postSettingsPreview,
  getTemplates,
  deleteTemplate,
  patchTemplate,
  getTraineeNutrition,
  getTraineeCalorieSuggestion,
  putTraineeNutrition,
  postPublishTraineeNutrition,
  postTraineeNutritionFromTemplate,
  postTraineeNutritionTemplate,
} from '../nutrition/nutrition.controller';
import { getTraineeMealLogs } from '../mealLogs/mealLog.controller';
import { getTraineeCardioLogs } from '../cardio/cardio.controller';
import {
  getMyInvites,
  postPersonalInvite,
  postRegenerateInvite,
  deleteInvite,
  getMyCommunityInvite,
} from '../invites/invite.controller';
import { getTrainingConfig, putTrainingSettings } from '../trainingSplits/trainingSplit.controller';
import {
  getFamilies,
  getFamily,
  patchFamily,
  putFamilyPrimary,
  postFamilyMerge,
  postFamilySplit,
  getTraineeFamilyHistory,
} from '../exerciseFamilies/exerciseFamily.controller';

// The human Coach (PRD §6) — the ATLAS AI chat that used /api/coach is gone.
// Every route needs role=coach; every :traineeId route also needs that trainee to
// have a live coaching with her (loadCoachTrainee), and coach-owned data is read through that coaching only.
import { getMyPayment, putMyPayment } from '../coachProfiles/coachProfile.controller';
import { putTraineeReaction } from '../reactions/reaction.controller';
import {
  getCoachThreads,
  getCoachUnread,
  getTraineeMessages,
  postTraineeMessage,
  postTraineeMessagesRead,
} from '../messages/message.controller';
import { messageRateLimit } from '../../middleware/rateLimit.middleware';
import { getArchive, getArchivedTraineeDetail, getArchivedTraineeWorkoutLogs, patchEndCoaching } from './coachArchive.controller';

export const coachRouter = Router();

coachRouter.use(requireAuth, requireRole('coach'));

coachRouter.get('/exercises', getExercises);

// Phase 12b: the training config (splits, workout-type slots) and the library by exercise family.
coachRouter.get('/training/config', getTrainingConfig);
coachRouter.put('/training/settings', putTrainingSettings);
coachRouter.get('/exercise-families', getFamilies);
coachRouter.get('/exercise-families/:familyId', getFamily);
coachRouter.patch('/exercise-families/:familyId', patchFamily);
coachRouter.put('/exercise-families/:familyId/primary', putFamilyPrimary);
coachRouter.post('/exercise-families/:familyId/merge', postFamilyMerge);
coachRouter.post('/exercise-families/:familyId/split', postFamilySplit);

// Read-only aggregates over her own trainees (the dashboard's Statistics and Overview pages).
coachRouter.get('/stats', getStats);

// Coach mode (mobile): the Today stage and the activity feed, over her live coachings only.
coachRouter.get('/today', getToday);
coachRouter.get('/activity', getActivity);

// Coach mode Phase B: messages (threads = her live coachings) and reactions on the feed.
coachRouter.get('/messages', getCoachThreads);
coachRouter.get('/messages/unread', getCoachUnread);
coachRouter.get('/trainees/:traineeId/messages', loadCoachTrainee, getTraineeMessages);
coachRouter.post('/trainees/:traineeId/messages', loadCoachTrainee, messageRateLimit, postTraineeMessage);
coachRouter.post('/trainees/:traineeId/messages/read', loadCoachTrainee, postTraineeMessagesRead);
coachRouter.put('/trainees/:traineeId/reactions', loadCoachTrainee, putTraineeReaction);

// Invites: her permanent coaching link (+ QR in the dashboard), personal single-use links, and her
// community-only link. Every query is scoped to the calling coach.
// Temporary payment links shown to her trainees (Profile coach card).
coachRouter.get('/profile/payment', getMyPayment);
coachRouter.put('/profile/payment', putMyPayment);
coachRouter.get('/invites', getMyInvites);
coachRouter.post('/invites', postPersonalInvite);
coachRouter.post('/invites/regenerate', postRegenerateInvite);
coachRouter.get('/invites/community', getMyCommunityInvite);
coachRouter.delete('/invites/:inviteId', deleteInvite);

coachRouter.get('/trainees', getTrainees);
// Ending a coaching (her account and history stay) and the read-only archive of ended coachings: only that
// coaching's records from before the end, no photos (coachArchive.service).
coachRouter.patch('/trainees/:traineeId/end-coaching', loadCoachTrainee, patchEndCoaching);
coachRouter.get('/archive', getArchive);
coachRouter.get('/archive/:traineeId', loadCoachArchivedTrainee, getArchivedTraineeDetail);
coachRouter.get('/archive/:traineeId/workout-logs', loadCoachArchivedTrainee, getArchivedTraineeWorkoutLogs);
coachRouter.get('/trainees/:traineeId', loadCoachTrainee, getTrainee);
coachRouter.get('/trainees/:traineeId/workout-logs', loadCoachTrainee, getTraineeWorkoutLogs);
coachRouter.get('/trainees/:traineeId/body-metrics', loadCoachTrainee, getTraineeBodyMetrics);
coachRouter.get('/trainees/:traineeId/achievements', loadCoachTrainee, getTraineeAchievements);
coachRouter.get('/trainees/:traineeId/exercise-history', loadCoachTrainee, getTraineeFamilyHistory);

// Plan builder (Phase 6).
coachRouter.get('/trainees/:traineeId/plans', loadCoachTrainee, getTraineePlans);
coachRouter.get('/trainees/:traineeId/plan-weeks', loadCoachTrainee, getTraineePlanWeeks);
coachRouter.post('/trainees/:traineeId/plans', loadCoachTrainee, createTraineePlan);
coachRouter.get('/trainees/:traineeId/plans/:planId', loadCoachTrainee, getTraineePlan);
coachRouter.put('/trainees/:traineeId/plans/:planId', loadCoachTrainee, saveTraineePlan);
coachRouter.delete('/trainees/:traineeId/plans/:planId', loadCoachTrainee, deleteTraineePlan);
coachRouter.post('/trainees/:traineeId/plans/:planId/publish', loadCoachTrainee, publishTraineePlan);
coachRouter.post('/trainees/:traineeId/plans/:planId/unpublish', loadCoachTrainee, unpublishTraineePlan);

// AI recommendations (Phase 12): coach-only drafts, never sent to the trainee.
coachRouter.get('/trainees/:traineeId/ai-recommendations/latest', loadCoachTrainee, getLatestTraineeRecommendation);
coachRouter.get('/trainees/:traineeId/ai-recommendations/:recommendationId', loadCoachTrainee, getTraineeRecommendation);
coachRouter.post('/trainees/:traineeId/ai-recommendations', loadCoachTrainee, createTraineeRecommendation);

// Nutrition (Phase 13a): her food list, numbers and templates, and each trainee's plan.
coachRouter.get('/nutrition/foods', getFoods);
coachRouter.post('/nutrition/foods', postFood);
coachRouter.patch('/nutrition/foods/:foodId', patchFood);
coachRouter.delete('/nutrition/foods/:foodId', deleteFood);
coachRouter.post('/nutrition/foods/:foodId/restore', postRestoreFood);
coachRouter.post('/nutrition/foods/:foodId/hidden', putFoodHidden);
coachRouter.delete('/nutrition/foods/:foodId/hidden', putFoodHidden);
coachRouter.get('/nutrition/settings', getSettings);
coachRouter.put('/nutrition/settings', putSettings);
coachRouter.post('/nutrition/settings/preview', postSettingsPreview);
coachRouter.get('/nutrition/templates', getTemplates);
coachRouter.patch('/nutrition/templates/:templateId', patchTemplate);
coachRouter.delete('/nutrition/templates/:templateId', deleteTemplate);
coachRouter.get('/trainees/:traineeId/nutrition-plan', loadCoachTrainee, getTraineeNutrition);
coachRouter.get('/trainees/:traineeId/nutrition-plan/suggestion', loadCoachTrainee, getTraineeCalorieSuggestion);
coachRouter.put('/trainees/:traineeId/nutrition-plan', loadCoachTrainee, putTraineeNutrition);
coachRouter.post('/trainees/:traineeId/nutrition-plan/publish', loadCoachTrainee, postPublishTraineeNutrition);
coachRouter.post('/trainees/:traineeId/nutrition-plan/from-template', loadCoachTrainee, postTraineeNutritionFromTemplate);
coachRouter.post('/trainees/:traineeId/nutrition-plan/template', loadCoachTrainee, postTraineeNutritionTemplate);
// Portion tracking (Phase 13a+): her week, read-only.
coachRouter.get('/trainees/:traineeId/meal-logs', loadCoachTrainee, getTraineeMealLogs);
// Her cardio logs (cardio workouts themselves are plan workouts, built in the plan builder).
coachRouter.get('/trainees/:traineeId/cardio-logs', loadCoachTrainee, getTraineeCardioLogs);
