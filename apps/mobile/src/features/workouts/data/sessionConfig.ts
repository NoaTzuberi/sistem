// Tuning of the active workout session (Phase 8). Units: kg, seconds, milliseconds.

/** Weight step of the −/+ buttons: 0.5 kg for every exercise (player redesign, 2026-10 — it
    replaced the earlier per-equipment steps of 1 / 2.5 kg). */
export const WEIGHT_STEP_KG = 0.5;

export const REPS_STEP = 1;
export const DURATION_STEP_SEC = 5;
export const REST_ADJUST_SEC = 15;

/** "+ Extra set" stops here — the server's MAX_SETS_PER_EXERCISE (planned + added). */
export const MAX_SETS_PER_EXERCISE = 20;

export const MAX_REPS = 1000;
export const MAX_WEIGHT_KG = 1000;
export const MAX_DURATION_SEC = 6 * 60 * 60;

/** Set changes are batched for this long before they are sent. */
export const SYNC_DEBOUNCE_MS = 800;
/** Unsent changes are retried this often while offline (also on reconnect / foreground). */
export const SYNC_RETRY_MS = 5000;

/** A rest that ended longer ago than this (app in the background) ends without its beep. */
export const REST_LATE_BEEP_MS = 2000;

/** Rest over: a buzz (Android; iOS Safari has no Vibration API). */
export const VIBRATE_REST_OVER_MS = [30, 60, 30];

/** All sets done: the finish sheet opens after the last check's pop. */
export const ALL_DONE_OFFER_DELAY_MS = 500;

// The free interval timer: defaults (a classic Tabata is 20 s / 10 s × 8) and limits.
export const FREE_TIMER_DEFAULTS = { workSec: 20, restSec: 10, rounds: 8 };
export const FREE_TIMER_STEP_SEC = 5;
export const FREE_TIMER_MIN_WORK_SEC = 5;
export const FREE_TIMER_MAX_SEC = 10 * 60;
export const FREE_TIMER_MAX_ROUNDS = 50;
