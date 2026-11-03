/** What she types to confirm when her account has no password (e.g. a later Google / Apple sign-in). */
export const ACCOUNT_DELETE_CONFIRM_WORDS: readonly string[] = ['מחיקה', 'DELETE', 'delete'];

/** Longest password / confirm text the endpoint reads (bcrypt reads 72 bytes anyway). */
export const ACCOUNT_DELETE_MAX_INPUT = 200;
