export const PLAN_STATUS_IDS = ['draft', 'published'] as const;
export const DEFAULT_PLAN_STATUS = 'draft';

export const WORKOUT_KIND_IDS = ['strength', 'cardio'] as const;

export const SET_TYPE_IDS = ['warmup', 'working', 'drop'] as const;
export const DEFAULT_SET_TYPE = 'working';

// 0 = Sunday — weeks start on Sunday (owner decision).
export const MIN_DAY_OF_WEEK = 0;
export const MAX_DAY_OF_WEEK = 6;

// Superset labels are short tags like "A", "B", "C2".
export const SUPERSET_GROUP_PATTERN = /^[A-Z0-9]{1,3}$/;

// Plan builder limits — generous guards against a runaway payload, not product rules.
export const MAX_PLAN_WORKOUTS = 14;
export const MAX_WORKOUT_EXERCISES = 40;
export const MAX_EXERCISE_SETS = 20;
export const MAX_PLAN_TEXT_LENGTH = 2000;
/** A workout's name, as the coach types it in the builder (owner, 2026-10-28). */
export const MAX_WORKOUT_TITLE_LENGTH = 40;
/** What goes out with a published plan (same limits as the nutrition plan's note + tip). */
export const MAX_PLAN_INTRO_MESSAGE_LENGTH = 1500;
export const MAX_PLAN_INTRO_TIP_LENGTH = 300;

// Multi-week plans (blocks, 2026-11-09): one Plan per week, grouped by a PlanBlock.
export const MIN_BLOCK_WEEKS = 2;
export const MAX_BLOCK_WEEKS = 8;
export const DEFAULT_BLOCK_WEEKS = 4;
/** A per-exercise progression rule, applied when a week is copied into the weeks after it. */
export const PROGRESSION_IDS = ['weight', 'reps'] as const;
export const BLOCK_PROGRESSION = {
  /** "+2.5 ק״ג" per week. */
  weightStepKg: 2.5,
  /** "+1 חזרה" per week. */
  repsStep: 1,
  /** "שבוע קל": sets × 0.7, rounded, at least one; weights and reps stay as the week before. */
  deloadSetsFactor: 0.7,
} as const;
