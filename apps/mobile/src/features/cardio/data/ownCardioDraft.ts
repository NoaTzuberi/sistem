import type { CardioBlock, CardioBlockKind, CardioRepeatSet, CardioSport, CardioStep } from '@sistem/types';

// Her own cardio workout while she builds it (pure). The limits mirror the server's (cardio.constants):
// the server checks them again on save.

export const CARDIO_SPORTS: CardioSport[] = ['run', 'intervals', 'walk', 'bike'];
export const BLOCK_KINDS: CardioBlockKind[] = ['warmup', 'steady', 'work', 'recovery', 'cooldown'];
export const MIN_BLOCK_SEC = 15;
export const MAX_BLOCK_SEC = 90 * 60;
export const MIN_TIMES = 1;
export const MAX_TIMES = 30;
export const MIN_INTENSITY = 1;
export const MAX_INTENSITY = 10;
export const MAX_STEPS = 40;
export const MAX_REPEAT_BLOCKS = 10;
export const MAX_TITLE_LENGTH = 60;

let counter = 0;
function newId(): string {
  counter += 1;
  return `s${Date.now().toString(36)}${counter}`;
}

export function newBlock(kind: CardioBlockKind = 'steady', durationSec = 300, intensity = 5): CardioBlock {
  return { type: 'block', id: newId(), kind, durationSec, intensity };
}

/** A repeat set starts as 4 × (1 min work, 1:30 recovery) — she changes it right away. */
export function newRepeat(): CardioRepeatSet {
  return { type: 'repeat', id: newId(), times: 4, blocks: [newBlock('work', 60, 8), newBlock('recovery', 90, 3)] };
}

/** A new workout: one warm-up block to start from. */
export function initialSteps(): CardioStep[] {
  return [newBlock('warmup', 300, 3)];
}

/** Duration steps: 15 s up to 5 min, then whole minutes. */
export function stepDuration(sec: number, direction: 1 | -1): number {
  const step = sec > 300 || (sec === 300 && direction === 1) ? 60 : 15;
  return Math.min(MAX_BLOCK_SEC, Math.max(MIN_BLOCK_SEC, sec + direction * step));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** A block anywhere (top level or inside a repeat) changed. */
export function updateBlock(steps: CardioStep[], blockId: string, patch: Partial<Omit<CardioBlock, 'type' | 'id'>>): CardioStep[] {
  return steps.map((step) =>
    step.type === 'block'
      ? step.id === blockId
        ? { ...step, ...patch }
        : step
      : { ...step, blocks: step.blocks.map((block) => (block.id === blockId ? { ...block, ...patch } : block)) },
  );
}

/** Removes a step or a block inside a repeat (a repeat left empty goes too). */
export function removeStep(steps: CardioStep[], id: string): CardioStep[] {
  return steps
    .filter((step) => step.id !== id)
    .map((step) => (step.type === 'repeat' ? { ...step, blocks: step.blocks.filter((block) => block.id !== id) } : step))
    .filter((step) => step.type === 'block' || step.blocks.length > 0);
}

export function setTimes(steps: CardioStep[], repeatId: string, times: number): CardioStep[] {
  return steps.map((step) => (step.type === 'repeat' && step.id === repeatId ? { ...step, times: clamp(times, MIN_TIMES, MAX_TIMES) } : step));
}

export function addBlockToRepeat(steps: CardioStep[], repeatId: string): CardioStep[] {
  return steps.map((step) =>
    step.type === 'repeat' && step.id === repeatId && step.blocks.length < MAX_REPEAT_BLOCKS ? { ...step, blocks: [...step.blocks, newBlock('work', 60, 7)] } : step,
  );
}

/** "m:ss" for the duration stepper (always Latin digits, isolated by the caller). */
export function formatDuration(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}
