import { HIGH_INTENSITY_FROM } from './cardio.constants';
import type { CardioBlockFields, CardioStepFields } from './cardio.types';

// Server-side session math (the clients have the same rules in @sistem/shared cardio.ts —
// the server never imports it). Pure.

/** Every block in the order she runs it, repeat sets unrolled. */
export function flattenCardioSteps(steps: CardioStepFields[]): CardioBlockFields[] {
  return steps.flatMap((step) => (step.type === 'repeat' ? Array.from({ length: step.times }, () => step.blocks).flat() : [step]));
}

export function cardioTotals(steps: CardioStepFields[]) {
  const blocks = flattenCardioSteps(steps);
  return {
    totalSec: blocks.reduce((sum, block) => sum + block.durationSec, 0),
    highIntensitySec: blocks.filter((block) => block.intensity >= HIGH_INTENSITY_FROM).reduce((sum, block) => sum + block.durationSec, 0),
    rounds: steps.reduce((sum, step) => sum + (step.type === 'repeat' ? step.times : 0), 0),
  };
}
