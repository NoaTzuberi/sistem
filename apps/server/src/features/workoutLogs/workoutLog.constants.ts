// Same states as the ATLAS session: a log is saved the moment a workout starts,
// so a closed app or lost connection never loses logged sets.
export const WORKOUT_LOG_STATUS_IDS = ['in_progress', 'completed', 'abandoned'] as const;
export const DEFAULT_WORKOUT_LOG_STATUS = 'in_progress';

export const MIN_RATING = 1;
export const MAX_RATING = 5;
export const MAX_NOTES_LENGTH = 1000;

// How many recent completed logs are searched for "Last time" — enough for a
// weekly plan, without reading her whole history on every session load.
export const LAST_PERFORMANCE_LOG_SCAN = 50;

// Request limits for set updates (kg, seconds).
export const MAX_SET_UPDATES = 300;
// "+ Extra set" in the session: an exercise can grow to this many sets (planned + added).
export const MAX_SETS_PER_EXERCISE = 20;
export const MAX_LOGGED_REPS = 1000;
export const MAX_LOGGED_WEIGHT = 1000;
export const MAX_LOGGED_DURATION_SEC = 6 * 60 * 60;
