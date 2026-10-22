import { useEffect, useRef } from 'react';
import { beep, isCountdownBeep, isSoundMuted } from '../data/intervalSounds';
import { REST_LATE_BEEP_MS } from '../data/sessionConfig';
import type { RestState } from './useWorkoutSession';
import { useCountdown } from './useCountdown';

interface UseRestTimerOptions {
  /** The running rest (its end time on the device clock), or null. */
  rest: RestState | null;
  /**
   * Called once when the rest reaches 0. `late` = it ended a while ago (the app was in the
   * background or the phone was locked): no beep then, the screen just moves on.
   */
  onEnd: (late: boolean) => void;
}

/**
 * The rest countdown: milliseconds left (from the stored end time, so a locked phone is right
 * again the moment it wakes), the same beeps as holds and intervals — 10 s left (rests longer
 * than 10 s), then 3-2-1 and the long one at 0 — and one `onEnd` call. A new rest or ±15 s
 * starts the beep pattern again.
 */
export function useRestTimer({ rest, onEnd }: UseRestTimerOptions): number | null {
  const remainingMs = useCountdown(rest?.endsAt ?? null);
  const beepedRef = useRef(new Set<number>());
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  useEffect(() => {
    beepedRef.current = new Set();
  }, [rest?.endsAt]);

  useEffect(() => {
    if (!rest || remainingMs === null || remainingMs === 0) return;
    const left = Math.ceil(remainingMs / 1000);
    if (isCountdownBeep(left, rest.totalSec) && !beepedRef.current.has(left)) {
      beepedRef.current.add(left);
      beep('short', isSoundMuted());
    }
  }, [rest, remainingMs]);

  useEffect(() => {
    if (!rest || remainingMs !== 0) return;
    const late = Date.now() - rest.endsAt >= REST_LATE_BEEP_MS;
    if (!late) beep('long', isSoundMuted());
    onEndRef.current(late);
  }, [rest, remainingMs]);

  return rest ? remainingMs : null;
}
