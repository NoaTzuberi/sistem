import type { PlanCardio, WorkoutKind } from './cardio';
import type { CoachingStatus } from './accounts';

// API contract types shared by the mobile app, the coach dashboard and the server.
// Types only — no runtime code, so the server (CommonJS) can use `import type`.

/** A person may hold several roles (accounts & relationships): e.g. a coach who is also the platform admin. */
export type UserRole = 'trainee' | 'coach' | 'admin';

/**
 * Where a signed-in user belongs, decided by the server (PRD §4.2).
 * 'onboarding' → questionnaire, 'waiting' → plan is being built, 'home' → trainee
 * Home, 'coach' → coach mode, 'no_coach' → onboarded but not linked to any coach yet (enter a coach code),
 * 'admin' → an admin without a coach role (the dashboard only).
 */
/** 'choose_path' = the first-run "how do you want to train" screen (no coach, no choice yet). */
export type AppState = 'choose_path' | 'onboarding' | 'waiting' | 'home' | 'coach' | 'admin';

/** The side of the mobile app she uses. Someone with both the coach and the trainee role picks it in Profile. */
export type AppMode = 'coach' | 'trainee';

export type OnboardingStatus = 'not_started' | 'in_progress' | 'completed';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  /** Every role she holds. */
  roles: UserRole[];
  /** The primary role (admin > coach > trainee) — kept until both clients read `roles`. */
  role: UserRole;
  appState: AppState;
  /** Her current coaching's status; null = self-guided (no live coaching). Trainees only. */
  coachingStatus: CoachingStatus | null;
  onboardingStatus: OnboardingStatus;
  /** Computed from onboardingStatus — kept so older screens keep working. */
  onboardingCompleted: boolean;
  /** Server time; the 48h waiting timer counts from here (PRD §4.1). */
  onboardingCompletedAt: string | null;
  /** IANA time zone, e.g. 'Asia/Jerusalem'. Weeks start on Sunday in this zone. */
  timezone: string;
  /** Display units for body tracking, defaults filled in by the server. */
  units: UnitPreferences;
  /** UI language (Phase 15), default 'he'. Server-built texts follow it too. */
  language: Language;
  /** Her profile photo (signed, expiring link), or null = initials. */
  avatar: PrivatePhoto | null;
  /** The side of the app she uses now (server-decided from her roles + stored choice); null = neither (admin only). */
  appMode: AppMode | null;
  /** She holds both the coach and the trainee role: the Profile shows the mode switch. */
  canSwitchAppMode: boolean;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
  /** Sign-up only: the invite code could not be used (the account was still made). */
  inviteError?: { code: string; message: string };
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
  /** Device time zone (IANA). An unknown value falls back to the server default. */
  timezone?: string;
  /** The language on screen when she signed up (Phase 15); default Hebrew. */
  language?: Language;
  /** A /join code she arrived with: redeemed together with the sign-up (coaching or community). */
  inviteCode?: string;
}

/**
 * Every error response (Phase 15): a stable `code` clients may map to their own text,
 * and `message` already in the request's language (Accept-Language).
 */
export interface ApiErrorBody {
  code: string;
  message: string;
}

/** UI language (Phase 15): Hebrew is the default, right-to-left. */
export type Language = 'he' | 'en';

// ---------------------------------------------------------------------------
// Onboarding (PRD §10 OnboardingResponse)
// ---------------------------------------------------------------------------

export type OnboardingStepId =
  | 'welcome'
  | 'basic_profile'
  | 'goals'
  | 'frequency'
  | 'activities'
  | 'exercise_preferences'
  | 'recovery'
  | 'equipment'
  | 'nutrition_preferences'
  | 'review'
  | 'starting_photo';

export type WeightUnit = 'kg' | 'lb';
export type DistanceUnit = 'km' | 'miles';
export type LengthUnit = 'cm' | 'in';

/**
 * How body weight and measurements are shown and typed (Phase 10). Values are always
 * stored and sent in kg and cm; only the screens convert. Workout sets stay in kg.
 */
export interface UnitPreferences {
  weight: WeightUnit;
  length: LengthUnit;
}

/** Body of PATCH /users/preferences — a missing key leaves that setting unchanged. */
export interface UpdatePreferencesPayload {
  units?: Partial<UnitPreferences>;
  language?: Language;
  /** Only for someone with both roles; the server refuses a side her roles don't allow. */
  appMode?: AppMode;
}

/** The questionnaire answers — the same shape ATLAS stored in User.profile. */
export interface OnboardingAnswers {
  birthDate?: string;
  /** cm */
  height?: number;
  /** kg */
  weight?: number;
  gender?: string;
  goals: string[];
  trainingFrequency?: { minDays: number; maxDays: number; flexibleSchedule: boolean };
  preferredActivities: string[];
  exercisePreferences?: {
    favoriteExerciseNotes?: string;
    improvementExerciseNotes?: string;
    muscleFocus: string[];
  };
  equipment: string[];
  recovery?: { flags: string[]; notes?: string };
  /** Phase 13a. Missing = not answered (onboarding finished before the step existed). */
  nutritionPreferences?: NutritionPreferences;
  /** Phase 13a+ ("My goal"). Missing = not answered / not asked. */
  weightGoal?: WeightGoal;
  /** Phase 12b (frequency step, optional). Missing = not answered. */
  trainingExperience?: TrainingExperience;
}

/** How long she has trained consistently: new < 6 months · some 6 months–2 years · experienced 2+ years. */
export type TrainingExperience = 'new' | 'some' | 'experienced';

export type DietType = 'none' | 'vegetarian' | 'vegan' | 'pescatarian';
/** Combinable with the diet type. */
export type DietStyleId = 'keto_low_carb' | 'intermittent_fasting' | 'other';
export type ReligiousId = 'kosher' | 'halal';
export type IntoleranceId = 'lactose_free' | 'gluten_free' | 'celiac' | 'low_fodmap' | 'other';
/** Each one (except other) matches a food diet tag; "gluten" = gluten / wheat. */
export type AllergyId = 'dairy' | 'eggs' | 'peanuts' | 'tree_nuts' | 'sesame' | 'soy' | 'gluten' | 'fish' | 'shellfish' | 'other';

/** A selected option with her own words about it ("lactose ok in yogurt"). "other" always has details. */
export interface PreferenceItem<T extends string> {
  id: T;
  details?: string;
}

/**
 * The "Nutrition & goal" onboarding step (Phase 13a, v2 in 13a+). Health data: her own +
 * her coach's eyes only.
 */
export interface NutritionPreferences {
  dietType: DietType;
  dietTypeDetails?: string;
  dietStyles: PreferenceItem<DietStyleId>[];
  religious: PreferenceItem<ReligiousId>[];
  intolerances: PreferenceItem<IntoleranceId>[];
  allergies: PreferenceItem<AllergyId>[];
  foodsLoved?: string;
  foodsDisliked?: string;
  /** 2–6; null = no preference. Information only. */
  mealsPerDay: number | null;
}

export type WeightGoalTimeframe = { kind: 'weeks'; weeks: number } | { kind: 'date'; date: string };

/** Her target weight (always kg) and when she'd like to get there. */
export interface WeightGoal {
  targetWeightKg: number;
  timeframe: WeightGoalTimeframe | null;
  /** When she set it — "in 12 weeks" counts from here. */
  setAt: string;
}

/**
 * Body of PATCH /onboarding (one step) and POST /onboarding/complete (every field).
 * `name` goes to User.name and `units` to User.preferences.units; the rest are answers.
 */
export interface OnboardingAnswersPayload {
  name?: string;
  birthDate?: string;
  height?: number;
  weight?: number;
  gender?: string;
  units?: { weight: WeightUnit; distance: DistanceUnit };
  goals?: string[];
  trainingFrequency?: { minDays: number; maxDays: number; flexibleSchedule: boolean };
  preferredActivities?: string[];
  exercisePreferences?: {
    favoriteExerciseNotes?: string;
    improvementExerciseNotes?: string;
    muscleFocus?: string[];
  };
  equipment?: string[];
  recovery?: { flags?: string[]; notes?: string };
  nutritionPreferences?: NutritionPreferences;
  /** Target weight in her weight unit (stored in kg); null clears the goal. */
  weightGoal?: { targetWeight: number; timeframe: WeightGoalTimeframe | null } | null;
  /** null clears the answer. */
  trainingExperience?: TrainingExperience | null;
}

export interface SaveOnboardingStepPayload {
  step: OnboardingStepId;
  answers: OnboardingAnswersPayload;
}

export interface MyOnboarding {
  status: OnboardingStatus;
  lastStep: OnboardingStepId | null;
  completedAt: string | null;
  name: string;
  units: { weight?: WeightUnit; distance?: DistanceUnit } | null;
  answers: OnboardingAnswers | null;
}

export interface OnboardingSaveResponse {
  user: AuthUser;
  onboarding: MyOnboarding;
}

/**
 * GET /onboarding/waiting — what the "plan is being built" screen polls.
 * Both times come from the server clock; the client never uses device time for
 * the countdown (PRD §4.1, §11).
 */
export interface WaitingStatus {
  /** Changes to 'home' once a plan is published. */
  appState: AppState;
  serverTime: string;
  /** onboardingCompletedAt + the 48h window; null if onboarding is not finished. */
  planDueAt: string | null;
}

// ---------------------------------------------------------------------------
// Plans (PRD §10). All weights are kg, all body measurements cm, durations seconds.
// ---------------------------------------------------------------------------

export type PlanStatus = 'draft' | 'published';
export type SetType = 'warmup' | 'working' | 'drop';

/** One set as the coach planned it (pyramids, drop sets, warm-ups). */
export interface PlanSetTarget {
  type: SetType;
  reps?: number;
  repsMax?: number;
  durationSec?: number;
  targetWeight?: number;
  restSec?: number;
}

/**
 * A concrete set, resolved on the server from either setTargets or the uniform
 * fields. Screens always read this list — they never re-derive sets themselves.
 */
