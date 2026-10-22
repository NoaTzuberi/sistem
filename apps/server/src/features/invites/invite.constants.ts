/** 12 random bytes → 16 url-safe characters: unguessable, short enough to type. */
export const INVITE_CODE_BYTES = 12;
/** A personal link is single use and lasts this long (PLACEHOLDER default — owner may change). */
export const PERSONAL_INVITE_TTL_DAYS = 14;
/** How many open personal links the dashboard lists. */
export const MAX_LISTED_PERSONAL_INVITES = 50;
/**
 * The coach's short code (typed in the app's code boxes): 6 characters, no look-alikes (no I L O 0 1).
 * 31^6 ≈ 887M codes; the join routes are rate-limited per IP, so guessing is impractical.
 */
export const SHORT_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const SHORT_CODE_LENGTH = 6;
export const SHORT_CODE_PATTERN = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;
