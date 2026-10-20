import type { CardioFrame, CardioSkip } from '@sistem/shared';

// THE live run as timestamps (device clock): nothing counts down in memory, so the clock is right after
// the phone was locked or the app was in the background. Pure; stored per session day on the phone.

export interface CardioRunState {
  sessionId: string;
  date: string;
  /** When the timeline starts (after the 3-2-1), ms since epoch. */
  startsAt: number;
  /** Set while paused. */
  pausedAt: number | null;
  /** Paused time so far, ms. */
  pausedMs: number;
  /** Seconds added by skipping forward / back (keeps the position = wall time + shift). */
  shiftSec: number;
  /** The stretches skipped forward: not counted as done. */
  skips: CardioSkip[];
  /** Set when she ends early: the position she stopped at. */
  endedAtSec: number | null;
}

export const COUNTDOWN_SEC = 3;
/** "Previous" restarts the block when she is more than this far into it. */
export const RESTART_WITHIN_SEC = 3;

export function newRun(sessionId: string, date: string, now: number, withCountdown: boolean): CardioRunState {
  return { sessionId, date, startsAt: now + (withCountdown ? COUNTDOWN_SEC * 1000 : 0), pausedAt: null, pausedMs: 0, shiftSec: 0, skips: [], endedAtSec: null };
}

/** Seconds into the timeline (0 during the countdown), clamped to the session. */
export function positionOf(run: CardioRunState, now: number, totalSec: number): number {
  if (run.endedAtSec !== null) return run.endedAtSec;
  const at = run.pausedAt ?? now;
  const seconds = (at - run.startsAt - run.pausedMs) / 1000 + run.shiftSec;
  return Math.max(0, Math.min(totalSec, seconds));
}

/** Whole seconds left of the 3-2-1, or 0 once it is over. */
export function countdownOf(run: CardioRunState, now: number): number {
  return Math.max(0, Math.ceil((run.startsAt - now) / 1000));
}

export function pause(run: CardioRunState, now: number): CardioRunState {
  return run.pausedAt === null ? { ...run, pausedAt: now } : run;
}

export function resume(run: CardioRunState, now: number): CardioRunState {
  return run.pausedAt === null ? run : { ...run, pausedAt: null, pausedMs: run.pausedMs + (now - run.pausedAt) };
}

function seek(run: CardioRunState, now: number, totalSec: number, target: number): CardioRunState {
  const current = positionOf(run, now, totalSec);
  const skips = target > current ? [...run.skips, { from: current, to: target }] : run.skips;
  return { ...run, shiftSec: run.shiftSec + (target - current), skips };
}

export function skipNext(run: CardioRunState, now: number, totalSec: number, frame: CardioFrame): CardioRunState {
  return seek(run, now, totalSec, Math.min(totalSec, frame.startSec + frame.block.durationSec));
}

/** More than 3 s into the block: back to its start; otherwise to the previous block's start. */
export function skipPrevious(run: CardioRunState, now: number, totalSec: number, frames: CardioFrame[], frame: CardioFrame): CardioRunState {
  const into = positionOf(run, now, totalSec) - frame.startSec;
  const target = into > RESTART_WITHIN_SEC || frame.index === 0 ? frame.startSec : (frames[frame.index - 1]?.startSec ?? 0);
  return seek(run, now, totalSec, target);
}

export function endEarly(run: CardioRunState, now: number, totalSec: number): CardioRunState {
  return { ...run, endedAtSec: positionOf(run, now, totalSec) };
}

/* Stored on the phone, so a reload or a crash keeps the run. */

const STORAGE_KEY = 'sistem.cardioRun';

export function loadRun(sessionId: string, date: string): CardioRunState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const run = raw ? (JSON.parse(raw) as CardioRunState) : null;
    return run && run.sessionId === sessionId && run.date === date ? run : null;
  } catch {
    return null;
  }
}

export function storeRun(run: CardioRunState | null): void {
  try {
    if (run) localStorage.setItem(STORAGE_KEY, JSON.stringify(run));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private mode / full storage: the run still works, it just won't survive a reload.
  }
}
