import type { CardioBlock, CardioStep } from '@sistem/types';
import { FINE_STEP_UNDER_SEC, MAX_BLOCK_SEC, MAX_TIMES, MIN_BLOCK_SEC, MIN_TIMES, type AddKind, newStep } from './cardioPresets';

// Pure edits of a session's steps (the builder hook calls them). Nothing here validates for the
// server — the server checks every save.

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** Applies `change` to the block with that id, wherever it is. */
export function updateBlock(steps: CardioStep[], id: string, change: (block: CardioBlock) => CardioBlock): CardioStep[] {
  return steps.map((step) =>
    step.type === 'repeat'
      ? { ...step, blocks: step.blocks.map((item) => (item.id === id ? change(item) : item)) }
      : step.id === id
        ? change(step)
        : step,
  );
}

export function stepDuration(durationSec: number, direction: 1 | -1): number {
  const step = durationSec < FINE_STEP_UNDER_SEC ? 15 : 60;
  return clamp(durationSec + step * direction, MIN_BLOCK_SEC, MAX_BLOCK_SEC);
}

export function stepIntensity(intensity: number, direction: 1 | -1): number {
  return clamp(intensity + direction, 1, 10);
}

export function changeTimes(steps: CardioStep[], id: string, direction: 1 | -1): CardioStep[] {
  return steps.map((step) => (step.type === 'repeat' && step.id === id ? { ...step, times: clamp(step.times + direction, MIN_TIMES, MAX_TIMES) } : step));
}

/** Removes a block or a whole repeat set; a set left without blocks goes too. */
export function removeStep(steps: CardioStep[], id: string): CardioStep[] {
  return steps
    .filter((step) => step.id !== id)
    .map((step) => (step.type === 'repeat' ? { ...step, blocks: step.blocks.filter((item) => item.id !== id) } : step))
    .filter((step) => step.type !== 'repeat' || step.blocks.length > 0);
}

/** A warm-up goes first, a cool-down last, anything else before a closing cool-down. */
export function addStep(steps: CardioStep[], kind: AddKind): { steps: CardioStep[]; added: CardioStep } {
  const added = newStep(kind);
  if (kind === 'warmup') return { steps: [added, ...steps], added };
  const last = steps[steps.length - 1];
  if (kind === 'cooldown' || !last || last.type !== 'block' || last.kind !== 'cooldown') return { steps: [...steps, added], added };
  return { steps: [...steps.slice(0, -1), added, last], added };
}
