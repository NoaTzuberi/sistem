import type { PlanDuplicateSource } from '@sistem/types';

/** How a new plan starts: empty, a copy of a published plan, or from the AI draft. */
export type PlanStartMethod = 'scratch' | 'duplicate' | 'ai';

/** "שבועית" (one week, as before) or "חודשית" (a block of 2–8 weeks). */
export type PlanLength = 'weekly' | 'block';

export const MIN_BLOCK_WEEKS = 2;
export const MAX_BLOCK_WEEKS = 8;
export const DEFAULT_BLOCK_WEEKS = 4;

/** Preselected source: her own latest published plan before the chosen week, else the newest of any trainee. */
export function defaultSourceFor(sources: PlanDuplicateSource[], traineeId: string, weekStartDate: string | undefined): PlanDuplicateSource | undefined {
  return sources.find((source) => source.traineeId === traineeId && (!weekStartDate || source.weekStartDate < weekStartDate)) ?? sources[0];
}
