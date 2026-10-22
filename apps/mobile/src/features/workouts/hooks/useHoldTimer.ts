import { useEffect, useRef, useState } from 'react';
import { beep, isCountdownBeep, isSoundMuted, unlockAudio } from '../data/intervalSounds';
import { useCountdown } from './useCountdown';

interface Hold {
  key: string;
  startedAt: number;
  endsAt: number;
  targetSec: number;
}

/**
 * A timed set's ▶ countdown (plank 45 s): from its end time, with the same beeps as rests and
 * intervals. Running out logs the full time (`onDone(key, targetSec)`); Stop logs the seconds held.
 */
export function useHoldTimer(onDone: (key: string, durationSec: number) => void) {
  const [hold, setHold] = useState<Hold | null>(null);
  const remainingMs = useCountdown(hold?.endsAt ?? null);
  // The seconds of the running hold that already beeped (the countdown ticks 4× a second).
  const beepedRef = useRef(new Set<number>());
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  function start(key: string, targetSec: number) {
    // Inside the ▶ tap: lets the browser play the countdown beeps.
    unlockAudio();
    beepedRef.current = new Set();
    const now = Date.now();
    setHold({ key, startedAt: now, endsAt: now + targetSec * 1000, targetSec });
  }

  function stop() {
    if (!hold) return;
    const heldSec = Math.max(1, Math.round((Date.now() - hold.startedAt) / 1000));
    setHold(null);
    onDoneRef.current(hold.key, Math.min(heldSec, hold.targetSec));
  }

  function cancel() {
    setHold(null);
  }

  // 10 s left (holds longer than 10 s), then 3-2-1.
  useEffect(() => {
    if (!hold || remainingMs === null || remainingMs === 0) return;
    const left = Math.ceil(remainingMs / 1000);
    if (isCountdownBeep(left, hold.targetSec) && !beepedRef.current.has(left)) {
      beepedRef.current.add(left);
      beep('short', isSoundMuted());
    }
  }, [hold, remainingMs]);

  // Ran out: the long beep, and the full time is logged.
  useEffect(() => {
    if (!hold || remainingMs !== 0) return;
    beep('long', isSoundMuted());
    setHold(null);
    onDoneRef.current(hold.key, hold.targetSec);
  }, [hold, remainingMs]);

  return {
    /** The running hold's set and time left, for its row. */
    running: hold && remainingMs !== null ? { key: hold.key, remainingMs } : null,
    start,
    stop,
    cancel,
  };
}
