import type { SetType } from '@sistem/types';

// What a newly added exercise starts with (owner decision): 3 × 10, no weight, no rest.
export const DEFAULT_SETS = 3;
export const DEFAULT_REPS = 10;

/** Drafts are saved on their own this long after the last change. */
export const AUTOSAVE_DELAY_MS = 2500;

/** A deleted workout's card folding away, and how long its "Undo" stays. */
export const WORKOUT_COLLAPSE_MS = 200;
export const WORKOUT_UNDO_MS = 6000;

export const SUPERSET_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

// The set types in picker order; their labels are in the shared copy (plan.setTypes). Day names
// come from Intl (dayNames) — 0 = Sunday, weeks start on Sunday (owner decision).
export const SET_TYPE_IDS: SetType[] = ['warmup', 'working', 'drop'];

// Display-only estimate of a workout's length (the hero band's "~32 minutes"). Never sent to the server.
/** A set's working time when it has no duration of its own. */
export const ESTIMATED_SET_SECONDS = 40;
/** The rest counted for a set whose rest is not set. */
export const ESTIMATED_REST_SECONDS = 60;
