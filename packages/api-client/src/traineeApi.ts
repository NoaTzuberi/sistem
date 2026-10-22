import type { AxiosInstance } from 'axios';
import type {
  AchievementOverview,
  BodyMetric,
  BodyMetricList,
  BodyMetricResponse,
  MealLogDay,
  MealLogDaysResponse,
  PortionCounts,
  ProgressPhotoPose,
  SaveBodyMetricPayload,
  TabUpdates,
  TraineeNutritionPlanResponse,
  UpdateTab,
  TraineePlan,
  TraineePlanList,
  TraineeWeek,
  WorkoutLog,
  WorkoutLogSetUpdate,
  WorkoutSession,
  WorkoutSummaryPayload,
  MyCoaching,
  MyCoachingsResponse,
  MyCommunity,
  MyCommunitiesResponse,
  AuthUser,
  ExerciseFacts,
  OwnNutritionTarget,
  SaveOwnNutritionTargetPayload,
  StartFreeWorkoutPayload,
} from '@sistem/types';

// The trainee's own plans and workout logs (/api/plans, /api/workout-logs). The
// server scopes every call to the signed-in trainee and computes each workout's
// status in her time zone.
const MEAL_LOG_SAVE_TIMEOUT_MS = 15_000;

export function createTraineeApi(client: AxiosInstance) {
  /**
   * This week's plan, the status of each workout and the workout to start next. Coaching-aware: pass a
   * coachingId for one coach (the later multi-coach UI); without it the server uses her current coaching.
   */
  async function getWeek(coachingId?: string): Promise<TraineeWeek> {
    const { data } = await client.get<TraineeWeek>('/plans/week', { params: coachingId ? { coachingId } : undefined });
    return data;
  }

  /** Her plans; a coachingId narrows them to one coach. */
  async function listPlans(coachingId?: string): Promise<TraineePlanList> {
    const { data } = await client.get<TraineePlanList>('/plans', { params: coachingId ? { coachingId } : undefined });
    return data;
  }

  /** Her live coachings (one today; several once multi-coach is on). */
  async function listMyCoachings(): Promise<MyCoaching[]> {
    const { data } = await client.get<MyCoachingsResponse>('/coachings');
    return data.coachings;
  }

  /** Her communities — names only. */
  async function listMyCommunities(): Promise<MyCommunity[]> {
    const { data } = await client.get<MyCommunitiesResponse>('/communities/mine');
    return data.communities;
  }

  async function getPlan(planId: string): Promise<TraineePlan> {
    const { data } = await client.get<{ plan: TraineePlan }>(`/plans/${planId}`);
    return data.plan;
  }

  /** Her history; a coachingId narrows it to one coach. */
  async function listWorkoutLogs(coachingId?: string): Promise<WorkoutLog[]> {
    const { data } = await client.get<{ items: WorkoutLog[] }>('/workout-logs', { params: coachingId ? { coachingId } : undefined });
    return data.items;
  }

  /** One log, with the names of its exercises. */
  async function getWorkoutLog(logId: string): Promise<WorkoutLog> {
    const { data } = await client.get<{ log: WorkoutLog }>(`/workout-logs/${logId}`);
    return data.log;
  }

  // --- The active workout session (Phase 8). A 409 on start carries an
  // ActiveWorkoutConflictBody when another workout is still open.

  /** Starts this workout, or resumes it if it is already open (`resumed`: 200, not 201). */
  async function startWorkout(planId: string, workoutId: string): Promise<{ session: WorkoutSession; resumed: boolean }> {
    const response = await client.post<{ session: WorkoutSession }>('/workout-logs', { planId, workoutId });
    return { session: response.data.session, resumed: response.status === 200 };
  }

  async function getActiveSession(): Promise<WorkoutSession | null> {
    const { data } = await client.get<{ session: WorkoutSession | null }>('/workout-logs/active');
    return data.session;
  }

  async function getSession(logId: string): Promise<WorkoutSession> {
    const { data } = await client.get<{ session: WorkoutSession }>(`/workout-logs/${logId}/session`);
    return data.session;
  }

  async function updateWorkoutSets(logId: string, sets: WorkoutLogSetUpdate[]): Promise<WorkoutLog> {
    const { data } = await client.patch<{ log: WorkoutLog }>(`/workout-logs/${logId}/sets`, { sets });
    return data.log;
  }

  /** Sends the last unsent set changes with the finish, so nothing is lost on the way. */
  async function finishWorkout(logId: string, sets: WorkoutLogSetUpdate[] = []): Promise<WorkoutLog> {
    const { data } = await client.post<{ log: WorkoutLog }>(`/workout-logs/${logId}/finish`, { sets });
    return data.log;
  }

  async function abandonWorkout(logId: string): Promise<WorkoutLog> {
    const { data } = await client.post<{ log: WorkoutLog }>(`/workout-logs/${logId}/abandon`);
    return data.log;
  }

  // --- The summary (Phase 9): her own finished workouts, editable any time.

  async function updateWorkoutSummary(logId: string, payload: WorkoutSummaryPayload): Promise<WorkoutLog> {
    const { data } = await client.patch<{ log: WorkoutLog }>(`/workout-logs/${logId}/summary`, payload);
    return data.log;
  }

  /** Sends the (already compressed) image as the raw body; replaces any earlier photo. */
  async function uploadPumpPhoto(
    logId: string,
    photo: Blob,
    onProgress?: (fraction: number) => void,
  ): Promise<WorkoutLog> {
    const { data } = await client.put<{ log: WorkoutLog }>(`/workout-logs/${logId}/pump-photo`, photo, {
      headers: { 'Content-Type': photo.type || 'image/jpeg' },
      onUploadProgress: (event) => {
        if (onProgress && event.total) onProgress(event.loaded / event.total);
      },
    });
    return data.log;
  }

  async function removePumpPhoto(logId: string): Promise<WorkoutLog> {
    const { data } = await client.delete<{ log: WorkoutLog }>(`/workout-logs/${logId}/pump-photo`);
    return data.log;
  }

  // --- Body tracking (Phase 10): one day per date, kg / cm. A day left empty is
  // deleted, so the writes answer null for it.

  async function listBodyMetrics(): Promise<BodyMetricList> {
    const { data } = await client.get<BodyMetricList>('/body-metrics');
    return data;
  }

  /** The day as saved, and the achievements this save unlocked. */
  async function saveBodyMetric(date: string, payload: SaveBodyMetricPayload): Promise<BodyMetricResponse> {
    const { data } = await client.put<BodyMetricResponse>(`/body-metrics/${date}`, payload);
    return data;
  }

  async function deleteBodyMetricDay(date: string): Promise<void> {
    await client.delete(`/body-metrics/${date}`);
  }

  /** Sends the (already compressed) image as the raw body; replaces that pose's photo. */
  async function uploadProgressPhoto(
    date: string,
    pose: ProgressPhotoPose,
    photo: Blob,
    onProgress?: (fraction: number) => void,
  ): Promise<BodyMetricResponse> {
    const { data } = await client.put<BodyMetricResponse>(`/body-metrics/${date}/photos/${pose}`, photo, {
      headers: { 'Content-Type': photo.type || 'image/jpeg' },
      onUploadProgress: (event) => {
        if (onProgress && event.total) onProgress(event.loaded / event.total);
      },
    });
    return data;
  }

  /** The single dated baseline photo; sent after client-side compression as a raw image. */
  async function uploadStartingPhoto(
    date: string,
    photo: Blob,
    onProgress?: (fraction: number) => void,
  ): Promise<BodyMetricResponse> {
    const { data } = await client.put<BodyMetricResponse>(`/body-metrics/${date}/starting-photo`, photo, {
      headers: { 'Content-Type': photo.type || 'image/jpeg' },
      onUploadProgress: (event) => {
        if (onProgress && event.total) onProgress(event.loaded / event.total);
      },
    });
    return data;
  }

  async function removeProgressPhoto(date: string, pose: ProgressPhotoPose): Promise<BodyMetric | null> {
    const { data } = await client.delete<BodyMetricResponse>(`/body-metrics/${date}/photos/${pose}`);
    return data.metric;
  }

  // --- Achievements & streak (Phase 11): awarded by the server after saves.

  async function getAchievements(): Promise<AchievementOverview> {
    const { data } = await client.get<AchievementOverview>('/achievements');
    return data;
  }

  /** Their celebration was shown — they won't be celebrated again. */
  async function markAchievementsSeen(ids: string[]): Promise<void> {
    await client.post('/achievements/seen', { ids });
  }

  // --- Nutrition (Phase 13a): her newest published version, no calorie numbers.

  async function getNutritionPlan(): Promise<TraineeNutritionPlanResponse> {
    const { data } = await client.get<TraineeNutritionPlanResponse>('/nutrition-plan');
    return data;
  }

  /** She read the coach's intro of this version (13a+) — it opens collapsed from now on. */
  async function markNutritionIntroSeen(version: number): Promise<void> {
    await client.post('/nutrition-plan/intro-seen', { version });
  }

  // --- Portion tracking (Phase 13a+): her last 7 days, marks per group, meal photos.

  async function getMealLogs(): Promise<MealLogDaysResponse> {
    const { data } = await client.get<MealLogDaysResponse>('/meal-logs');
    return data;
  }

  /**
   * The whole day's marks (last write wins). A time limit, so a hung connection counts as
   * offline and the phone retries instead of waiting forever.
   */
  async function saveMealLog(date: string, eaten: PortionCounts): Promise<MealLogDay> {
    const { data } = await client.put<{ day: MealLogDay }>(`/meal-logs/${date}`, { eaten }, { timeout: MEAL_LOG_SAVE_TIMEOUT_MS });
    return data.day;
  }

  /** Sends the (already compressed) image as the raw body; ADDS a photo to that meal (a meal can hold several). */
  async function uploadMealPhoto(date: string, mealId: string, photo: Blob, onProgress?: (fraction: number) => void): Promise<MealLogDay> {
    const { data } = await client.post<{ day: MealLogDay }>(`/meal-logs/${date}/photos/${mealId}`, photo, {
      headers: { 'Content-Type': photo.type || 'image/jpeg' },
      onUploadProgress: (event) => {
        if (onProgress && event.total) onProgress(event.loaded / event.total);
      },
    });
    return data.day;
  }

  /** Removes ONE photo by its id (MealPhoto.id). */
  async function removeMealPhoto(date: string, photoId: string): Promise<MealLogDay> {
    const { data } = await client.delete<{ day: MealLogDay }>(`/meal-logs/${date}/photos/${photoId}`);
    return data.day;
  }

  /** "היעד שלי": her own daily portions (self-guided, no coach plan). */
  async function saveOwnNutritionTarget(payload: SaveOwnNutritionTargetPayload): Promise<OwnNutritionTarget> {
    const { data } = await client.put<{ ownTarget: OwnNutritionTarget }>('/meal-logs/target', payload);
    return data.ownTarget;
  }

  // --- Self-guided: free workouts (her own, outside any plan) and the first-run choice.

  async function startFreeWorkout(payload: StartFreeWorkoutPayload): Promise<{ session: WorkoutSession; resumed: boolean }> {
    const { data } = await client.post<{ session: WorkoutSession; resumed: boolean }>('/workout-logs/free', payload);
    return data;
  }

  async function addFreeExercise(logId: string, exerciseId: string): Promise<WorkoutSession> {
    const { data } = await client.post<{ session: WorkoutSession }>(`/workout-logs/${logId}/exercises`, { exerciseId });
    return data.session;
  }

  async function searchFreeExercises(search: string): Promise<ExerciseFacts[]> {
    const { data } = await client.get<{ items: ExerciseFacts[] }>('/workout-logs/free/exercises', { params: search ? { search } : {} });
    return data.items;
  }

  /** First run: "on my own" — remembered on the server, so a reopened app resumes in the questionnaire. */
  async function chooseSelfGuided(): Promise<AuthUser> {
    const { data } = await client.post<{ user: AuthUser }>('/users/me/self-guided');
    return data.user;
  }

  // --- The "unseen update" dots on her tab bar (Phase 13a), stored on the server.

  async function getTabUpdates(): Promise<TabUpdates> {
    const { data } = await client.get<TabUpdates>('/tab-updates');
    return data;
  }

  async function markTabSeen(tab: UpdateTab): Promise<TabUpdates> {
    const { data } = await client.post<TabUpdates>('/tab-updates/seen', { tab });
    return data;
  }

  return {
    getWeek,
    listMyCoachings,
    listMyCommunities,
    listPlans,
    getPlan,
    listWorkoutLogs,
    getWorkoutLog,
    startWorkout,
    getActiveSession,
    getSession,
    updateWorkoutSets,
    finishWorkout,
    abandonWorkout,
    updateWorkoutSummary,
    uploadPumpPhoto,
    removePumpPhoto,
    listBodyMetrics,
    saveBodyMetric,
    deleteBodyMetricDay,
    uploadProgressPhoto,
    uploadStartingPhoto,
    removeProgressPhoto,
    getAchievements,
    markAchievementsSeen,
    getNutritionPlan,
    markNutritionIntroSeen,
    getMealLogs,
    saveMealLog,
    uploadMealPhoto,
    removeMealPhoto,
    saveOwnNutritionTarget,
    startFreeWorkout,
    addFreeExercise,
    searchFreeExercises,
    chooseSelfGuided,
    getTabUpdates,
    markTabSeen,
  };
}

export type TraineeApi = ReturnType<typeof createTraineeApi>;