export interface ResolvedPlanSet extends PlanSetTarget {
  /** 0-based */
  setIndex: number;
}

/**
 * The factual library fields of an exercise — all the coach and the trainee ever see
 * from the imported dataset (no descriptions, tips or ratings: not cleared for use).
 */
export interface ExerciseFacts {
  id: string;
  name: string;
  primaryMuscles: string[];
  equipment: string[];
  difficulty: string;
  movementType: string;
  /** Phase 12b: its equipment-variant family, which variant it is, and the family's movement patterns. */
  familyId?: string;
  variant?: VariantId;
  patterns?: PatternId[];
}

export interface PlanExercise {
  id: string;
  exerciseId: string;
  /** The library facts (name, …); missing only if the exercise left the library. */
  exercise?: ExerciseFacts;
  sets: number;
  reps?: number;
  repsMax?: number;
  durationSec?: number;
  targetWeight?: number;
  restSec?: number;
  notes?: string;
  /** Exercises sharing a group inside a workout are done back to back. */
  supersetGroup?: string;
  setTargets?: PlanSetTarget[];
  /**
   * Interval mode (HIIT / Tabata): every set is timed — durationSec = work, restSec =
   * rest, one set = one round. A superset is interval as a whole (a circuit) or not at all.
   */
  interval?: boolean;
  /** Phase 12b, coach-only: the workout-type slot it fills (trainee APIs leave it out). */
  slotId?: string;
  resolvedSets: ResolvedPlanSet[];
}

export interface PlanWorkout {
  id: string;
  title: string;
  /** 0 = Sunday … 6 = Saturday */
  dayOfWeek?: number;
  order: number;
  notes?: string;
  /** Phase 12b, coach-only: its workout type (slot template); missing = free workout. */
  workoutType?: string;
  /** Coach-only: the type's suggested slots the coach removed from this workout. */
  hiddenSlotIds?: string[];
  /** Missing = strength. A cardio workout has no exercises; its blocks are in `cardio`. */
  kind?: WorkoutKind;
  cardio?: PlanCardio;
  exercises: PlanExercise[];
}

