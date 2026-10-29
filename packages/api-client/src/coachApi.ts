import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type {
  PublishPlanNote,
  AchievementOverview,
  AiRecommendation,
  AiRecommendationLatest,
  AiRecommendationOf,
  AiRecommendationType,
  BodyMetricList,
  CalculationOverrides,
  CalorieSuggestion,
  CoachMealLogWeek,
  CoachNutritionPlanResponse,
  CoachPlan,
  CoachStats,
  CoachTodayResponse,
  CoachActivityPage,
  CoachArchiveList,
  CoachArchivedTraineeResponse,
  CoachStatsRange,
  CoachTraineeList,
  CoachTraineeResponse,
  CreateNutritionTemplatePayload,
  CreatePlanPayload,
  EndCoachingResponse,
  DeleteFoodItemResult,
  ExerciseFamilyDetail,
  ExerciseFamilySearchParams,
  ExerciseFamilySearchResult,
  ExerciseSearchParams,
  ExerciseSearchResult,
  FamilyHistory,
  FoodItem,
  FoodItemPayload,
  FormulaSex,
  NutritionGoal,
  NutritionIssue,
  NutritionSettingsPayload,
  NutritionSettingsResponse,
  NutritionTemplate,
  RenameNutritionTemplatePayload,
  PlanIssue,
  PlanWeekOptions,
  SaveNutritionPlanPayload,
  SavePlanPayload,
  TrainingConfig,
  TrainingSettingsPayload,
  UpdateExerciseFamilyPayload,
  WorkoutLog,
} from '@sistem/types';
import { extractErrorMessage } from './createApiClient';

/**
 * A failed plan call. `issues` is filled when the server refused the plan's content
 * and says which workout / exercise each problem belongs to.
 */
export class PlanRequestError extends Error {
  readonly issues: PlanIssue[];

  constructor(message: string, issues: PlanIssue[] = []) {
    super(message);
    this.issues = issues;
  }
}

function toPlanRequestError(error: unknown, fallback: string): PlanRequestError {
  const issues: unknown = axios.isAxiosError(error) ? error.response?.data?.issues : undefined;
  return new PlanRequestError(extractErrorMessage(error, fallback), Array.isArray(issues) ? (issues as PlanIssue[]) : []);
}

/**
 * A failed nutrition call. `issues` is filled when the server refused the plan's content
 * and says which meal / option / line each problem belongs to.
 */
export class NutritionRequestError extends Error {
  readonly issues: NutritionIssue[];
  readonly status: number | undefined;

  constructor(message: string, issues: NutritionIssue[] = [], status?: number) {
    super(message);
    this.issues = issues;
    this.status = status;
  }
}

export function toNutritionRequestError(error: unknown, fallback: string): NutritionRequestError {
  const response = axios.isAxiosError(error) ? error.response : undefined;
  const issues: unknown = response?.data?.issues;
  return new NutritionRequestError(
    extractErrorMessage(error, fallback),
    Array.isArray(issues) ? (issues as NutritionIssue[]) : [],
    response?.status,
  );
}

