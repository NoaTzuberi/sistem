import { createTraineeApi } from '@sistem/api-client';
import { apiClient } from '../api/apiClient';

// The trainee's newest published nutrition plan (no calorie numbers), the tab-bar dots
// (Phase 13a), and her portion tracking + meal photos (Phase 13a+). The server scopes
// every call to the signed-in trainee.
export const {
  getNutritionPlan,
  markNutritionIntroSeen,
  getMealLogs,
  saveMealLog,
  uploadMealPhoto,
  removeMealPhoto,
  saveOwnNutritionTarget,
  getTabUpdates,
  markTabSeen,
} = createTraineeApi(apiClient);
