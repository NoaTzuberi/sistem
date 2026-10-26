/**
 * A control of the login design that has nothing behind it yet. They are built and stay
 * hidden until the feature exists — a control that does nothing is worse than none.
 */

/**
 * "Keep me signed in". TODO: the dashboard always keeps the session (the token lives in
 * localStorage, services/auth/tokenStorage.ts) — there is no remember-me choice in the auth yet.
 * Turn this on together with a session-only token option.
 */
export const REMEMBER_ME_ENABLED = false;