// The human Coach's calls (/api/coach), shared by the web dashboard and the coach
// mode of the mobile app. The server checks role=coach and trainee ownership on each.
export function createCoachApi(client: AxiosInstance) {
  const plansPath = (traineeId: string) => `/coach/trainees/${traineeId}/plans`;

  async function listTrainees(): Promise<CoachTraineeList> {
    const { data } = await client.get<CoachTraineeList>('/coach/trainees');
    return data;
  }

  /** Read-only numbers over her own trainees: the Statistics page and the Overview widgets. */
  async function getCoachStats(range?: CoachStatsRange): Promise<CoachStats> {
    const { data } = await client.get<CoachStats>('/coach/stats', { params: range ? { range } : undefined });
    return data;
  }

  /** Coach mode Today: the stage's scoreboard, the waiting carousel and the attention cards. */
  async function getCoachToday(): Promise<CoachTodayResponse> {
    const { data } = await client.get<CoachTodayResponse>('/coach/today');
    return data;
  }

  /** One page of the coach mode feed, newest first; pass the previous page's nextBefore for the next. */
  async function getCoachActivity(before?: string | null, limit?: number): Promise<CoachActivityPage> {
    const params = { ...(before ? { before } : {}), ...(limit ? { limit } : {}) };
    const { data } = await client.get<CoachActivityPage>('/coach/activity', { params });
    return data;
  }

  async function getTrainee(traineeId: string): Promise<CoachTraineeResponse> {
    const { data } = await client.get<CoachTraineeResponse>(`/coach/trainees/${traineeId}`);
    return data;
  }

  /** Ends the coaching: her account and history stay; this coach loses access (the server enforces it). */
  async function endCoaching(traineeId: string): Promise<EndCoachingResponse> {
    const { data } = await client.patch<EndCoachingResponse>(`/coach/trainees/${traineeId}/end-coaching`);
    return data;
  }

  /** Ended coachings (the "archive" filter) — read-only, past data, no photos. */
  async function listArchive(): Promise<CoachArchiveList> {
    const { data } = await client.get<CoachArchiveList>('/coach/archive');
    return data;
  }

  async function getArchivedTrainee(traineeId: string): Promise<CoachArchivedTraineeResponse> {
    const { data } = await client.get<CoachArchivedTraineeResponse>(`/coach/archive/${traineeId}`);
    return data;
  }

  async function listArchivedWorkoutLogs(traineeId: string): Promise<WorkoutLog[]> {
    const { data } = await client.get<{ items: WorkoutLog[] }>(`/coach/archive/${traineeId}/workout-logs`);
    return data.items;
  }

  async function listTraineeWorkoutLogs(traineeId: string): Promise<WorkoutLog[]> {
    const { data } = await client.get<{ items: WorkoutLog[] }>(`/coach/trainees/${traineeId}/workout-logs`);
    return data.items;
  }

  /** Her days (newest first) with signed photo links, and the measurement list. */
  async function listTraineeBodyMetrics(traineeId: string): Promise<BodyMetricList> {
    const { data } = await client.get<BodyMetricList>(`/coach/trainees/${traineeId}/body-metrics`);
    return data;
  }

  /** Her streak and achievements, read-only. */
  async function getTraineeAchievements(traineeId: string): Promise<AchievementOverview> {
    const { data } = await client.get<AchievementOverview>(`/coach/trainees/${traineeId}/achievements`);
    return data;
  }

  async function searchExercises(params: ExerciseSearchParams = {}): Promise<ExerciseSearchResult> {
    const { data } = await client.get<ExerciseSearchResult>('/coach/exercises', { params });
    return data;
  }

  // --- Training config and exercise families (Phase 12b) ---------------------------

  async function getTrainingConfig(): Promise<{ config: TrainingConfig; defaults: TrainingConfig }> {
    const { data } = await client.get<{ config: TrainingConfig; defaults: TrainingConfig }>('/coach/training/config');
    return data;
  }

  async function saveTrainingSettings(payload: TrainingSettingsPayload): Promise<{ config: TrainingConfig; defaults: TrainingConfig }> {
    const { data } = await client.put<{ config: TrainingConfig; defaults: TrainingConfig }>('/coach/training/settings', payload);
    return data;
  }

  /** One row per family (primaries only): the slot picker and the library review screen. */
  async function searchExerciseFamilies(params: ExerciseFamilySearchParams = {}): Promise<ExerciseFamilySearchResult> {
    const { data } = await client.get<ExerciseFamilySearchResult>('/coach/exercise-families', { params });
    return data;
  }

  /** With a trainee: each variant says whether her equipment and level allow it. */
  async function getExerciseFamily(familyId: string, traineeId?: string): Promise<ExerciseFamilyDetail> {
    const { data } = await client.get<ExerciseFamilyDetail>(`/coach/exercise-families/${familyId}`, { params: traineeId ? { traineeId } : {} });
    return data;
  }

  async function updateExerciseFamily(familyId: string, payload: UpdateExerciseFamilyPayload): Promise<ExerciseFamilyDetail> {
    const { data } = await client.patch<ExerciseFamilyDetail>(`/coach/exercise-families/${familyId}`, payload);
    return data;
  }

  async function setExerciseFamilyPrimary(familyId: string, exerciseId: string): Promise<ExerciseFamilyDetail> {
    const { data } = await client.put<ExerciseFamilyDetail>(`/coach/exercise-families/${familyId}/primary`, { exerciseId });
    return data;
  }

  /** Moves every exercise of `sourceFamilyId` into `familyId`. */
  async function mergeExerciseFamily(familyId: string, sourceFamilyId: string): Promise<ExerciseFamilyDetail> {
    const { data } = await client.post<ExerciseFamilyDetail>(`/coach/exercise-families/${familyId}/merge`, { familyId: sourceFamilyId });
    return data;
  }

  /** The chosen exercises become a new family; answers with the new family. */
  async function splitExerciseFamily(familyId: string, exerciseIds: string[]): Promise<ExerciseFamilyDetail> {
    const { data } = await client.post<ExerciseFamilyDetail>(`/coach/exercise-families/${familyId}/split`, { exerciseIds });
    return data;
  }

  /** Her history per variant of a family (PRs and "last time" stay per variant). */
  async function getFamilyHistory(traineeId: string, familyId: string): Promise<FamilyHistory> {
    const { data } = await client.get<FamilyHistory>(`/coach/trainees/${traineeId}/exercise-history`, { params: { familyId } });
    return data;
  }

  async function listPlans(traineeId: string): Promise<CoachPlan[]> {
    const { data } = await client.get<{ items: CoachPlan[] }>(plansPath(traineeId));
    return data.items;
  }

  /** The weeks the picker offers for a new or duplicated plan, with their defaults. */
  async function listPlanWeeks(traineeId: string): Promise<PlanWeekOptions> {
    const { data } = await client.get<PlanWeekOptions>(`/coach/trainees/${traineeId}/plan-weeks`);
    return data;
  }

  async function getPlan(traineeId: string, planId: string): Promise<CoachPlan> {
    const { data } = await client.get<{ plan: CoachPlan }>(`${plansPath(traineeId)}/${planId}`);
    return data.plan;
  }

  async function createPlan(traineeId: string, payload: CreatePlanPayload): Promise<CoachPlan> {
    try {
      const { data } = await client.post<{ plan: CoachPlan }>(plansPath(traineeId), payload);
      return data.plan;
    } catch (error) {
      throw toPlanRequestError(error, "Couldn't create the plan. Please try again.");
    }
  }

  async function savePlan(traineeId: string, planId: string, payload: SavePlanPayload): Promise<CoachPlan> {
    try {
      const { data } = await client.put<{ plan: CoachPlan }>(`${plansPath(traineeId)}/${planId}`, payload);
      return data.plan;
    } catch (error) {
      throw toPlanRequestError(error, "Couldn't save the plan. Please try again.");
    }
  }

  /** `note` = the message + tip sent with it ('' / null = none; omitted = keep what the plan holds). */
  async function publishPlan(traineeId: string, planId: string, note?: PublishPlanNote): Promise<CoachPlan> {
    try {
      const { data } = await client.post<{ plan: CoachPlan }>(`${plansPath(traineeId)}/${planId}/publish`, note);
      return data.plan;
    } catch (error) {
      throw toPlanRequestError(error, "Couldn't publish the plan. Please try again.");
    }
  }

  async function unpublishPlan(traineeId: string, planId: string): Promise<CoachPlan> {
    try {
      const { data } = await client.post<{ plan: CoachPlan }>(`${plansPath(traineeId)}/${planId}/unpublish`);
      return data.plan;
    } catch (error) {
      throw toPlanRequestError(error, "Couldn't unpublish the plan. Please try again.");
    }
  }

  async function deletePlan(traineeId: string, planId: string): Promise<void> {
    try {
      await client.delete(`${plansPath(traineeId)}/${planId}`);
    } catch (error) {
      throw toPlanRequestError(error, "Couldn't delete the plan. Please try again.");
    }
  }

  // --- AI recommendations (Phase 12): coach-only drafts --------------------------

  const aiPath = (traineeId: string) => `/coach/trainees/${traineeId}/ai-recommendations`;

  /** The newest draft of that type (any status), and why AI is off on this server, if it is. */
  async function getLatestAiRecommendation<T extends AiRecommendationType = 'training_plan'>(
    traineeId: string,
    type: T = 'training_plan' as T,
  ): Promise<AiRecommendationLatest<AiRecommendationOf<T>>> {
    const { data } = await client.get<AiRecommendationLatest<AiRecommendationOf<T>>>(`${aiPath(traineeId)}/latest`, { params: { type } });
    return data;
  }

  async function getAiRecommendation(traineeId: string, recommendationId: string): Promise<AiRecommendation> {
    const { data } = await client.get<{ recommendation: AiRecommendation }>(`${aiPath(traineeId)}/${recommendationId}`);
    return data.recommendation;
  }

  /** Starts a new draft in the background (poll getLatestAiRecommendation for the result). */
  async function generateAiRecommendation<T extends AiRecommendationType = 'training_plan'>(
    traineeId: string,
    type: T = 'training_plan' as T,
    options: { splitId?: string } = {},
  ): Promise<AiRecommendationOf<T>> {
    try {
      const { data } = await client.post<{ recommendation: AiRecommendationOf<T> }>(aiPath(traineeId), { type, ...options });
      return data.recommendation;
    } catch (error) {
      // Already running: that one is the answer.
      const running: unknown = axios.isAxiosError(error) && error.response?.status === 409 ? error.response.data?.recommendation : undefined;
      if (running) return running as AiRecommendationOf<T>;
      throw new Error(extractErrorMessage(error, "Couldn't start the AI draft. Please try again."));
    }
  }

  // --- Nutrition (Phase 13a) ----------------------------------------------------

  const nutritionPath = (traineeId: string) => `/coach/trainees/${traineeId}/nutrition-plan`;

  /** Wraps a call so a refusal arrives as a NutritionRequestError with its message / issues. */
  async function nutritionCall<T>(fallback: string, call: () => Promise<T>): Promise<T> {
    try {
      return await call();
    } catch (error) {
      throw toNutritionRequestError(error, fallback);
    }
  }

  async function listFoods(): Promise<FoodItem[]> {
    const { data } = await client.get<{ items: FoodItem[] }>('/coach/nutrition/foods');
    return data.items;
  }

  function createFood(payload: FoodItemPayload): Promise<FoodItem> {
    return nutritionCall("Couldn't add the food item.", async () => (await client.post<{ item: FoodItem }>('/coach/nutrition/foods', payload)).data.item);
  }

  function updateFood(foodId: string, payload: FoodItemPayload): Promise<FoodItem> {
    return nutritionCall("Couldn't save the food item.", async () => (await client.patch<{ item: FoodItem }>(`/coach/nutrition/foods/${foodId}`, payload)).data.item);
  }

  /** A system item out of her lists (true), or back in them (false). */
  function setFoodHidden(foodId: string, hidden: boolean): Promise<FoodItem> {
    const path = `/coach/nutrition/foods/${foodId}/hidden`;
    return nutritionCall("Couldn't update the food item.", async () => (await (hidden ? client.post : client.delete)<{ item: FoodItem }>(path)).data.item);
  }

  /** Her own item: deleted when nothing uses it, archived otherwise. Her edited copy: restored to the original ('reverted'). */
  function deleteFood(foodId: string): Promise<DeleteFoodItemResult> {
    return nutritionCall("Couldn't remove the food item.", async () => (await client.delete<DeleteFoodItemResult>(`/coach/nutrition/foods/${foodId}`)).data);
  }

  function restoreFood(foodId: string): Promise<FoodItem> {
    return nutritionCall("Couldn't restore the food item.", async () => (await client.post<{ item: FoodItem }>(`/coach/nutrition/foods/${foodId}/restore`)).data.item);
  }

  async function getNutritionSettings(): Promise<NutritionSettingsResponse> {
    const { data } = await client.get<NutritionSettingsResponse>('/coach/nutrition/settings');
    return data;
  }

  function saveNutritionSettings(payload: NutritionSettingsPayload): Promise<NutritionSettingsResponse> {
    return nutritionCall("Couldn't save the settings.", async () => (await client.put<NutritionSettingsResponse>('/coach/nutrition/settings', payload)).data);
  }

  /** The settings screen's live preview: unsaved numbers on the server's example trainee (nothing stored). */
  async function previewNutritionSettings(payload: NutritionSettingsPayload): Promise<CalorieSuggestion> {
    const { data } = await client.post<CalorieSuggestion>('/coach/nutrition/settings/preview', payload);
    return data;
  }

  async function listNutritionTemplates(): Promise<NutritionTemplate[]> {
    const { data } = await client.get<{ items: NutritionTemplate[] }>('/coach/nutrition/templates');
    return data.items;
  }

  function renameNutritionTemplate(templateId: string, payload: RenameNutritionTemplatePayload): Promise<NutritionTemplate> {
    return nutritionCall("Couldn't rename the template.", async () =>
      (await client.patch<{ template: NutritionTemplate }>(`/coach/nutrition/templates/${templateId}`, payload)).data.template,
    );
  }

  function deleteNutritionTemplate(templateId: string): Promise<void> {
    return nutritionCall("Couldn't delete the template.", async () => {
      await client.delete(`/coach/nutrition/templates/${templateId}`);
    });
  }

  /** Her working copy, the version she sees, her preferences, the coach's foods and numbers, the issues. */
  async function getNutritionPlan(traineeId: string): Promise<CoachNutritionPlanResponse> {
    const { data } = await client.get<CoachNutritionPlanResponse>(nutritionPath(traineeId));
    return data;
  }

  /** The calculation summary; `params` also carries the coach's live overrides (13a+). */
  async function getCalorieSuggestion(
    traineeId: string,
    params: { goal?: NutritionGoal; formula?: FormulaSex } & Partial<Record<keyof CalculationOverrides, number>> = {},
  ): Promise<CalorieSuggestion> {
    const { data } = await client.get<CalorieSuggestion>(`${nutritionPath(traineeId)}/suggestion`, { params });
    return data;
  }

  /** Portion tracking (13a+): one Sunday week of hers, read-only (none = her current week). */
  async function getTraineeMealLogs(traineeId: string, weekStart?: string): Promise<CoachMealLogWeek> {
    const { data } = await client.get<CoachMealLogWeek>(`/coach/trainees/${traineeId}/meal-logs`, { params: weekStart ? { weekStart } : {} });
    return data;
  }

  function saveNutritionPlan(traineeId: string, payload: SaveNutritionPlanPayload): Promise<CoachNutritionPlanResponse> {
    return nutritionCall("Couldn't save the nutrition plan.", async () => (await client.put<CoachNutritionPlanResponse>(nutritionPath(traineeId), payload)).data);
  }

  function publishNutritionPlan(traineeId: string): Promise<CoachNutritionPlanResponse> {
    return nutritionCall("Couldn't publish the nutrition plan.", async () => (await client.post<CoachNutritionPlanResponse>(`${nutritionPath(traineeId)}/publish`)).data);
  }

  function applyNutritionTemplate(traineeId: string, templateId: string): Promise<CoachNutritionPlanResponse> {
    return nutritionCall("Couldn't start from that template.", async () =>
      (await client.post<CoachNutritionPlanResponse>(`${nutritionPath(traineeId)}/from-template`, { templateId })).data,
    );
  }

  function saveNutritionTemplate(traineeId: string, payload: CreateNutritionTemplatePayload): Promise<NutritionTemplate> {
    return nutritionCall("Couldn't save the template.", async () =>
      (await client.post<{ template: NutritionTemplate }>(`${nutritionPath(traineeId)}/template`, payload)).data.template,
    );
  }

  return {
    listTrainees,
    endCoaching,
    listArchive,
    getArchivedTrainee,
    listArchivedWorkoutLogs,
    getCoachStats,
    getCoachToday,
    getCoachActivity,
    getTrainee,
    listTraineeWorkoutLogs,
    listTraineeBodyMetrics,
    getTraineeAchievements,
    searchExercises,
    getTrainingConfig,
    saveTrainingSettings,
    searchExerciseFamilies,
    getExerciseFamily,
    updateExerciseFamily,
    setExerciseFamilyPrimary,
    mergeExerciseFamily,
    splitExerciseFamily,
    getFamilyHistory,
    listPlans,
    listPlanWeeks,
    getPlan,
    createPlan,
    savePlan,
    publishPlan,
    unpublishPlan,
    deletePlan,
    getLatestAiRecommendation,
    getAiRecommendation,
    generateAiRecommendation,
    listFoods,
    setFoodHidden,
    createFood,
    updateFood,
    deleteFood,
    restoreFood,
    getNutritionSettings,
    saveNutritionSettings,
    previewNutritionSettings,
    listNutritionTemplates,
    renameNutritionTemplate,
    deleteNutritionTemplate,
    getNutritionPlan,
    getCalorieSuggestion,
    getTraineeMealLogs,
    saveNutritionPlan,
    publishNutritionPlan,
    applyNutritionTemplate,
    saveNutritionTemplate,
  };
}

export type CoachApi = ReturnType<typeof createCoachApi>;
