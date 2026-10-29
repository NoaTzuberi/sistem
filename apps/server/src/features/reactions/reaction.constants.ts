/** 👏 🔥 ❤️ (the screens draw the emoji from the id). */
export const REACTION_IDS = ['clap', 'fire', 'heart'] as const;

export const REACTION_TARGET_TYPES = ['workout_log', 'cardio_log', 'pump_photo', 'meal_photos', 'progress_photos'] as const;

/** Targets keyed by a log id; the others by her date ('YYYY-MM-DD'). */
export const LOG_TARGET_TYPES = ['workout_log', 'cardio_log', 'pump_photo'] as const;

/** GET /reactions: how far back and how many (Home shows the newest; a log page filters by log). */
export const REACTION_LOOKBACK_DAYS = 14;
export const REACTION_LIST_LIMIT = 20;
