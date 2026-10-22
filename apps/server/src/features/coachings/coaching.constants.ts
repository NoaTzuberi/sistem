export const COACHING_STATUS_IDS = ['waiting', 'active', 'ended'] as const;
/** A coaching that still gives the coach access to her data. */
export const LIVE_COACHING_STATUSES = ['waiting', 'active'] as const;
/** Optional now (not shown in the UI yet); free text is allowed, these are the known ones. */
export const KNOWN_DISCIPLINES = ['strength', 'pilates', 'yoga', 'running'] as const;
export const MAX_DISCIPLINE_LENGTH = 40;
