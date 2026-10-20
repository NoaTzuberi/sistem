import type { CardioBlock, CardioBlockKind, CardioMetric, CardioSport, CardioStep, Language } from '@sistem/types';
import { sharedCopy } from './copy';
import { fill, formatPlural } from './i18n/copy';

// Cardio sessions: the one zone rule, the unrolled timeline, totals and labels — used by the
// dashboard builder and the trainee's detail / player / finish screens. (The server keeps its own
// copy of the timeline math in cardio/cardioSteps.ts.)

export type CardioZone = 1 | 2 | 3 | 4 | 5;

/** A block at or above this is "high intensity". */
export const CARDIO_HIGH_INTENSITY = 7;

/** THE zone rule: 1–3 Z1 · 4–5 Z2 · 6 Z3 · 7–8 Z4 · 9–10 Z5. */
export function intensityZone(intensity: number): CardioZone {
  if (intensity <= 3) return 1;
  if (intensity <= 5) return 2;
  if (intensity === 6) return 3;
  if (intensity <= 8) return 4;
  return 5;
}

/** One block in running order, repeat sets unrolled. */
export interface CardioFrame {
  block: CardioBlock;
  /** Its index in the timeline. */
  index: number;
  /** Seconds from the session's start to this block's start. */
  startSec: number;
  /** 1-based round and the set's round count, inside a repeat set. */
  round: number | null;
  rounds: number | null;
  /** The repeat set it belongs to. */
  repeatId: string | null;
}

export function cardioTimeline(steps: CardioStep[]): CardioFrame[] {
  const frames: CardioFrame[] = [];
  let startSec = 0;
  const push = (block: CardioBlock, round: number | null, rounds: number | null, repeatId: string | null) => {
    frames.push({ block, index: frames.length, startSec, round, rounds, repeatId });
    startSec += block.durationSec;
  };
  for (const step of steps) {
    if (step.type === 'repeat') {
      for (let round = 1; round <= step.times; round += 1) step.blocks.forEach((block) => push(block, round, step.times, step.id));
    } else {
      push(step, null, null, null);
    }
  }
  return frames;
}

export interface CardioTotals {
  totalSec: number;
  highIntensitySec: number;
  /** Rounds over all repeat sets (0 = none). */
  rounds: number;
}

export function cardioTotals(steps: CardioStep[]): CardioTotals {
  const frames = cardioTimeline(steps);
  return {
    totalSec: frames.reduce((sum, frame) => sum + frame.block.durationSec, 0),
    highIntensitySec: frames.filter((frame) => frame.block.intensity >= CARDIO_HIGH_INTENSITY).reduce((sum, frame) => sum + frame.block.durationSec, 0),
    rounds: steps.reduce((sum, step) => sum + (step.type === 'repeat' ? step.times : 0), 0),
  };
}

/** One repeat set's round length. */
export function repeatRoundSec(blocks: CardioBlock[]): number {
  return blocks.reduce((sum, block) => sum + block.durationSec, 0);
}

/** A stretch of the timeline she skipped (seconds from the start). */
export interface CardioSkip {
  from: number;
  to: number;
}

const overlap = (aFrom: number, aTo: number, bFrom: number, bTo: number) => Math.max(0, Math.min(aTo, bTo) - Math.max(aFrom, bFrom));

/**
 * What she did after reaching `positionSec` of the timeline, minus the stretches she skipped: the time, the
 * high-intensity seconds and the rounds she finished (a round counts once each of its blocks is fully done —
 * an early end or a skip keeps only whole rounds).
 */
export function cardioProgress(frames: CardioFrame[], positionSec: number, skips: CardioSkip[] = []) {
  let completedSec = 0;
  let highIntensitySec = 0;
  let roundsDone = 0;
  let roundIntact = true;
  for (const frame of frames) {
    const start = frame.startSec;
    const end = start + frame.block.durationSec;
    const reached = overlap(start, end, 0, positionSec);
    const skipped = skips.reduce((sum, skip) => sum + overlap(start, end, Math.max(skip.from, 0), Math.min(skip.to, positionSec)), 0);
    const done = Math.max(0, reached - skipped);
    completedSec += done;
    if (frame.block.intensity >= CARDIO_HIGH_INTENSITY) highIntensitySec += done;
    if (frame.round === null) continue;
    const previous = frames[frame.index - 1];
    if (!previous || previous.repeatId !== frame.repeatId || previous.round !== frame.round) roundIntact = true;
    roundIntact = roundIntact && done >= frame.block.durationSec - 0.5;
    const next = frames[frame.index + 1];
    const endsRound = !next || next.repeatId !== frame.repeatId || next.round !== frame.round;
    if (endsRound && roundIntact) roundsDone += 1;
  }
  return { completedSec: Math.round(completedSec), highIntensitySec: Math.round(highIntensitySec), roundsDone };
}

/** The frame playing at `positionSec` (the last one once the timeline is over). */
export function frameAt(frames: CardioFrame[], positionSec: number): CardioFrame | undefined {
  return frames.find((frame) => positionSec < frame.startSec + frame.block.durationSec) ?? frames[frames.length - 1];
}

/** "M:SS" (minutes may pass 59). */
export function formatClock(totalSec: number): string {
  const sec = Math.max(0, Math.round(totalSec));
  const minutes = Math.floor(sec / 60);
  const seconds = sec % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

/** Whole minutes, rounded ("26"). */
export function cardioMinutes(totalSec: number): number {
  return Math.round(totalSec / 60);
}

export function cardioMinutesLabel(totalSec: number, language: Language): string {
  return fill(sharedCopy[language].cardio.minutes, { count: cardioMinutes(totalSec) });
}

export function cardioSportLabel(sport: CardioSport, language: Language): string {
  return sharedCopy[language].cardio.sports[sport];
}

export function cardioMetricLabel(metric: CardioMetric, language: Language): string {
  return sharedCopy[language].cardio.metrics[metric];
}

export function cardioKindLabel(kind: CardioBlockKind, language: Language): string {
  return sharedCopy[language].cardio.kinds[kind];
}

export function cardioZoneLabel(zone: CardioZone, language: Language): string {
  return sharedCopy[language].cardio.zones[zone - 1] ?? '';
}

/** The design's default line for a block kind, or null (a steady block has none). */
export function cardioTip(kind: CardioBlockKind, language: Language): string | null {
  const tips: Partial<Record<CardioBlockKind, string>> = sharedCopy[language].cardio.tips;
  return tips[kind] ?? null;
}

export function cardioRoundsLabel(count: number, language: Language): string {
  return formatPlural(language, sharedCopy[language].cardio.rounds, count);
}

/**
 * The target as shown for the session's metric: heart-rate zone → "Z4" + the zone's name; otherwise
 * RPE "8/10" + "Effort". Pace and speed need a per-trainee baseline that does not exist yet, so they
 * show the effort too (listed as missing data).
 */
export function describeCardioTarget(intensity: number, metric: CardioMetric, language: Language): { value: string; label: string } {
  if (metric === 'hrZone') {
    const zone = intensityZone(intensity);
    return { value: `Z${zone}`, label: cardioZoneLabel(zone, language) };
  }
  return { value: `${intensity}/10`, label: sharedCopy[language].cardio.effort };
}