export interface Plan {
  id: string;
  traineeId: string;
  coachId: string;
  /** 'YYYY-MM-DD', always a Sunday in the trainee's time zone. */
  weekStartDate: string;
  status: PlanStatus;
  publishedAt: string | null;
  notes?: string;
  workouts: PlanWorkout[];
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// The trainee's own plans (/api/plans) — Phase 7
// ---------------------------------------------------------------------------

/**
 * Computed on the server in the trainee's time zone (clients never derive it):
 * done — a completed workout log exists · missed — not done and its day has passed
 * (a workout without a day: once its week is over) · upcoming — everything else.
 */
export type WorkoutStatus = 'upcoming' | 'done' | 'missed';

export interface TraineePlanWorkout extends PlanWorkout {
  status: WorkoutStatus;
  /** 'YYYY-MM-DD' of the planned day; null when the coach set no day. */
  date: string | null;
  /** Planned for today (in the trainee's time zone). */
  isToday: boolean;
  /** An unfinished workout log is open for it. */
  inProgress: boolean;
  /** The completed log of a done workout. */
  logId: string | null;
}

/** Where a plan's week sits relative to the trainee's current week. */
export type PlanPeriod = 'past' | 'current' | 'upcoming';

export interface TraineePlan extends Plan {
  period: PlanPeriod;
  workouts: TraineePlanWorkout[];
}

/** GET /plans — the trainee's published plans, newest week first. */
export interface TraineePlanList {
  items: TraineePlan[];
  /** Today's date in the trainee's time zone. */
  today: string;
  /** The Sunday that starts next week, so the app can pick next week's plan without date math. */
  nextWeekStartDate: string;
  serverTime: string;
}

/** GET /plans/week — what Home shows. */
export interface TraineeWeek {
  /** The Sunday of the current week in the trainee's time zone. */
  weekStartDate: string;
  today: string;
  serverTime: string;
  /** null when no plan is published for this week. */
  plan: TraineePlan | null;
  /**
   * What "Start next workout" opens: the workout in progress, else the first upcoming
   * one, else the earliest missed one (still doable until the week ends), else null.
   */
  nextWorkoutId: string | null;
  /** Her coach's name (Home's coach card: name + initials); null when she has no coach. */
  coach: { name: string } | null;
  /** Her open workout session, if any — also one left open in an earlier week. */
  activeLog: ActiveWorkoutRef | null;
}

// ---------------------------------------------------------------------------
// Plan builder (coach, /api/coach) — Phase 6
// ---------------------------------------------------------------------------

/** A plan as the coach sees it. */
/** A published plan's workouts as the server judges them today in her zone (done / upcoming / missed). */
export interface CoachPlanProgress {
  /** workout id → its status. */
  statuses: Record<string, WorkoutStatus>;
  completed: number;
  planned: number;
}
export interface CoachPlan extends Plan {
  /**
   * True once the trainee has a workout log for this plan: it can still be edited,
   * but no longer unpublished or deleted.
   */
  locked: boolean;
  /** The AI recommendation this plan was loaded from (coach-only; Phase 12). */
  aiRecommendationId?: string;
  /** Phase 12b: the split the plan follows (coach-only). */
  splitId?: string;
  /** The plan list only (the Plans tab's week rail): a published plan's workout statuses; absent for a draft. */
  progress?: CoachPlanProgress;
}

export interface PlanExerciseInput {
  /** Send the id of an existing plan exercise to keep it (workout logs point at it). */
  id?: string;
  exerciseId: string;
  /** Ignored when setTargets is sent (the set count is its length). */
  sets?: number;
  reps?: number;
  repsMax?: number;
  durationSec?: number;
  targetWeight?: number;
  restSec?: number;
  notes?: string;
  supersetGroup?: string;
  setTargets?: PlanSetTarget[];
  /** Timed sets only; a superset must be all interval or none to publish. */
  interval?: boolean;
  /** A slot of the workout's type (Phase 12b). */
  slotId?: string;
}

export interface PlanWorkoutInput {
  /** Send the id of an existing workout to keep it (workout logs point at it). */
  id?: string;
  title: string;
  dayOfWeek?: number;
  notes?: string;
  /** A workout type of the coach's training config (Phase 12b); omitted = free workout. */
  workoutType?: string;
  /** Suggested slots of the type she removed from this workout. */
  hiddenSlotIds?: string[];
  /** Omitted = strength. A cardio workout sends `cardio` and no exercises. */
  kind?: WorkoutKind;
  cardio?: PlanCardio;
  exercises: PlanExerciseInput[];
}

/** Body of PUT …/plans/:planId — the whole plan; order is the array order. */
export interface SavePlanPayload {
  notes?: string;
  workouts: PlanWorkoutInput[];
  /** Links the plan to the AI recommendation it was loaded from; null clears; omitted keeps. */
  aiRecommendationId?: string | null;
  /** A split of the coach's training config; null clears; omitted keeps (Phase 12b). */
  splitId?: string | null;
}

/** Body of POST …/plans. */
export interface CreatePlanPayload {
  /** 'YYYY-MM-DD' Sunday, this week or later in the trainee's time zone. */
  weekStartDate: string;
  /** Start from a copy of the trainee's most recent earlier plan instead of empty. */
  duplicatePrevious?: boolean;
}

/** How a week sits relative to the trainee's current week (her time zone). */
export type PlanWeekRelation = 'this' | 'next' | 'later';

/** One week the coach can pick for a new plan — never a past week. */
export interface PlanWeekOption {
  /** 'YYYY-MM-DD', a Sunday in the trainee's time zone. */
  weekStartDate: string;
  relation: PlanWeekRelation;
  /** The plan already in this week (draft or published): open it instead of creating. */
  plan: { id: string; status: PlanStatus } | null;
  /** The week "Duplicate last week" would copy into this one; null when there is none. */
  copiesFromWeek: string | null;
}

/** GET …/plan-weeks — the week picker of "New plan" and "Duplicate last week". */
export interface PlanWeekOptions {
  currentWeekStart: string;
  weeks: PlanWeekOption[];
  /** Always this week (it may already have a plan — then the picker offers "Open"). */
  defaultNewWeek: string;
  /** This week, or next week when this week already has a plan. */
  defaultDuplicateWeek: string;
}

/** One problem in a plan, pointing at the workout / exercise it belongs to (0-based). */
export interface PlanIssue {
  /** Stable code (Phase 15); `message` is in the request's language. */
  code: string;
  message: string;
  workoutIndex?: number;
  exerciseIndex?: number;
}

/** 400 body of the plan save / publish endpoints. */
export interface PlanIssuesBody extends ApiErrorBody {
  issues: PlanIssue[];
}

export interface ExerciseSearchParams {
  search?: string;
  muscle?: string;
  equipment?: string;
  difficulty?: string;
  page?: number;
  limit?: number;
}

export interface ExerciseSearchResult {
  items: ExerciseFacts[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Workout logs, body metrics, achievements
// ---------------------------------------------------------------------------

export type WorkoutLogStatus = 'in_progress' | 'completed' | 'abandoned';

export interface WorkoutLogSet {
  exerciseId: string;
  planExerciseId?: string;
  setIndex: number;
  type?: SetType;
  reps?: number;
  /** kg */
  weight?: number;
  durationSec?: number;
  completed: boolean;
  completedAt?: string;
}

export interface WorkoutLogStats {
  durationSec: number;
  totalVolume: number;
  setsCompleted: number;
  prCount: number;
}

/** 'plan' = a workout of a coach's plan; 'free' = one she built herself (no plan, trainee-owned). */
export type WorkoutLogSource = 'plan' | 'free';

export interface WorkoutLog {
  id: string;
  traineeId: string;
  source: WorkoutLogSource;
  /** null for a free workout. */
  planId: string | null;
  workoutId: string | null;
  workoutTitle: string;
  status: WorkoutLogStatus;
  startedAt: string;
  finishedAt: string | null;
  sets: WorkoutLogSet[];
  stats: WorkoutLogStats | null;
  /** 1–5, "How was it?" (PRD §5.3). */
  rating?: number;
  notes?: string;
  pumpPhoto: PrivatePhoto | null;
  /** Facts of the exercises in `sets` — filled in by the read endpoints (trainee + coach). */
  exercises?: ExerciseFacts[];
  /** PRs hit in this workout, in workout order — filled in by the read endpoints. */
  personalRecords?: LogPersonalRecord[];
  /** Achievements this workout unlocked (incl. its Daily Pump) — filled in by the read endpoints. */
  achievements?: Achievement[];
}

/**
 * A private photo (Daily Pump, later progress photos). The file is never public: `url`
 * is a short-lived signed link made for the signed-in viewer (the trainee or her
 * coach) on each request. When it expires, fetch the log again for a fresh one.
 */
export interface PrivatePhoto {
  uploadedAt: string;
  url: string;
  urlExpiresAt: string;
}

/**
 * weight = heaviest ever (kg) · reps = most reps at a weight done before · duration =
 * longest hold (seconds) at a weight. Working sets only; the first time is a baseline.
 */
export type PersonalRecordType = 'weight' | 'reps' | 'duration';

export interface LogPersonalRecord {
  exerciseId: string;
  type: PersonalRecordType;
  newValue: number;
  previousValue: number;
  /** kg — the weight a reps / duration record was done at; absent = bodyweight / none. */
  weight?: number;
}

/** Body of PATCH /workout-logs/:id/summary. null clears a value; a missing key leaves it. */
export interface WorkoutSummaryPayload {
  rating?: number | null;
  notes?: string | null;
}

// ---------------------------------------------------------------------------
// Active workout session (/api/workout-logs) — Phase 8, PRD §5.2
// ---------------------------------------------------------------------------

/** Enough to point at an open session (Home's "Resume", the start conflict). */
export interface ActiveWorkoutRef {
  logId: string;
  source: WorkoutLogSource;
  planId: string | null;
  workoutId: string | null;
  workoutTitle: string;
  startedAt: string;
}

/** POST /workout-logs/free — a workout she builds herself (scratch, a past log again, or by muscles). */
export type StartFreeWorkoutPayload =
  | { mode: 'scratch' }
  | { mode: 'repeat'; fromLogId: string }
  | { mode: 'muscle'; muscles: string[] };

/** Her muscle-focus ids (the onboarding list) for the free workout's "by muscle" mode. */
export type FreeWorkoutMuscle = 'chest' | 'back' | 'shoulders' | 'arms' | 'core' | 'glutes' | 'legs' | 'full_body';

/** Her most recent completed performance of one exercise ("Last time: 40 kg × 10"). */
export interface LastPerformance {
  reps?: number;
  /** kg */
  weight?: number;
  durationSec?: number;
  finishedAt: string;
}

/**
 * Everything the session screen needs. The log's sets were pre-filled by the server
 * from resolvedSets when the workout started; `workout` is the planned workout (facts,
 * targets, coach notes) the sets are matched to by planExerciseId + setIndex.
 */
export interface WorkoutSession {
  log: WorkoutLog;
  workout: PlanWorkout;
  /** Keyed by exerciseId; only exercises she has done before. */
  lastPerformance: Record<string, LastPerformance>;
  serverTime: string;
}

/** Body of POST /workout-logs — start, or resume the same workout. */
export interface StartWorkoutPayload {
  planId: string;
  workoutId: string;
}

/** 409 body when another workout is still open: resume it or discard it first. */
export interface ActiveWorkoutConflictBody extends ApiErrorBody {
  code: 'other_workout_active';
  activeLog: ActiveWorkoutRef;
}

/** One set as the trainee logged it. null clears a value (e.g. no weight). */
export interface WorkoutLogSetUpdate {
  planExerciseId: string;
  setIndex: number;
  reps?: number | null;
  /** kg */
  weight?: number | null;
  durationSec?: number | null;
  completed: boolean;
}

/** Body of PATCH /workout-logs/:id/sets, and the optional body of …/finish. */
export interface UpdateWorkoutSetsPayload {
  sets: WorkoutLogSetUpdate[];
}

// ---------------------------------------------------------------------------
// Body tracking (/api/body-metrics) — Phase 10, PRD §5.5
// ---------------------------------------------------------------------------

export type ProgressPhotoPose = 'front' | 'side' | 'back';

/** A progress photo: private, viewed only through its short-lived signed `url`. */
export interface ProgressPhoto extends PrivatePhoto {
  pose: ProgressPhotoPose;
}

/** One private baseline photo for the trainee; its date is the containing BodyMetric date. */
export interface StartingPhoto extends PrivatePhoto {
  tag: 'starting';
}

/** One day of body tracking — at most one per trainee per date. */
export interface BodyMetric {
  id: string;
  traineeId: string;
  /** 'YYYY-MM-DD' in the trainee's time zone */
  date: string;
  /** kg */
  weight?: number;
  /** cm, keyed by measurement id (BodyMetricList.measurementIds) */
  measurements: Record<string, number>;
  /** At most one per pose, in front / side / back order. */
  photos: ProgressPhoto[];
  startingPhoto?: StartingPhoto;
  notes?: string;
}

/** GET /body-metrics (and the coach's copy): newest day first. */
export interface BodyMetricList {
  items: BodyMetric[];
  /** The measurements that can be logged, in display order — the list lives on the server. */
  measurementIds: string[];
}

/**
 * Body of PUT /body-metrics/:date. kg / cm; null clears a value, a missing key leaves
 * it. A day left with nothing in it is deleted.
 */
export interface SaveBodyMetricPayload {
  weight?: number | null;
  measurements?: Record<string, number | null>;
}

/**
 * PUT / DELETE answers: the day as it is now, or null when nothing is left in it.
 * PUT answers also carry the achievements this save unlocked (Phase 11).
 */
export interface BodyMetricResponse {
  metric: BodyMetric | null;
  achievementsUnlocked?: Achievement[];
}

// ---------------------------------------------------------------------------
// Achievements & streaks (/api/achievements) — Phase 11, PRD §7
// Rules live on the server (achievement.definitions.ts); names are built by the
// clients from `type` (@sistem/shared describeAchievement).
// ---------------------------------------------------------------------------

export type AchievementType =
  | 'first_workout'
  | 'workouts_5'
  | 'workouts_10'
  | 'workouts_25'
  | 'workouts_50'
  | 'workouts_100'
  | 'first_weight_pr'
  | 'first_reps_pr'
  | 'prs_10'
  | 'prs_25'
  | 'prs_50'
  | 'volume_10k'
  | 'volume_50k'
  | 'volume_100k'
  | 'volume_500k'
  | 'volume_1m'
  | 'perfect_week'
  | 'streak_2'
  | 'streak_4'
  | 'streak_8'
  | 'streak_12'
  | 'streak_26'
  | 'streak_52'
  | 'comeback'
  | 'first_pump_photo'
  | 'first_measurement'
  | 'first_progress_photo'
  | 'weigh_ins_10';

export interface Achievement {
  id: string;
  traineeId: string;
  type: AchievementType;
  /** The threshold reached (one-time), or the metric's value then (repeatable). */
  value?: number;
  unlockedAt: string;
  /** The workout log / body day that met the rule. */
  sourceLogId: string | null;
  sourceBodyMetricId: string | null;
  /** false until its celebration was shown to the trainee (POST /achievements/seen). */
  seen: boolean;
}

/** Weekly plan completion streak, computed by the server in the trainee's time zone. */
export interface StreakSummary {
  /** Consecutive counting weeks up to now (weeks without a plan are skipped). */
  current: number;
  best: number;
  /** This week's published plan; null when there is none (or it has no workouts). */
  thisWeek: { done: number; planned: number } | null;
  /** done / planned a week needs to count, e.g. 1 = every workout. */
  weekCompletionRatio: number;
}

/** One definition's progress, in the server's config order. */
export interface AchievementProgress {
  type: AchievementType;
  repeatable: boolean;
  /** One-time: the target; repeatable: absent. */
  threshold?: number;
  /** The metric's value now (capped at nothing — compare with threshold). */
  current: number;
  /** Times unlocked (one-time: 0 or 1). */
  count: number;
  /** The latest unlock, if any. */
  unlockedAt: string | null;
}

/** GET /achievements and GET /coach/trainees/:id/achievements. */
export interface AchievementOverview {
  streak: StreakSummary;
  stats: {
    completedWorkouts: number;
    /** kg — lifetime sum of every workout's total volume */
    totalVolume: number;
    personalRecords: number;
  };
  /** Newest first. */
  unlocked: Achievement[];
  progress: AchievementProgress[];
}

/** Body of POST /achievements/seen. */
export interface MarkAchievementsSeenPayload {
  ids: string[];
}

// ---------------------------------------------------------------------------
// Coach views
// ---------------------------------------------------------------------------

/**
 * new: onboarding not finished · waiting: onboarding finished, no published plan yet ·
 * active: a published plan for this week or later · inactive: only older published plans.
 */
export type TraineeStatus = 'new' | 'waiting' | 'active' | 'inactive';

export interface CoachTraineeSummary {
  id: string;
  name: string;
  email: string;
  /** Her profile photo (signed, expiring link), or null = initials. */
  avatar: PrivatePhoto | null;
  onboardingStatus: OnboardingStatus;
  onboardingCompletedAt: string | null;
  timezone: string;
  createdAt: string;
  status: TraineeStatus;
  /** End of the 48h window; set only while the trainee is waiting for her first plan. */
  planDueAt: string | null;
  /** Active, with no plan (draft or published) for next week yet. */
  needsNextWeekPlan: boolean;
  /** Start of her latest workout log. */
  lastActivityAt: string | null;
  /** 'YYYY-MM-DD' Sunday of the current week in the trainee's time zone. */
  currentWeekStart: string;
  /** The coaching (this coach ↔ this trainee) every coach-owned record of hers belongs to. */
  coachingId: string;
  coachingStatus: CoachingStatus;
  /** When she joined this coach (the 48h window starts at the later of this and onboarding). */
  coachingStartedAt: string;
  /** This week's published plan of this coaching (her zone), or null. Statuses are the server's. */
  thisWeek: CoachTraineeThisWeek | null;
  /** "Week N" of her coaching, counted from the week of her first published plan; null before one. */
  coachingWeek: number | null;
  /** Her newest completed workout (strength, free or cardio) this coach can see. */
  lastCompletedAt: string | null;
  /** Why she needs the coach's attention now (coach/coachAttention.ts), or null. Active coachings only. */
  attention: CoachAttention | null;
}

/** One workout of her week, in the plan's order (the order gives its identity color, as in her app). */
export interface CoachWeekWorkout {
  id: string;
  title: string;
  kind: 'strength' | 'cardio';
  /** 0 = Sunday … 6, or null for a workout without a set day. */
  dayOfWeek: number | null;
  status: WorkoutStatus;
}

export interface CoachTraineeThisWeek {
  planId: string;
  /** Coach-only split id (Phase 12b), when the plan follows one — its label is the plan's only "name". */
  splitId: string | null;
  workouts: CoachWeekWorkout[];
  planned: number;
  completed: number;
  missed: number;
}

/**
 * The attention rule (coach/coachAttention.ts): an active trainee with no completed workout for N days
 * (counted from the later of her last workout and her first published plan), or with M missed workouts
 * this week. no_workout wins when both apply.
 */
export type CoachAttention = { reason: 'no_workout'; days: number } | { reason: 'missed_workouts'; count: number };

/** GET /coach/today — the coach mode Today stage. */
export interface CoachTodayResponse {
  serverTime: string;
  /** Today in the coach's zone ('YYYY-MM-DD'). */
  today: string;
  /** Calendar week of the year (weeks start on Sunday; week 1 holds 1 January), in the coach's zone. */
  weekOfYear: number;
  scoreboard: {
    /** Active coachings with at least one completed workout this week (her zone). */
    trainedThisWeek: number;
    activeTrainees: number;
    /** Coachings in 'waiting' (no published plan yet). */
    waiting: number;
    attention: number;
  };
  /** Waiting coachings, longest wait first. */
  waiting: CoachTraineeSummary[];
  /** Trainees who need attention (the amber feed cards). */
  attention: CoachTraineeSummary[];
}

export interface CoachActivityTrainee {
  id: string;
  name: string;
  avatar: PrivatePhoto | null;
}

/** The best record of a finished workout, for the feed's PR chip. */
export interface CoachActivityRecord {
  exerciseName: string;
  type: 'weight' | 'reps' | 'duration';
  /** kg, reps or seconds by type. */
  value: number;
}

export type CoachActivityEvent =
  | {
      type: 'workout_completed';
      logId: string;
      workoutTitle: string;
      /** A free workout she built herself. */
      free: boolean;
      setsCompleted: number;
      durationSec: number;
      rating: number | null;
      prCount: number;
      record: CoachActivityRecord | null;
    }
  | {
      type: 'cardio_completed';
      logId: string;
      workoutTitle: string;
      completedSec: number;
      roundsDone: number;
      roundsTotal: number;
      distanceKm: number | null;
    }
  | {
      type: 'photos_uploaded';
      source: 'meal' | 'progress' | 'pump';
      /** Her day ('YYYY-MM-DD'); for 'pump' the workout log. */
      date: string | null;
      logId: string | null;
      count: number;
      /** Signed, expiring links (the feed blurs them). Empty when photo storage is off. */
      photos: PrivatePhoto[];
    }
  | {
      type: 'measurements_updated';
      date: string;
      weightKg: number | null;
      /** The one notable change against her previous entry: the biggest move of weight or a measurement. */
      change: { id: string; delta: number } | null;
    }
  | {
      type: 'trainee_joined';
      onboardingStatus: OnboardingStatus;
    };

export type CoachActivityItem = CoachActivityEvent & {
  /** Stable across pages: '<type>:<record id>'. */
  id: string;
  /** When it happened (ISO). The feed is ordered by this, newest first. */
  at: string;
  trainee: CoachActivityTrainee;
  /**
   * Items she can react on (workouts, cardio, photos): what to send to PUT …/reactions and her
   * current reaction (null = none). Absent on the others (measurements, joined).
   */
  reactionTarget?: { type: ReactionTargetType; id: string; reaction: ReactionId | null };
};

/** GET /coach/activity?before=<ISO>&limit=<n> — newest first; nextBefore is the next page's `before`. */
export interface CoachActivityPage {
  items: CoachActivityItem[];
  nextBefore: string | null;
  serverTime: string;
}

export interface CoachTraineeDetail extends CoachTraineeSummary {
  onboarding: MyOnboarding | null;
}

/** GET /coach/trainees. serverTime is the clock the 48h countdowns count against. */
export interface CoachTraineeList {
  items: CoachTraineeSummary[];
  serverTime: string;
}

/** PUT / DELETE /users/me/avatar answer with her updated account. */
export interface AvatarResponse {
  user: AuthUser;
}

/** GET /users/me/avatar — a fresh link once the old one expired. */
export interface AvatarLinkResponse {
  avatar: PrivatePhoto | null;
}

/** GET /coach/trainees/:traineeId */
export interface CoachTraineeResponse {
  trainee: CoachTraineeDetail;
  serverTime: string;
}

/** PATCH /coach/trainees/:traineeId/end-coaching — her account and history stay; the coach loses access. */
export interface EndCoachingResponse {
  endedAt: string;
}

/**
 * A trainee whose coaching with this coach ended (the "archive" filter). Read-only and limited to what
 * the coach had before the end: no photos, nothing she logs afterwards. Coming back = a new invite.
 */
export interface CoachArchivedTrainee {
  id: string;
  name: string;
  email: string;
  timezone: string;
  /** The ended coaching every record shown belongs to. */
  coachingId: string;
  coachingStartedAt: string;
  coachingEndedAt: string;
  /** Her newest completed workout of that coaching. */
  lastCompletedAt: string | null;
}

/** GET /coach/archive — newest ending first. */
export interface CoachArchiveList {
  items: CoachArchivedTrainee[];
  serverTime: string;
}

/** GET /coach/archive/:traineeId */
export interface CoachArchivedTraineeResponse {
  trainee: CoachArchivedTrainee & { onboarding: MyOnboarding | null };
}

// --- Coach statistics & overview (GET /coach/stats) — read-only aggregates over the coach's own
// trainees. Every status below is decided on the server; the dashboard only displays it. ---

/** How many months back the range-dependent numbers look. */
export type CoachStatsRange = 3 | 6 | 12;

/** One day of a trainee's last 7 days: done = a workout finished that day · planned = a dated
 * workout still open today · missed = a dated workout whose day passed without being done. */
export type CoachBoardCell = 'done' | 'planned' | 'missed';

export interface CoachWeekPlan {
  id: string;
  weekStartDate: string;
  /** Coach-only split id (Phase 12b), when the plan follows one. */
  splitId: string | null;
  /** In the plan's own order. */
  /** dayOfWeek: 0 = Sunday … 6, or null for a workout without a set day. */
  workouts: { id: string; status: WorkoutStatus; dayOfWeek: number | null }[];
  planned: number;
  completed: number;
  /** Days until the plan's week ends in her zone (0 = it ends today). */
  daysLeft: number;
}

/** One trainee's week, for the trainees table, the week board and the drawer. */
export interface CoachTraineeWeek {
  traineeId: string;
  /** Onboarding goal ids (she may choose several). */
  goals: string[];
  /** Training days per week from onboarding. */
  daysPerWeek: { min: number; max: number } | null;
  /** This week's published plan (her zone), or null. */
  currentPlan: CoachWeekPlan | null;
  /** Next week's plan of any status, or null — "time to build next week". */
  nextWeekPlan: { id: string; status: PlanStatus } | null;
  /** Her last 7 days, oldest first; the last one is today in her zone. */
  days: { date: string; cell: CoachBoardCell | null }[];
}

export interface CoachStatsMonth {
  /** 'YYYY-MM' in the coach's zone. */
  month: string;
  /** Trainees with a published plan around the month's last day (the current month: today's status). */
  active: number;
}

/** One of the last six months (the tiles' sparklines) — the same whatever the range. */
export interface CoachStatsRecentMonth {
  month: string;
  /** Like CoachStatsMonth.active. */
  active: number;
  /** Sign-ups that month (coach's zone). */
  newTrainees: number;
}
export interface CoachStatsWeek {
  /** The Sunday of the week. */
  weekStartDate: string;
  planned: number;
  completed: number;
}

export interface CoachStatsRetention {
  months: 1 | 3 | 6;
  /** Trainees who finished onboarding at least this long ago. */
  eligible: number;
  /** Of them, the ones with a published plan for a week that far in or later. */
  retained: number;
}

export interface CoachPumpPhoto {
  traineeId: string;
  traineeName: string;
  logId: string;
  workoutTitle: string;
  /** A short-lived signed link, like every private photo. */
  photo: PrivatePhoto;
}

export interface CoachStats {
  range: CoachStatsRange;
  serverTime: string;
  /** Today and the current week's Sunday in the coach's zone. */
  today: string;
  weekStartDate: string;
  summary: {
    activeTrainees: number;
    /** Compared with the end of last month. */
    activeTraineesChange: number;
    newTraineesThisMonth: number;
    /** Compared with last month's sign-ups. */
    newTraineesChange: number;
    /** Workouts of the range's ENDED weeks (published plans): done / planned. */
    completedWorkouts: number;
    plannedWorkouts: number;
    /** Average hours from finishing onboarding to her first published plan (onboarded in the range). */
    hoursToFirstPlan: number | null;
    firstPlanCount: number;
    /** The same average for the period of the same length just before the range; null when nobody was onboarded then. */
    hoursToFirstPlanPrevious: number | null;
    /** Average 1–5 rating of the workouts finished in the range. */
    averageRating: number | null;
    ratingCount: number;
  };
  /** This week's published plans across all trainees. */
  thisWeek: { planned: number; completed: number };
  /** One point per month of the range, oldest first; the last one is this month. */
  activeByMonth: CoachStatsMonth[];
  /** The month ('YYYY-MM', coach's zone) her first trainee signed up; null without trainees.
   * Earlier months have no data — a chart leaves them empty instead of drawing 0. */
  firstTraineeMonth: string | null;
  /** The last six months, oldest first; the last one is this month. */
  recentMonths: CoachStatsRecentMonth[];
  /** The last 8 weeks, oldest first; the last one is this week. */
  weeklyWorkouts: CoachStatsWeek[];
  /** Goals of the active trainees, most common first. */
  goals: { goalId: string; count: number }[];
  retention: CoachStatsRetention[];
  trainees: CoachTraineeWeek[];
  pump: {
    /** Daily Pump photos uploaded since the start of yesterday (coach's zone). */
    newCount: number;
    total: number;
    /** The newest few. Empty when photo storage is not configured. */
    photos: CoachPumpPhoto[];
  };
  /** Finished workouts of the last 7 days that set personal records (the activity feed's PR tag). */
  recentPrs: { logId: string; prCount: number }[];
}

// ---------------------------------------------------------------------------
// Notifications (PRD §9). In-app since Phase 5a; push is added on top in Phase 5b.
// No wording is stored: screens build the text and the tap target from type + data.
// ---------------------------------------------------------------------------

export type NotificationType =
  | 'trainee_onboarded'
  | 'plan_published'
  | 'workout_completed'
  | 'nutrition_plan_published'
  | 'coach_note_thanks'
  | 'coaching_ended';

/** A coach note the trainee can thank for on Home: this week's plan notes / her nutrition intro. */
export type CoachNoteId = 'plan' | 'nutrition';

/** POST /notifications/thanks (trainee) → 204. One notification to her coach per note. */
export interface ThankCoachPayload {
  note: CoachNoteId;
}

interface NotificationBase {
  id: string;
  createdAt: string;
  /** null = unread */
  readAt: string | null;
}

export type AppNotification =
  /** To the coach. traineeName is a snapshot from when the trainee finished onboarding. */
  | (NotificationBase & { type: 'trainee_onboarded'; data: { traineeId: string; traineeName: string } })
  /** To the trainee. */
  | (NotificationBase & { type: 'plan_published'; data: { planId: string; weekStartDate: string } })
  /** To the coach (Phase 8). Names are snapshots from when the workout was finished. */
  | (NotificationBase & {
      type: 'workout_completed';
      data: { traineeId: string; traineeName: string; logId: string; workoutTitle: string };
    })
  /** To the trainee (Phase 13a): every publish of her nutrition plan; isUpdate = version > 1. */
  | (NotificationBase & {
      type: 'nutrition_plan_published';
      data: { planId: string; version: number; isUpdate: boolean };
    })
  /** To the coach: the trainee tapped "👍 Thanks!" under one of her notes (noteId = plan / nutrition version id). */
  | (NotificationBase & {
      type: 'coach_note_thanks';
      data: { traineeId: string; traineeName: string; note: CoachNoteId; noteId: string };
    })
  /** To the trainee: her coach ended the coaching. coachName is a snapshot from that moment. */
  | (NotificationBase & { type: 'coaching_ended'; data: { coachingId: string; coachName: string } });

/** GET /notifications — newest first. */
export interface NotificationList {
  items: AppNotification[];
  /** All of the user's unread notifications, not only this page. */
  unreadCount: number;
  /** Pass as `before` to get the next page; null when there is no more. */
  nextCursor: string | null;
}

export interface NotificationListParams {
  /** 1–50, default 20 */
  limit?: number;
  before?: string;
  /** true = unread only */
  unread?: boolean;
}

// ---------------------------------------------------------------------------
// AI recommendations (/api/coach/trainees/:id/ai-recommendations) — Phase 12, PRD §8.
// Coach-only drafts: nothing here ever reaches a trainee. Phase 13c adds 'nutrition_plan'
// (PRD §5.6) — the recommendation is split by type.
// ---------------------------------------------------------------------------

export type AiRecommendationType = 'training_plan' | 'nutrition_plan';
export type AiRecommendationStatus = 'pending' | 'running' | 'ready' | 'failed';
/** Started by the trainee finishing onboarding, or by the coach (Generate / Regenerate). */
export type AiRecommendationTrigger = 'onboarding' | 'coach';

/**
 * Exactly what the model was told about the trainee — no name, email, ids or exact
 * birth date. Free text is trimmed, with emails and phone numbers removed.
 */
export interface AiTraineeProfile {
  ageYears?: number;
  heightCm?: number;
  weightKg?: number;
  gender?: string;
  goals: string[];
  trainingDays?: { min: number; max: number; flexible: boolean };
  preferredActivities: string[];
  muscleFocus: string[];
  equipment: string[];
  recoveryFlags: string[];
  /** Phase 12b; missing = she didn't answer. */
  experience?: TrainingExperience;
  notes: { favoriteExercises?: string; exercisesToImprove?: string; recovery?: string };
}

/** One exercise of the AI draft. No target weight and no notes (the coach writes those). */
export interface AiPlanExercise {
  exerciseId: string;
  /** Library facts; missing only if the exercise left the library since. */
  exercise?: ExerciseFacts;
  sets: number;
  reps?: number;
  repsMax?: number;
  durationSec?: number;
  restSec?: number;
  supersetGroup?: string;
  /** For the coach only: why this exercise. */
  why: string;
  /** Phase 12b drafts: the slot it fills, its family and the variant chosen for her equipment. */
  slotId?: string;
  familyId?: string;
  variant?: VariantId;
}

export interface AiPlanWorkout {
  title: string;
  /** 0 = Sunday … 6 = Saturday */
  dayOfWeek?: number;
  /** For the coach only. */
  focus: string;
  /** Phase 12b drafts: the workout type of the split's day. */
  workoutType?: string;
  exercises: AiPlanExercise[];
}

/** One split the AI considers for her (Phase 12b), best first. */
export interface AiSplitOption {
  splitId: string;
  daysPerWeek: number;
  why: string;
  pros: string[];
  cons: string[];
}

/** The training plan draft, with its rationale for the coach. */
export interface AiTrainingPlanDraft {
  summary: string;
  /** Phase 12 drafts: the split in words. Phase 12b drafts use splitId / splitOptions. */
  split?: string;
  considerations: string[];
  workouts: AiPlanWorkout[];
  /** Phase 12b: the split the workouts follow (= splitOptions[0]). */
  splitId?: string;
  /** Phase 12b: 1–3 split options, best first; missing on Phase 12 drafts. */
  splitOptions?: AiSplitOption[];
  /** Phase 12b: how the AI reads her experience (for the coach). */
  experienceRead?: string;
}

export interface AiRecommendationInputSummary {
  profile: AiTraineeProfile;
  /** Titles of the training-knowledge passages (RAG) the model was given. */
  guidanceSources: string[];
  /** Set when the knowledge passages could not be retrieved. */
  guidanceNote?: string;
  candidateCount: number;
  promptVersion: string;
  /** Phase 12b: the split the coach asked for (regenerate for a split). */
  requestedSplitId?: string;
}

interface AiRecommendationBase {
  id: string;
  traineeId: string;
  status: AiRecommendationStatus;
  trigger: AiRecommendationTrigger;
  createdAt: string;
  completedAt: string | null;
  /** The model that produced the draft (or the last one tried). */
  model: string | null;
  attemptCount: number;
  error: { code: string; message: string } | null;
}

export interface AiTrainingRecommendation extends AiRecommendationBase {
  type: 'training_plan';
  input: AiRecommendationInputSummary | null;
  output: AiTrainingPlanDraft | null;
}

export interface AiNutritionRecommendation extends AiRecommendationBase {
  type: 'nutrition_plan';
  input: AiNutritionInputSummary | null;
  output: AiNutritionPlanDraft | null;
}

export type AiRecommendation = AiTrainingRecommendation | AiNutritionRecommendation;
/** The recommendation of one type. */
export type AiRecommendationOf<T extends AiRecommendationType> = Extract<AiRecommendation, { type: T }>;

// --- Nutrition draft (Phase 13c) ---

/** Her own words, sent to the model after cleaning (emails / phones removed, trimmed). */
export interface AiNutritionFreeText {
  /** Where it was written: 'foods_loved', 'foods_disliked', or '<section>:<item id>' (e.g. 'allergy:other'). */
  source: string;
  text: string;
}

/**
 * Exactly what the model was told about her for the nutrition draft — no name, email, ids,
 * birth date, photos, logs or body history. Restrictions are option ids (already enforced in code
 * by filtering the food list); free text is cleaned.
 */
export interface AiNutritionProfile {
  ageYears?: number;
  heightCm?: number;
  weightKg?: number;
  gender?: string;
  goals: string[];
  trainingDays?: { min: number; max: number };
  weightGoal?: { targetWeightKg: number; weeks: number | null };
  /** false = she skipped the nutrition step: nothing was filtered. */
  nutritionAnswered: boolean;
  dietType?: DietType;
  dietStyles: string[];
  religious: string[];
  intolerances: string[];
  allergies: string[];
  mealsPerDay: number | null;
  freeText: AiNutritionFreeText[];
}

/** The calculation the draft was built for — computed in code (calorieTarget.ts), never by the model. */
export interface AiNutritionCalculation {
  /** 'plan' = the coach's own target in her working copy; 'suggestion' = the calculation's. */
  targetSource: 'plan' | 'suggestion';
  kcal: number;
  bmr: number | null;
  tdee: number | null;
  deltaKcal: number | null;
  method: CalorieSuggestion['method'];
  weeklyRateKg: number | null;
  expectedWeeks: number | null;
  unsafePace: boolean;
  recommendedWeeks: number | null;
  raisedToFloor: boolean;
  dailyPortions: PortionCounts;
  portionsKcal: number;
  groupKcal: Record<PortionGroup, number>;
}

export interface AiNutritionInputSummary {
  profile: AiNutritionProfile;
  calculation: AiNutritionCalculation | null;
  /** The meal slots the model filled, in order. */
  meals: string[];
  /** Food items sent per group, and how many active items her answers filtered out. */
  foods: Record<PortionGroup, { sent: number; filteredOut: number }>;
  /** The diet tags her answers rule out (the filter). */
  excludedTags: DietTag[];
  promptVersion: string;
}

export interface AiNutritionLine {
  foodItemId: string;
  group: PortionGroup;
  portions: number;
  /** The item's facts; missing only if it left the coach's list since. */
  food?: NutritionFoodFacts & { archived: boolean };
}

export interface AiNutritionOption {
  /** Placeholder label set in code ("Option A"). */
  label: string;
  /** For the coach only. */
  why: string;
  lines: AiNutritionLine[];
}

export interface AiNutritionMeal {
  /** The slot name set in code (placeholder). */
  name: string;
  portions: PortionCounts;
  vegetablesFree: boolean;
  /** For the coach only. */
  why: string;
  options: AiNutritionOption[];
}

/** The nutrition draft, with its summary for the coach. No calorie numbers from the model. */
export interface AiNutritionPlanDraft {
  summary: string;
  considerations: string[];
  /** The target the portions were computed for (code). */
  kcal: number;
  dailyPortions: PortionCounts;
  meals: AiNutritionMeal[];
}

/** GET …/ai-recommendations/latest */
export interface AiRecommendationLatest<R extends AiRecommendation = AiRecommendation> {
  recommendation: R | null;
  /** Why AI drafts can't run on this server; null when they can. */
  unavailableReason: string | null;
}

/** Body of POST …/ai-recommendations */
export interface CreateAiRecommendationPayload {
  type: AiRecommendationType;
  /** training_plan only (Phase 12b): build the plan for this split. */
  splitId?: string;
}

// ---------------------------------------------------------------------------
// Training splits, workout-type slots and exercise families (Phase 12b, PRD §8 v2).
// Defaults in code (apps/server trainingSplits), per-coach overrides in TrainingSettings.
// Labels of ids live in @sistem/shared copy (trainingCopy).
// ---------------------------------------------------------------------------

export type PatternId =
  | 'squat'
  | 'lunge'
  | 'hinge'
  | 'glute_bridge'
  | 'glute_isolation'
  | 'hip_abduction'
  | 'hip_adduction'
  | 'knee_flexion'
  | 'knee_extension'
  | 'calf_raise'
  | 'horizontal_push'
  | 'chest_fly'
  | 'vertical_push'
  | 'shoulder_raise'
  | 'rear_delt'
  | 'horizontal_pull'
  | 'vertical_pull'
  | 'shrug'
  | 'elbow_flexion'
  | 'elbow_extension'
  | 'forearm'
  | 'core'
  | 'carry'
  | 'power'
  | 'conditioning'
  | 'mobility';

export type VariantId =
  | 'barbell'
  | 'dumbbell'
  | 'kettlebell'
  | 'smith_machine'
  | 'cable'
  | 'band'
  | 'machine'
  | 'ez_bar'
  | 'trap_bar'
  | 'plate'
  | 'medicine_ball'
  | 'exercise_ball'
  | 'bodyweight'
  | 'other';

export interface TrainingSlot {
  id: string;
  /** An exercise family fits the slot when it has one of these patterns. */
  patterns: PatternId[];
  /**
   * Old data only — no longer read (owner, 2026-10-28): slots are suggestions, none is required.
   * Coach settings saved before may still carry it.
   */
  required?: boolean;
  /** A guide for the AI draft only; the coach may add any number of exercises to a slot. */
  maxExercises: number;
  /** The coach's own label (a slot she added); default slots are labelled by id in the copy. */
  label?: string;
}

export interface WorkoutTypeConfig {
  id: string;
  slots: TrainingSlot[];
  /** The coach's own label; default types are labelled by id in the copy. */
  label?: string;
  /** A default the coach still has to confirm (e.g. what "ABC" means to her). */
  coachToConfirm?: boolean;
}

export interface SplitConfig {
  id: string;
  /** Days per week this split fits → the workout type of each day, in order. */
  days: Record<string, string[]>;
  enabled: boolean;
  coachToConfirm?: boolean;
}

/** GET /api/coach/training/config — the effective config (defaults + her overrides). */
export interface TrainingConfig {
  workoutTypes: WorkoutTypeConfig[];
  splits: SplitConfig[];
}

/** PUT /api/coach/training/settings — her overrides (the settings screen comes later). */
export interface TrainingSettingsPayload {
  workoutTypes?: Record<string, { slots: TrainingSlot[] }>;
  splits?: Record<string, { enabled?: boolean; days?: Record<string, string[]> }>;
}

export type FamilyReviewReason = 'unclear_pattern' | 'pattern_differs' | 'ambiguous_name' | 'many_copies';

export interface ExerciseVariantSummary {
  exerciseId: string;
  variant: VariantId;
  name: string;
  equipment: string[];
  difficulty: string;
  isPrimary: boolean;
  /** With a trainee: her equipment and level allow it. */
  allowed?: boolean;
}

/** One row of the family picker / library: the primaries of a family. */
export interface ExerciseFamilySummary {
  id: string;
  name: string;
  muscles: string[];
  movementType: string;
  patterns: PatternId[];
  levels: { min: string; max: string };
  /** Primaries only, one per variant. */
  variants: ExerciseVariantSummary[];
  /** Copies of a variant from other source programs (kept for old plans and logs). */
  copyCount: number;
  reviewReasons: FamilyReviewReason[];
  reviewedAt: string | null;
  source: 'auto' | 'coach';
  patternSource: 'auto' | 'coach';
}

/** GET …/exercise-families/:id — also the copies. */
export interface ExerciseFamilyDetail extends ExerciseFamilySummary {
  members: ExerciseVariantSummary[];
}

export interface ExerciseFamilySearchParams {
  search?: string;
  /** Slot filter: both or neither. */
  workoutType?: string;
  slotId?: string;
  /** Comma-separated PatternIds (narrows within the slot, or alone). */
  patterns?: string;
  /** Her equipment and level filter the variants (and families without an allowed variant). */
  traineeId?: string;
  /** With traineeId: false = also families she has no equipment for (variants marked). */
  equipmentOnly?: boolean;
  /** Comma-separated difficulties. */
  levels?: string;
  /** Library review screen. */
  review?: 'needed' | 'unclear' | 'reviewed';
  page?: number;
  limit?: number;
}

export interface ExerciseFamilySearchResult {
  items: ExerciseFamilySummary[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  /** Families the coach used most recently (≤ 8), for the "Recently used" row — matching the filter. */
  recent: ExerciseFamilySummary[];
}

/** PATCH …/exercise-families/:id */
export interface UpdateExerciseFamilyPayload {
  name?: string;
  patterns?: PatternId[];
  /** true marks it reviewed; false puts it back on the review list. */
  reviewed?: boolean;
}

/** One variant's history for a trainee (the builder's exercise card). PRs and "last time" stay per variant. */
export interface VariantHistory {
  exerciseId: string;
  variant: VariantId;
  name: string;
  /** Her last completed performance (the session's "Last time"); null = never done. */
  last: LastPerformance | null;
  /** Her newest personal record on it: value = kg (weight), reps (at `weight`) or seconds (duration). */
  best: { type: PersonalRecordType; value: number; weight?: number; date: string } | null;
}

/** GET /api/coach/trainees/:id/exercise-history?familyId= */
export interface FamilyHistory {
  familyId: string;
  variants: VariantHistory[];
}

// ---------------------------------------------------------------------------
// Nutrition (Phase 13a, PRD §5.6) — exchange lists ("portions"). The coach builds in the
// dashboard (/api/coach/...nutrition...); the trainee reads her latest published version
// (/api/nutrition-plan). Calorie numbers exist only on the coach's side.
// ---------------------------------------------------------------------------

/** `snack` (13a+): treats, ≈150 kcal per portion, only ever added by the coach. */
export type FoodGroup = 'protein' | 'carb' | 'fat' | 'snack' | 'vegetable';
/** The groups a meal counts portions of — vegetables are free. */
export type PortionGroup = 'protein' | 'carb' | 'fat' | 'snack';

/**
 * Food categories per group (13a+ food picker / list filters), derived from the section headings of the coach's md
 * lists. Vegetables have none. An item may have no category (shown under "All" / "Other").
 */
export type ProteinCategory = 'dairy' | 'poultry' | 'meat' | 'fish_seafood' | 'eggs' | 'plant_based' | 'supplements';
export type CarbCategory = 'grains_cereals' | 'bread_crackers' | 'fruits' | 'legumes' | 'starchy_vegetables';
export type FatCategory = 'oils' | 'nuts_seeds' | 'spreads' | 'other';
export type SnackCategory = 'sweet_cereals' | 'chocolate' | 'cookies_pastries' | 'ice_cream' | 'candy' | 'salty' | 'fast_food';
export type FoodCategory = ProteinCategory | CarbCategory | FatCategory | SnackCategory;
/** What a food contains, so the list can be checked against her preferences. */
export type DietTag =
  | 'meat'
  | 'poultry'
  | 'fish'
  | 'dairy'
  | 'eggs'
  | 'gluten'
  | 'peanuts'
  | 'tree_nuts'
  | 'sesame'
  | 'soy'
  | 'shellfish'
  | 'pork'
  | 'lactose'
  | 'alcohol'
  | 'high_fodmap';
/** fat_loss_aggressive (13a+) is only ever the coach's choice. */
export type NutritionGoal = 'fat_loss' | 'fat_loss_aggressive' | 'recomp' | 'muscle_gain' | 'maintenance';
/** Which Mifflin-St Jeor constant is used. */
export type FormulaSex = 'male' | 'female';

export interface FoodItem {
  id: string;
  group: FoodGroup;
  /** Stored and shown as the coach wrote it. */
  name: string;
  /** e.g. "3 slices", "1 heaping tsp" */
  portion: string;
  grams: number | null;
  /** Optional, never above the group's value. Coach-only. */
  kcal: number | null;
  isNew: boolean;
  dietTags: DietTag[];
  /** Must belong to the item's group; null = none. */
  category: FoodCategory | null;
  order: number;
  archivedAt: string | null;
  /** system = the app-wide food bank; mine = the coach's own item (new, or her edited copy of a system item). */
  source: FoodSource;
  /** Her edited copy: the system item it replaces in her lists ("restore to original" deletes the copy). */
  basedOn: string | null;
  /** A system item she hid from her lists (only in her library's "hidden" filter). */
  hidden: boolean;
}

export type FoodSource = 'system' | 'mine';

/** GET /admin/foods — the system food bank, checked against the default group values. */
export interface AdminFoodBankResponse {
  items: FoodItem[];
  config: NutritionConfig;
}

/** POST / PATCH /coach/nutrition/foods. On PATCH every key is optional; null clears grams / kcal. */
export interface FoodItemPayload {
  group?: FoodGroup;
  name?: string;
  portion?: string;
  grams?: number | null;
  kcal?: number | null;
  isNew?: boolean;
  dietTags?: DietTag[];
  /** null clears; on a group change an unfitting category is cleared. */
  category?: FoodCategory | null;
  order?: number;
}

/** DELETE /coach/nutrition/foods/:id — an item a plan / template uses is archived instead. */
export interface DeleteFoodItemResult {
  /** reverted = her edited copy is gone and the system item is back in her lists. */
  outcome: 'deleted' | 'archived' | 'reverted';
  item: FoodItem | null;
}

/** The coach's calorie numbers: server defaults merged with her overrides (one config). */
export interface NutritionConfig {
  /** kcal per portion. vegetable is always 0 ("free"). */
  groupKcal: Record<FoodGroup, number>;
  /** Percent added to the maintenance estimate, e.g. -20 for fat loss. */
  goalAdjustments: Record<NutritionGoal, number>;
  /** Activity factor by training days per week: index 0 = 1 day … index 6 = 7 days. */
  activityFactors: number[];
  /** The recommendation is never below this; a lower target needs the coach's explicit confirmation. */
  floorKcal: number;
  /** kcal per kg of body weight change (timeline math). */
  kcalPerKg: number;
  /** Safe maximum loss, % of body weight per week. */
  maxLossRatePctPerWeek: number;
  /** Safe maximum gain, % of body weight per week. */
  maxGainRatePctPerWeek: number;
  /** The largest daily deficit, % of TDEE. */
  maxDeficitPct: number;
  /** How the daily kcal is split into portions, % per group (sums to 100). */
  portionSplit: Record<PortionGroup, number>;
  /** Keto / low-carb: more carb portions a day than this is a warning. */
  ketoMaxCarbPortions: number;
}

/** PUT /coach/nutrition/settings — the whole tunable config (vegetable stays 0). */
export interface NutritionSettingsPayload extends Omit<NutritionConfig, 'groupKcal'> {
  groupKcal: Record<PortionGroup, number>;
}

export interface NutritionSettingsResponse {
  config: NutritionConfig;
  defaults: NutritionConfig;
}

export type CalorieSuggestionStatus = 'ok' | 'needs_formula' | 'missing_inputs';
export type CalorieSuggestionMissing = 'weight' | 'height' | 'birthDate' | 'trainingFrequency';

/** The coach's own values for the calculation; null = her data. Stored on the plan. */
export interface CalculationOverrides {
  weightKg: number | null;
  heightCm: number | null;
  ageYears: number | null;
  activityFactor: number | null;
  targetWeightKg: number | null;
  /** Weeks from today. */
  timelineWeeks: number | null;
}

export type CalculationOverrideField = keyof CalculationOverrides;

/** Everything the estimate used, shown next to the number. */
export interface CalorieSuggestionInputs {
  weightKg: number | null;
  weightSource: 'weigh_in' | 'onboarding' | 'coach' | null;
  /** 'YYYY-MM-DD' of the weigh-in used. */
  weightDate: string | null;
  heightCm: number | null;
  ageYears: number | null;
  /** Her onboarding answer. */
  sex: string | null;
  /** The constants used: hers, or the coach's pick when she answered other / nothing. */
  formulaSex: FormulaSex | null;
  trainingDays: number | null;
  activityFactor: number | null;
  goal: NutritionGoal;
  goalSource: 'onboarding' | 'coach';
  adjustmentPct: number;
  /** Her target (or the coach's). */
  targetWeightKg: number | null;
  /** Weeks left to her timeframe (or the coach's weeks); null = no timeframe. */
  timelineWeeks: number | null;
  /** 'YYYY-MM-DD' her timeframe ends (null for the coach's weeks or none). */
  targetDate: string | null;
  /** Which inputs are the coach's values. */
  overridden: CalculationOverrideField[];
}

/** Why her target / timeframe was not used. */
export type TimelineNote = 'wrong_direction' | 'date_passed' | 'target_reached' | 'goal_not_weight';
/** The cap that limited a requested pace. */
export type TimelineLimit = 'rate' | 'max_deficit' | 'floor';

export interface CalorieTimeline {
  requestedWeeks: number;
  /** kcal / day her pace would need (positive). */
  requiredDailyKcal: number;
  /** kg / week her pace would need (positive). */
  requiredRateKg: number;
  /** The safe maximum, kg / week (positive). */
  safeRateKg: number;
  unsafe: boolean;
  limitedBy: TimelineLimit | null;
  /** Weeks at the safe pace — set only when her pace is unsafe. */
  recommendedWeeks: number | null;
}

/** GET /coach/trainees/:id/nutrition-plan/suggestion (the calculation summary). */
export interface CalorieSuggestion {
  status: CalorieSuggestionStatus;
  missing: CalorieSuggestionMissing[];
  inputs: CalorieSuggestionInputs;
  /** 'timeline' = from her target weight + timeframe; 'goal_percent' = the goal %. */
  method: 'goal_percent' | 'timeline' | null;
  bmr: number | null;
  tdee: number | null;
  /** The recommended daily kcal (never below the floor). */
  kcal: number | null;
  /** kcal / day vs TDEE: negative = deficit, positive = surplus. */
  deltaKcal: number | null;
  /** deltaKcal as % of TDEE. */
  deltaPct: number | null;
  /** Expected kg / week (negative = loss). */
  weeklyRateKg: number | null;
  /** Weeks to her target at that rate; null without a usable target. */
  expectedWeeks: number | null;
  timeline: CalorieTimeline | null;
  timelineNote: TimelineNote | null;
  floorKcal: number;
  /** The calculation fell below the floor and was raised to it. */
  raisedToFloor: boolean;
  /** Recommended portions per group for `kcal`, and what they add up to. */
  portions: PortionCounts | null;
  portionsKcal: number | null;
}

export type CalorieTargetSource = 'suggested' | 'override';

export interface NutritionFloorConfirmation {
  /** The target that was confirmed — a different target needs a new confirmation. */
  kcal: number;
  floorKcal: number;
  confirmedAt: string;
}

export interface NutritionCalorieTarget {
  kcal: number | null;
  source: CalorieTargetSource | null;
  goal: NutritionGoal;
  formulaSex: FormulaSex | null;
  overrides: CalculationOverrides;
  /** The estimate as it was when the plan was last saved. */
  suggestion: CalorieSuggestion | null;
  floorConfirmation: NutritionFloorConfirmation | null;
}

/**
 * What she gets (owner, 2026-10-20): 'portions' = daily portions per group, she picks foods herself from
 * the coach's list; 'menu' = meals with options. Switching never deletes meals or the daily portions.
 */
export type NutritionPlanMode = 'portions' | 'menu';

export interface PortionCounts {
  protein: number;
  carb: number;
  fat: number;
  /** 13a+; stored data from before it reads as 0. */
  snack: number;
}

/** 'recipe' belongs to the closed nutritionRecipes feature (13b). */
export type NutritionLineKind = 'food' | 'text' | 'recipe';

export interface NutritionOptionLine {
  id: string;
  kind: NutritionLineKind;
  foodItemId?: string;
  recipeId?: string;
  /** A food line's group is its item's; a text line may have one (counted) or none. */
  group: FoodGroup | null;
  /** Steps of 0.5; null on an uncounted text line. */
  portions: number | null;
  text?: string;
}

export interface NutritionMealOption {
  id: string;
  label: string;
  lines: NutritionOptionLine[];
}

export interface NutritionMeal {
  id: string;
  name: string;
  portions: PortionCounts;
  vegetablesFree: boolean;
  options: NutritionMealOption[];
}

export interface NutritionTip {
  id: string;
  text: string;
}

export interface NutritionKcal {
  meals: { mealId: string; kcal: number }[];
  day: number;
}

export interface NutritionOptionLineInput {
  id?: string;
  kind: NutritionLineKind;
  foodItemId?: string;
  recipeId?: string;
  group?: FoodGroup | null;
  portions?: number | null;
  text?: string;
}

export interface NutritionMealOptionInput {
  id?: string;
  label: string;
  lines: NutritionOptionLineInput[];
}

export interface NutritionMealInput {
  id?: string;
  name: string;
  portions: PortionCounts;
  vegetablesFree: boolean;
  options: NutritionMealOptionInput[];
}

/** PUT /coach/trainees/:id/nutrition-plan — the working copy (autosave). */
export interface SaveNutritionPlanPayload {
  calorieTarget: {
    kcal: number | null;
    source: CalorieTargetSource | null;
    goal: NutritionGoal;
    formulaSex: FormulaSex | null;
    /** Omitted = keep the stored ones. */
    overrides?: CalculationOverrides;
    /** The coach ticked "I confirm this target" (only matters below the floor). */
    confirmBelowFloor: boolean;
  };
  meals: NutritionMealInput[];
  tips: { id?: string; text: string }[];
  /** Omitted = keep (a plan saved before modes reads as menu when an option has lines, else portions). */
  mode?: NutritionPlanMode;
  /** The day's portions in portions mode (steps of 0.5). Omitted = keep. */
  dailyPortions?: PortionCounts;
  /** Portions mode: "vegetables free, at every meal". Omitted = keep. */
  vegetablesFree?: boolean;
  /** Plain text, ≤ 1,500 chars, line breaks kept; '' / null = none. Omitted = keep. May say {name}. */
  introMessage?: string | null;
  /** Her tip under the note: plain text ≤ 300 chars; '' / null = none. Omitted = keep. May say {name}. */
  introTip?: string | null;
  /** 13b, waterTracking only — refused while the feature is closed. */
  waterGoalMl?: number | null;
  /** The coach's daily protein goal in grams (whole, 1–400); null clears; omitted keeps. */
  proteinGramsTarget?: number | null;
  /** Links the plan to the AI nutrition draft it was loaded from (13c); null clears; omitted keeps. */
  aiRecommendationId?: string | null;
}

export type NutritionIssueSeverity = 'error' | 'warning';

/** A publish rule; errors block publishing, warnings don't. Indexes point at the row. */
export interface NutritionIssue {
  severity: NutritionIssueSeverity;
  code: string;
  message: string;
  mealIndex?: number;
  optionIndex?: number;
  lineIndex?: number;
}

export interface NutritionIssuesBody extends ApiErrorBody {
  issues: NutritionIssue[];
}

/** The closed (13b) features, decided by the server. Clients only hide / show. */
export interface NutritionFeatures {
  nutritionRecipes: boolean;
  waterTracking: boolean;
}

export interface CoachNutritionPlan {
  id: string;
  traineeId: string;
  calorieTarget: NutritionCalorieTarget;
  mode: NutritionPlanMode;
  /** Portions mode's day (kept in menu mode too, so switching back loses nothing). */
  dailyPortions: PortionCounts;
  /** Portions mode: vegetables free at every meal. */
  vegetablesFree: boolean;
  meals: NutritionMeal[];
  tips: NutritionTip[];
  introMessage: string | null;
  introTip: string | null;
  waterGoalMl: number | null;
  /** The coach's daily protein goal in grams; null = none (no per-portion protein value exists to compute one). */
  proteinGramsTarget: number | null;
  templateId: string | null;
  /** 0 = never published. */
  publishedVersion: number;
  publishedAt: string | null;
  /** The working copy differs from the last published version. */
  changedSincePublish: boolean;
  updatedAt: string;
  kcal: NutritionKcal;
  /** The day's portions as she gets them: dailyPortions in portions mode, the meals summed in menu mode. */
  dayPortions: PortionCounts;
  /** Recommended portions for the current target (null without a target). */
  targetPortions: PortionCounts | null;
  /** The AI nutrition draft the meals were loaded from (coach-only, 13c). */
  aiRecommendationId: string | null;
}

/** A food as the trainee sees it — no calories. */
export interface NutritionFoodFacts {
  id: string;
  group: FoodGroup;
  name: string;
  portion: string;
  grams: number | null;
  isNew: boolean;
  /** One of its group's categories (the trainee's food sheet groups by it); null = none set. */
  category: FoodCategory | null;
}

export interface NutritionViewLine {
  id: string;
  kind: NutritionLineKind;
  group: FoodGroup | null;
  portions: number | null;
  text?: string;
  food?: NutritionFoodFacts;
}

export interface NutritionViewMeal {
  id: string;
  name: string;
  portions: PortionCounts;
  vegetablesFree: boolean;
  options: { id: string; label: string; lines: NutritionViewLine[] }[];
}

/** A published version as the trainee (and coach mode) shows it. No calorie numbers. */
export interface NutritionPlanView {
  version: number;
  publishedAt: string;
  /** Portions mode sends no meals (she picks from the food lists); menu mode sends them. */
  mode: NutritionPlanMode;
  meals: NutritionViewMeal[];
  tips: string[];
  /** The coach's note at the top of the tab (plain text, line breaks kept). */
  intro: string | null;
  /** The coach's tip under the note (a "Tip from <coach>" card); null = none. {name} already filled. */
  introTip: string | null;
  /** The day's portions (the day header / tracker): the daily portions, or the meals summed. */
  dayPortions: PortionCounts;
  /** Vegetables free that day (portions mode: the plan's switch; menu mode: any meal with it on). */
  vegetablesFree: boolean;
  /** Every active item of each group — what a portion can be swapped for. */
  swaps: Record<FoodGroup, NutritionFoodFacts[]>;
  /** Only while waterTracking is open (13b). */
  waterGoalMl?: number | null;
  /** The coach's daily protein goal in grams; null = none (show nothing). */
  proteinGramsTarget: number | null;
}

/** GET /nutrition-plan (trainee). */
export interface TraineeNutritionPlanResponse {
  plan: NutritionPlanView | null;
  /** The coach who published it (the coach card's name and initials); null when there is no plan. */
  coach: { name: string } | null;
  /** She hasn't read this version's intro yet (open it; POST /nutrition-plan/intro-seen after). */
  introUnseen: boolean;
  /**
   * No published plan yet: the food lists she can browse with her own daily target — her coach's lists,
   * or the system bank when she has no coach. null when `plan` carries them (plan.swaps).
   */
  swaps: Record<FoodGroup, NutritionFoodFacts[]> | null;
  features: NutritionFeatures;
}

/** POST /nutrition-plan/intro-seen */
export interface MarkNutritionIntroSeenPayload {
  version: number;
}

/** GET /coach/trainees/:id/nutrition-plan */
export interface CoachNutritionPlanResponse {
  /** null until the coach first saves one. */
  plan: CoachNutritionPlan | null;
  /** The latest published version, as she sees it. */
  published: NutritionPlanView | null;
  /** null = not answered. */
  preferences: NutritionPreferences | null;
  /** The goal mapped from her onboarding goals — where a new plan starts. */
  defaultGoal: NutritionGoal;
  /** The coach's whole food list, archived items included (lines may point at them). */
  foods: FoodItem[];
  /** Her most recently used items per group across her nutrition plans (newest first, ≤ 8 each; may include archived ids). */
  recentFoodIds: Record<FoodGroup, string[]>;
  config: NutritionConfig;
  issues: NutritionIssue[];
  features: NutritionFeatures;
}

export interface NutritionTemplate {
  id: string;
  name: string;
  description?: string;
  targetKcal: number | null;
  meals: NutritionMeal[];
  tips: NutritionTip[];
  updatedAt: string;
  kcal: NutritionKcal;
}

/** POST /coach/trainees/:id/nutrition-plan/template — saves her working copy as a template. */
export interface CreateNutritionTemplatePayload {
  name: string;
  description?: string;
}

/** PATCH /coach/nutrition/templates/:id — a new name only. */
export interface RenameNutritionTemplatePayload {
  name: string;
}

/** POST /coach/trainees/:id/nutrition-plan/from-template */
export interface ApplyNutritionTemplatePayload {
  templateId: string;
}

// ---------------------------------------------------------------------------
// Portion tracking (Phase 13a+, PRD §5.6): one MealLog per trainee and day — marked
// portions per group against the day's plan, and optional private meal photos. No
// calorie numbers anywhere.
// ---------------------------------------------------------------------------

export interface MealPhoto extends PrivatePhoto {
  /** This photo's own id (a meal can hold several photos a day). */
  id: string;
  mealId: string;
  /** The meal's name when the photo was added. */
  mealName: string;
}

export interface MealLogDay {
  /** 'YYYY-MM-DD' in her time zone. */
  date: string;
  /** The day's planned portions (the plan version live that day). */
  planned: PortionCounts;
  eaten: PortionCounts;
  photos: MealPhoto[];
  /** Plan version used; null when nothing was logged and no plan was live. */
  planVersion: number | null;
  /** She can still change this day (today and the 6 days before). */
  editable: boolean;
  /** Anything stored for this day. */
  logged: boolean;
  /** The meals of that version, for the photo slots (id + name); default meals for portions-only / her own target. */
  meals: { id: string; name: string }[];
  /** What the day is tracked against: a coach's plan, her own target ("היעד שלי"), or nothing yet. */
  source: 'plan' | 'own' | null;
}

/** "היעד שלי": the daily portions a self-guided trainee sets for herself. */
export interface OwnNutritionTarget {
  portions: PortionCounts;
  /** Vegetables are free (shown as a line, never tracked). */
  freeVegetables: boolean;
  updatedAt: string;
}

/** PUT /meal-logs/target */
export interface SaveOwnNutritionTargetPayload {
  portions: PortionCounts;
  freeVegetables: boolean;
}

/** GET /meal-logs?from=&to= (trainee; at most the editable window). */
export interface MealLogDaysResponse {
  today: string;
  days: MealLogDay[];
  /** Her own target, or null (also when a coach's plan is what she tracks against). */
  ownTarget: OwnNutritionTarget | null;
  /** True when a coach nutrition plan is live — then her own target is not used. */
  hasCoachPlan: boolean;
}

/** PUT /meal-logs/:date — the whole day's marks (last write wins). */
export interface SaveMealLogPayload {
  eaten: PortionCounts;
}

/** GET /coach/trainees/:id/meal-logs?weekStart= — Sunday week, read-only. */
export interface CoachMealLogWeek {
  weekStart: string;
  today: string;
  /** Sun → Sat; a day without a live plan has planned 0s and logged false. */
  days: MealLogDay[];
  totals: { planned: PortionCounts; eaten: PortionCounts };
}

// ---------------------------------------------------------------------------
// Tab updates (Phase 13a): a dot on the trainee's tab bar when something new was
// published since she last opened that tab. "Last seen" is stored on the server.
// ---------------------------------------------------------------------------

export type UpdateTab = 'workouts' | 'nutrition';

/** GET /tab-updates */
export type TabUpdates = Record<UpdateTab, boolean>;

/** POST /tab-updates/seen */
export interface MarkTabSeenPayload {
  tab: UpdateTab;
}

// Cardio sessions + logs.
export * from './cardio';
export * from './accounts';
// Coach mode Phase B: reactions + messages.
export * from './coachConnect';
import type { ReactionId, ReactionTargetType } from './coachConnect';
