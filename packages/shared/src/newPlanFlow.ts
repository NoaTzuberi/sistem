import type { Language, PlanDuplicateSource, PlanWeekOption, PlanWeekPlanSummary } from '@sistem/types';
import { addDaysToDate } from './format';
import { formatPlural } from './i18n/copy';
import { dateFormat } from './i18n/intl';
import { sharedCopy } from './copy';

// "תוכנית חדשה" in two steps (owner, 2026-11-10 — docs/design-preview/new-plan-flow.html): step 1 = which week
// (and what is already there), step 2 = how to start. Both coach apps use these rules; the server checks the same
// on create (planBuilder.service / planBlock.service) — this only decides what the flow offers.

/** How a new plan starts: empty, a copy of a published plan, or from the AI draft. */
export type PlanStartMethod = 'scratch' | 'duplicate' | 'ai';

/** "שבועית" (one week) or "חודשית" (a block of 2–8 weeks). */
export type PlanLength = 'weekly' | 'block';

export const MIN_BLOCK_WEEKS = 2;
export const MAX_BLOCK_WEEKS = 8;
export const DEFAULT_BLOCK_WEEKS = 4;
/** Step 1 lists this week and the next three (more when a multi-week range reaches further). */
export const NEW_PLAN_WEEK_ROWS = 4;

const WEEK_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * - 'free': nothing there, or an EMPTY draft (replaced silently, no question);
 * - 'draft': a standalone draft with content — continue it, or start over after the question;
 * - 'fixed': never replaced — a published plan, a week of a multi-week plan, a locked draft.
 */
export type WeekConflict = 'free' | 'draft' | 'fixed';

export function weekConflictOf(plan: PlanWeekPlanSummary | null | undefined): WeekConflict {
  if (!plan || plan.isEmpty) return 'free';
  if (plan.status === 'draft' && !plan.inBlock && !plan.locked) return 'draft';
  return 'fixed';
}

/** Only a standalone draft no workout was logged from gets "מחיקת הטיוטה". */
export function canDeleteDraft(plan: PlanWeekPlanSummary | null | undefined): plan is PlanWeekPlanSummary {
  return plan?.status === 'draft' && !plan.inBlock && !plan.locked;
}

/** What step 1 shows for the chosen week (+ length). */
export type NewPlanSituation =
  | { kind: 'none' }
  /** Every week free: "המשך" to step 2. */
  | { kind: 'create' }
  /** Weekly, a draft with content: continue it; `canReplace` = "להתחיל מחדש" + "מחיקת הטיוטה". */
  | { kind: 'draft'; plan: PlanWeekPlanSummary; canReplace: boolean }
  /** Weekly, a published plan: open it, nothing else. */
  | { kind: 'published'; plan: PlanWeekPlanSummary }
  /** Multi-week: some weeks have drafts with content ('YYYY-MM-DD', in order) — start over and replace them. */
  | { kind: 'blockDrafts'; weeks: string[] }
  /** Multi-week: this week (the first one that can't be replaced) blocks the start week. */
  | { kind: 'blockTaken'; weekStartDate: string; isPublished: boolean };

/** The Sundays a plan starting at `start` covers (1 for a weekly plan). */
export function rangeWeeks(start: string, length: PlanLength, blockWeeks: number): string[] {
  return Array.from({ length: length === 'block' ? blockWeeks : 1 }, (_, index) => addDaysToDate(start, index * WEEK_DAYS));
}

/**
 * What the chosen week / range holds. `weeks` = every week the server offered (more than the rows
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

/** Step 2 replaces draft(s): the plan is created with `replaceDraft` after the question. */
export function replacesDrafts(situation: NewPlanSituation): boolean {
  return (situation.kind === 'draft' && situation.canReplace) || situation.kind === 'blockDrafts';
}

/** The week to preselect: the asked one, else the first that is free (an empty draft counts), else the first. */
export function defaultWeekOf(weeks: PlanWeekOption[], asked: string | undefined): string | undefined {
  const wanted = asked ? weeks.find((week) => week.weekStartDate === asked) : undefined;
  return (wanted ?? weeks.find((week) => weekConflictOf(week.plan) === 'free') ?? weeks[0])?.weekStartDate;
}

/** Preselected source: her own latest published plan before the chosen week, else the newest of any trainee. */
export function defaultSourceFor(sources: PlanDuplicateSource[], traineeId: string, weekStartDate: string | undefined): PlanDuplicateSource | undefined {
  return sources.find((source) => source.traineeId === traineeId && (!weekStartDate || source.weekStartDate < weekStartDate)) ?? sources[0];
}

/** The rows of step 1: the first four, and on to the last week a multi-week range covers. */
export function visibleWeekRows(weeks: PlanWeekOption[], range: string[]): PlanWeekOption[] {
  const last = range[range.length - 1];
  const reach = last ? weeks.findIndex((week) => week.weekStartDate === last) + 1 : 0;
  return weeks.slice(0, Math.max(NEW_PLAN_WEEK_ROWS, reach));
}

/** "השבוע" / "שבוע הבא" / "בעוד שבועיים" for a week the flow offers. */
export function weekRowLabel(week: Pick<PlanWeekOption, 'weekStartDate' | 'relation'>, currentWeekStart: string, language: Language): string {
  if (week.relation !== 'later') return sharedCopy[language].weekRelation[week.relation];
  const weeksAhead = Math.round((Date.parse(`${week.weekStartDate}T00:00:00Z`) - Date.parse(`${currentWeekStart}T00:00:00Z`)) / (WEEK_DAYS * DAY_MS));
  return formatPlural(language, sharedCopy[language].newPlanFlow.inWeeks, weeksAhead);
}

/** "9 בנוב׳" — when a draft was last saved (a moment, in the viewer's zone). */
export function formatEditedDay(iso: string, language: Language): string {
  return dateFormat(language, { day: 'numeric', month: 'short' }).format(new Date(iso));
}
