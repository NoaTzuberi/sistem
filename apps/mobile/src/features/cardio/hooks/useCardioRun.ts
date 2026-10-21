import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CardioStep, Language } from '@sistem/types';
import { cardioKindLabel, cardioProgress, cardioTimeline, cardioTotals, fill, frameAt, getActiveLanguage } from '@sistem/shared';
import { useWakeLock } from '../../../hooks/useWakeLock';
import { cardioCopy } from '../copy';
import { buzz, type CardioPrefs, speak, stopSpeaking } from '../data/cardioCues';
import {
  type CardioRunState,
  countdownOf,
  endEarly,
  loadRun,
  newRun,
  pause,
  positionOf,
  resume,
  skipNext,
  skipPrevious,
  storeRun,
} from '../data/cardioRun';

const TICK_MS = 200;
/** "10 seconds left" is said only in blocks longer than this. */
const TEN_SECONDS_FROM = 20;

export type CardioRunPhase = 'countdown' | 'live' | 'finished';

interface RunOptions {
  planId: string;
  workoutId: string;
  steps: CardioStep[];
  prefs: CardioPrefs;
  reducedMotion: boolean;
}

/**
 * The live cardio run: position from timestamps (right after a lock / the background), the block playing,
 * pause / skip / end early, the wake lock, and the cues on block change (voice, buzz — only when switched
 * on). Ticks only while the page is visible; the run is stored on the phone after every change.
 */
export function useCardioRun({ planId, workoutId, steps, prefs, reducedMotion }: RunOptions) {
  const frames = useMemo(() => cardioTimeline(steps), [steps]);
  const totals = useMemo(() => cardioTotals(steps), [steps]);
  const [run, setRun] = useState<CardioRunState>(() => loadRun(planId, workoutId) ?? newRun(planId, workoutId, Date.now(), !reducedMotion));
  const [now, setNow] = useState(() => Date.now());

  const update = useCallback((change: (current: CardioRunState, at: number) => CardioRunState) => {
    const at = Date.now();
    setRun((current) => change(current, at));
    setNow(at);
  }, []);

  // Every change is kept on the phone.
  useEffect(() => {
    storeRun(run);
  }, [run]);

  const countdown = countdownOf(run, now);
  const position = positionOf(run, now, totals.totalSec);
  const isOver = run.endedAtSec !== null || (countdown === 0 && position >= totals.totalSec);
  const phase: CardioRunPhase = isOver ? 'finished' : countdown > 0 ? 'countdown' : 'live';
  const isPaused = run.pausedAt !== null;
  const frame = frameAt(frames, position);
  const frameLeft = frame ? Math.max(0, frame.startSec + frame.block.durationSec - position) : 0;

  // Tick while visible and not paused; a return to the page re-reads the clock at once.
  useEffect(() => {
    if (phase === 'finished' || isPaused) return;
    let timer: number | undefined;
    const start = () => {
      window.clearInterval(timer);
      setNow(Date.now());
      if (document.visibilityState === 'visible') timer = window.setInterval(() => setNow(Date.now()), TICK_MS);
    };
    start();
    document.addEventListener('visibilitychange', start);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', start);
    };
  }, [phase, isPaused]);

  useWakeLock(phase !== 'finished');

  // Cues: a new block (voice: its name, "!" on work; buzz), and "10 seconds left" once per block.
  const cueState = useRef<{ index: number | null; tenSaid: number | null }>({ index: null, tenSaid: null });
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  useEffect(() => {
    if (phase !== 'live' || !frame) return;
    const language: Language = getActiveLanguage();
    const text = cardioCopy[language];
    const cues = cueState.current;
    if (cues.index !== frame.index) {
      const first = cues.index === null;
      cues.index = frame.index;
      if (prefsRef.current.voice) {
        const name = cardioKindLabel(frame.block.kind, language);
        speak(frame.block.kind === 'work' ? fill(text.workCue, { name }) : name, language);
      }
      if (prefsRef.current.vibrate && !first) buzz();
    }
    if (prefsRef.current.voice && frame.block.durationSec > TEN_SECONDS_FROM && Math.ceil(frameLeft) === 10 && cues.tenSaid !== frame.index) {
      cues.tenSaid = frame.index;
      speak(text.tenSeconds, language);
    }
  }, [phase, frame, frameLeft]);

  useEffect(() => () => stopSpeaking(), []);

  const progress = useMemo(() => cardioProgress(frames, position, run.skips), [frames, position, run.skips]);

  return {
    frames,
    totals,
    phase,
    countdown,
    position,
    frame,
    frameLeft,
    isPaused,
    progress,
    togglePause: () => update((current, at) => (current.pausedAt === null ? pause(current, at) : resume(current, at))),
    next: () => frame && update((current, at) => skipNext(current, at, totals.totalSec, frame)),
    previous: () => frame && update((current, at) => skipPrevious(current, at, totals.totalSec, frames, frame)),
    end: () => update((current, at) => endEarly(current, at, totals.totalSec)),
    /** After the log is saved (or she leaves the finish screen): forget the run on this phone. */
    clear: () => storeRun(null),
  };
}
