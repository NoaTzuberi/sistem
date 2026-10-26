import { useMemo } from 'react';
import type { PlanCardio } from '@sistem/types';
import { cardioTimeline, intensityZone, type CardioZone } from '@sistem/shared';

export interface CardioProfileSegment {
  key: number;
  zone: CardioZone;
  /** The block's seconds: its share of the strip's width (flex-grow). */
  durationSec: number;
}

export interface CardioProfile {
  totalSec: number;
  /** Blocks with the repeat sets expanded (the strip's segment count). */
  blockCount: number;
  maxIntensity: number;
  segments: CardioProfileSegment[];
}

/** A cardio workout's shape at a glance (the ticket's meta + intensity strip), from the plan's steps only. */
export function useCardioProfile(cardio: PlanCardio | undefined): CardioProfile | null {
  return useMemo(() => {
    if (!cardio) return null;
    const frames = cardioTimeline(cardio.steps);
    return {
      totalSec: frames.reduce((sum, frame) => sum + frame.block.durationSec, 0),
      blockCount: frames.length,
      maxIntensity: frames.reduce((max, frame) => Math.max(max, frame.block.intensity), 0),
      segments: frames.map((frame) => ({ key: frame.index, zone: intensityZone(frame.block.intensity), durationSec: frame.block.durationSec })),
    };
  }, [cardio]);
}
