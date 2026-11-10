import { addDaysToDate } from '@sistem/shared';
import type { PlanWeekOption, PlanWeekPlanSummary } from '@sistem/types';
import type { PlanLength } from './newPlanStart';

// What already sits in the week(s) a new plan would take (owner, 2026-11-10). The server checks the
// same on create (planBuilder.service / planBlock.service) — this only decides what the popover offers.

/**
 * - 'free': nothing there, or an EMPTY draft (replaced silently, no question);
 * - 'draft': a standalone draft with content — open it, or replace it after the question;
 * - 'fixed': never replaced — a published plan, a week of a multi-week plan, a locked draft.
 */
export type WeekConflict = 'free' | 'draft' | 'fixed';

export function weekConflictOf(plan: PlanWeekPlanSummary | null | undefined): WeekConflict {
  if (!plan || plan.isEmpty) return 'free';
  if (plan.status === 'draft' && !plan.inBlock && !plan.locked) return 'draft';
  return 'fixed';
}

/** Only a standalone draft that no workout was logged from gets "מחיקת הטיוטה" on its week card. */
export function canDeleteDraft(plan: PlanWeekPlanSummary | null | undefined): plan is PlanWeekPlanSummary {
  return plan?.status === 'draft' && !plan.inBlock && !plan.locked;
}

/** The footer of the popover, for the chosen week (+ length). */
export type NewPlanSituation =
  | { kind: 'none' }
  /** Weekly or multi-week, every week free: one "create". */
  | { kind: 'create' }
  /** Weekly, the week has a draft: open it (primary); `canReplace` = the soft "… במקום הטיוטה". */
  | { kind: 'draft'; plan: PlanWeekPlanSummary; canReplace: boolean }
  /** Weekly, the week has a published plan: open it, nothing else. */
  | { kind: 'published'; plan: PlanWeekPlanSummary }
  /** Multi-week: some weeks have drafts with content ('YYYY-MM-DD', in order). */
  | { kind: 'blockDrafts'; weeks: string[] }
  /** Multi-week: this week (the first one that can't be replaced) blocks the start week. */
  | { kind: 'blockTaken'; weekStartDate: string; isPublished: boolean };

const WEEK_DAYS = 7;

/** The Sundays a plan starting at `start` covers (1 for a weekly plan). */
export function rangeWeeks(start: string, length: PlanLength, blockWeeks: number): string[] {
  return Array.from({ length: length === 'block' ? blockWeeks : 1 }, (_, index) => addDaysToDate(start, index * WEEK_DAYS));
}

/**
 * What the chosen week / range holds. `weeks` = every week the server offered (more than the cards
 * show); a range past them is checked by the server alone.
 */
export function newPlanSituation(
  weeks: Pick<PlanWeekOption, 'weekStartDate' | 'plan'>[],
  start: string | undefined,
  length: PlanLength,
  blockWeeks: number,
): NewPlanSituation {
  const first = weeks.find((week) => week.weekStartDate === start);
  if (!start || !first) return { kind: 'none' };

  if (length === 'weekly') {
    const conflict = weekConflictOf(first.plan);
    if (conflict === 'free' || !first.plan) return { kind: 'create' };
    if (first.plan.status === 'published') return { kind: 'published', plan: first.plan };
    return { kind: 'draft', plan: first.plan, canReplace: conflict === 'draft' };
  }

  const byDate = new Map(weeks.map((week) => [week.weekStartDate, week.plan]));
  const drafts: string[] = [];
  for (const date of rangeWeeks(start, length, blockWeeks)) {
    const plan = byDate.get(date);
    const conflict = weekConflictOf(plan);
    if (conflict === 'fixed') return { kind: 'blockTaken', weekStartDate: date, isPublished: plan?.status === 'published' };
    if (conflict === 'draft') drafts.push(date);
  }
  return drafts.length > 0 ? { kind: 'blockDrafts', weeks: drafts } : { kind: 'create' };
}

/** The week to preselect: the asked one, else the first that is free (an empty draft counts), else the first. */
export function defaultWeekOf(weeks: PlanWeekOption[], asked: string | undefined): string | undefined {
  const wanted = asked ? weeks.find((week) => week.weekStartDate === asked) : undefined;
  return (wanted ?? weeks.find((week) => weekConflictOf(week.plan) === 'free') ?? weeks[0])?.weekStartDate;
}
