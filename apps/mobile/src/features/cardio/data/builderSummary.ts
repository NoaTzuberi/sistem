import type { CardioBlockKind, CardioStep } from '@sistem/types';
import { cardioTimeline, intensityZone } from '@sistem/shared';
import type { CardioZone } from '@sistem/shared';

// The builder's summary card (pure): totals, the hardest effort and zone, one chart bar per block in
// running order (repeat sets unrolled), and one axis label per top-level step (proportional widths).

export interface SummaryBar {
  key: string;
  blockId: string;
  kind: CardioBlockKind;
  durationSec: number;
  intensity: number;
  zone: CardioZone;
}

export interface SummaryLabel {
  stepId: string;
  durationSec: number;
  /** A block's kind, or a repeat set's rounds. */
  kind: CardioBlockKind | null;
  times: number | null;
}

export interface BuilderSummary {
  totalSec: number;
  blockCount: number;
  maxIntensity: number;
  maxZone: CardioZone;
  bars: SummaryBar[];
  labels: SummaryLabel[];
}

export function builderSummary(steps: CardioStep[]): BuilderSummary {
  const frames = cardioTimeline(steps);
  const maxIntensity = frames.reduce((max, frame) => Math.max(max, frame.block.intensity), 0);
  return {
    totalSec: frames.reduce((sum, frame) => sum + frame.block.durationSec, 0),
    blockCount: frames.length,
    maxIntensity,
    maxZone: intensityZone(Math.max(1, maxIntensity)),
    bars: frames.map((frame) => ({
      key: `${frame.index}`,
      blockId: frame.block.id,
      kind: frame.block.kind,
      durationSec: frame.block.durationSec,
      intensity: frame.block.intensity,
      zone: intensityZone(frame.block.intensity),
    })),
    labels: steps.map((step) =>
      step.type === 'block'
        ? { stepId: step.id, durationSec: step.durationSec, kind: step.kind, times: null }
        : { stepId: step.id, durationSec: step.times * step.blocks.reduce((sum, block) => sum + block.durationSec, 0), kind: null, times: step.times },
    ),
  };
}
