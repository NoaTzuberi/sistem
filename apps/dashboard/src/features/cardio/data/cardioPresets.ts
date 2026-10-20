import type { CardioBlock, CardioBlockKind, CardioMetric, CardioRepeatSet, CardioSport, CardioStep } from '@sistem/types';

// THE builder presets (task spec / docs/design/coach-cardio-builder.html). Durations in seconds.

export const CARDIO_SPORTS: CardioSport[] = ['run', 'intervals', 'walk', 'bike'];
export const CARDIO_METRICS: CardioMetric[] = ['rpe', 'pace', 'speed', 'hrZone'];
export const CARDIO_KINDS: CardioBlockKind[] = ['warmup', 'steady', 'work', 'recovery', 'cooldown'];

/** A block's intensity when its kind is picked. */
export const KIND_INTENSITY: Record<CardioBlockKind, number> = { warmup: 3, steady: 6, work: 8, recovery: 4, cooldown: 3 };

export const MIN_BLOCK_SEC = 15;
export const MAX_BLOCK_SEC = 90 * 60;
export const MIN_TIMES = 1;
export const MAX_TIMES = 30;
/** Durations step by 15 s under 2:00, by a minute from there. */
export const FINE_STEP_UNDER_SEC = 120;

let counter = 0;
export function newStepId(): string {
  counter += 1;
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `s${Date.now().toString(36)}${counter}`;
}

export function block(kind: CardioBlockKind, durationSec: number, intensity = KIND_INTENSITY[kind]): CardioBlock {
  return { type: 'block', id: newStepId(), kind, durationSec, intensity };
}

export function repeatSet(times: number, blocks: CardioBlock[]): CardioRepeatSet {
  return { type: 'repeat', id: newStepId(), times, blocks };
}

export function presetSteps(sport: CardioSport): CardioStep[] {
  switch (sport) {
    case 'run':
      return [block('warmup', 300, 3), block('steady', 1500, 6), block('cooldown', 300, 3)];
    case 'walk':
      return [block('warmup', 300, 2), block('steady', 1800, 4), block('cooldown', 300, 2)];
    case 'bike':
      return [block('warmup', 300, 3), repeatSet(5, [block('work', 120, 7), block('recovery', 120, 4)]), block('cooldown', 300, 3)];
    case 'intervals':
      return [block('warmup', 300, 3), repeatSet(8, [block('work', 60, 8), block('recovery', 60, 4)]), block('cooldown', 300, 3)];
  }
}

export type AddKind = 'warmup' | 'steady' | 'repeat' | 'cooldown';

/** What each dashed "add" button adds. */
export function newStep(kind: AddKind): CardioStep {
  if (kind === 'repeat') return repeatSet(6, [block('work', 60, 8), block('recovery', 90, 4)]);
  return kind === 'steady' ? block('steady', 600, 6) : block(kind, 300, 3);
}
