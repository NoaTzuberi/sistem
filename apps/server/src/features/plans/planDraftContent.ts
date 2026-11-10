// "Empty draft" (owner, 2026-11-10): a draft with no workouts, or only strength workouts without
// exercises. It is no conflict — a new plan for its week replaces it silently. A cardio workout is
// content. A week of a multi-week plan is never "empty" (its later weeks start empty on purpose).

interface DraftLike {
  status: string;
  blockId?: unknown;
  workouts: { kind?: string | null; exercises?: unknown[] | null }[];
}

/** No workout holds anything (a cardio workout always counts as content). */
export function hasNoContent(workouts: DraftLike['workouts']): boolean {
  return workouts.every((workout) => workout.kind !== 'cardio' && (workout.exercises?.length ?? 0) === 0);
}

/** A standalone draft without content: replaced silently by a new plan, removed by cleanup:empty-drafts. */
export function isEmptyDraft(plan: DraftLike): boolean {
  return plan.status === 'draft' && !plan.blockId && hasNoContent(plan.workouts);
}
