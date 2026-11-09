import type { PlanDuplicateSource, PlanWeekOption } from '@sistem/types';

/** How a new plan starts: empty, a copy of a published plan, or from the AI draft. */
export type PlanStartMethod = 'scratch' | 'duplicate' | 'ai';

/**
 * What the popover's main button does for this week + method:
 * - 'open': the week has a plan → open it (a published week always; a draft unless duplicating);
 * - 'duplicate': copy a published plan (into a draft week the server asks replace / open first);
 * - 'create': a new plan (empty / AI).
 */
export function startActionFor(week: Pick<PlanWeekOption, 'plan'> | undefined, method: PlanStartMethod): 'open' | 'duplicate' | 'create' | 'none' {
  if (!week) return 'none';
  if (week.plan && !(week.plan.status === 'draft' && method === 'duplicate')) return 'open';
  return method === 'duplicate' ? 'duplicate' : 'create';
}

/** Preselected source: her own latest published plan before the chosen week, else the newest of any trainee. */
export function defaultSourceFor(sources: PlanDuplicateSource[], traineeId: string, weekStartDate: string | undefined): PlanDuplicateSource | undefined {
  return sources.find((source) => source.traineeId === traineeId && (!weekStartDate || source.weekStartDate < weekStartDate)) ?? sources[0];
}
