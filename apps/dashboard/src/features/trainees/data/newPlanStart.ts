import type { PlanDuplicateSource, PlanWeekOption } from '@sistem/types';

/** How a new plan starts: empty, a copy of a published plan, or from the AI draft. */
export type PlanStartMethod = 'scratch' | 'duplicate' | 'ai';

/** "שבועית" (one week, as before) or "חודשית" (a block of 2–8 weeks). */
export type PlanLength = 'weekly' | 'block';

export const MIN_BLOCK_WEEKS = 2;
export const MAX_BLOCK_WEEKS = 8;
export const DEFAULT_BLOCK_WEEKS = 4;

/**
 * What the popover's main button does for this week + method:
 * - 'open': the week has a plan → open it (a published week always; a draft unless duplicating
 *   into a weekly plan; a multi-week plan never starts on a taken week);
 * - 'duplicate': copy a published plan (into a draft week the server asks replace / open first);
 * - 'create': a new plan (empty / AI).
 */
export function startActionFor(
  week: Pick<PlanWeekOption, 'plan'> | undefined,
  method: PlanStartMethod,
  length: PlanLength = 'weekly',
): 'open' | 'duplicate' | 'create' | 'none' {
  if (!week) return 'none';
  if (week.plan && (length === 'block' || !(week.plan.status === 'draft' && method === 'duplicate'))) return 'open';
  return method === 'duplicate' ? 'duplicate' : 'create';
}

/** Preselected source: her own latest published plan before the chosen week, else the newest of any trainee. */
export function defaultSourceFor(sources: PlanDuplicateSource[], traineeId: string, weekStartDate: string | undefined): PlanDuplicateSource | undefined {
  return sources.find((source) => source.traineeId === traineeId && (!weekStartDate || source.weekStartDate < weekStartDate)) ?? sources[0];
}

/**
 * The first week (1-based) of a block starting at `start` that the offered weeks show as taken, or
 * null. Weeks past the offered ones are checked by the server (plan_block_week_taken).
 */
export function firstTakenBlockWeek(weeks: Pick<PlanWeekOption, 'weekStartDate' | 'plan'>[], start: string, length: number): number | null {
  const startIndex = weeks.findIndex((week) => week.weekStartDate === start);
  if (startIndex === -1) return null;
  for (let n = 1; n <= length; n += 1) {
    const week = weeks[startIndex + n - 1];
    if (!week) return null;
    if (week.plan) return n;
  }
  return null;
}
