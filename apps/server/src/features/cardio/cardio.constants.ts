export const CARDIO_SPORT_IDS = ['run', 'intervals', 'walk', 'bike'] as const;
export const CARDIO_METRIC_IDS = ['rpe', 'pace', 'speed', 'hrZone'] as const;
export const CARDIO_BLOCK_KIND_IDS = ['warmup', 'steady', 'work', 'recovery', 'cooldown'] as const;
export const CARDIO_SESSION_STATUS_IDS = ['draft', 'active'] as const;

// Product rules (task spec): a block lasts 15 s – 90 min, a repeat set runs 1–30 times.
export const MIN_BLOCK_SEC = 15;
export const MAX_BLOCK_SEC = 90 * 60;
export const MIN_REPEAT_TIMES = 1;
export const MAX_REPEAT_TIMES = 30;
export const MIN_INTENSITY = 1;
export const MAX_INTENSITY = 10;
/** A block at or above this counts as high intensity (the builder's "בעצימות גבוהה"). */
export const HIGH_INTENSITY_FROM = 7;

// Guards against a runaway payload, not product rules.
export const MAX_CARDIO_STEPS = 40;
export const MAX_REPEAT_BLOCKS = 10;
export const MAX_STEP_ID_LENGTH = 40;
export const MAX_CARDIO_NAME_LENGTH = 80;
export const MAX_CARDIO_NOTE_LENGTH = 1000;
export const MAX_CARDIO_LOG_NOTE_LENGTH = 1000;
export const MAX_DISTANCE_KM = 300;
/** How many of her latest logs the coach list returns. */
export const COACH_CARDIO_LOG_LIMIT = 100;
