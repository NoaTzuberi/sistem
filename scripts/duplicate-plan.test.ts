import { describe, expect, it } from 'vitest';
import { addDaysToDate } from '../packages/shared/src/format';
import { PlanRequestError } from '@sistem/api-client';
import type { PlanDuplicateSource } from '@sistem/types';
import type { PlanWeekOption } from '@sistem/types';
import { canDeleteDraft, defaultSourceFor, defaultWeekOf, newPlanSituation, replacesDrafts, visibleWeekRows, weekConflictOf, weekRowLabel } from '../packages/shared/src/newPlanFlow';
import { describePlanCreateError, isStaleListError } from '../apps/dashboard/src/features/trainees/data/planCreateErrors';
import { traineesCopy } from '../apps/dashboard/src/features/trainees/copy';

// Bug 2026-11-09: with only drafts, "duplicate" copied an empty draft and the builder sent the coach
// back to duplicate again — a loop with no message. The popover's rules (server tests cover the API).

const source = (id: string, traineeId: string, weekStartDate: string): PlanDuplicateSource => ({
  id,
  traineeId,
  traineeName: traineeId,
  weekStartDate,
  workoutCount: 3,
});

describe('new plan popover rules', () => {
  it('a draft week opens or starts over; an empty draft is free; a published week only opens', () => {
    const summary = (status: 'draft' | 'published', extra: Partial<{ isEmpty: boolean; inBlock: boolean; locked: boolean; workoutCount: number }> = {}) => ({
      id: `${status}-plan`,
      status,
      workoutCount: 3,
      isEmpty: false,
      inBlock: false,
      locked: false,
      updatedAt: '2026-11-09T10:00:00.000Z',
      ...extra,
    });
    const weeks = (plan: ReturnType<typeof summary> | null) => [{ weekStartDate: '2026-11-15', plan }];
    expect(newPlanSituation(weeks(null), '2026-11-15', 'weekly', 4)).toEqual({ kind: 'create' });
    expect(newPlanSituation(weeks(summary('draft', { isEmpty: true, workoutCount: 0 })), '2026-11-15', 'weekly', 4)).toEqual({ kind: 'create' });
    expect(newPlanSituation(weeks(summary('draft')), '2026-11-15', 'weekly', 4)).toMatchObject({ kind: 'draft', canReplace: true });
    expect(newPlanSituation(weeks(summary('draft', { inBlock: true })), '2026-11-15', 'weekly', 4)).toMatchObject({ kind: 'draft', canReplace: false });
    expect(newPlanSituation(weeks(summary('published')), '2026-11-15', 'weekly', 4)).toMatchObject({ kind: 'published' });
    expect(newPlanSituation(weeks(null), undefined, 'weekly', 4)).toEqual({ kind: 'none' });
    expect(weekConflictOf(summary('draft', { locked: true }))).toBe('fixed');
    expect(canDeleteDraft(summary('draft'))).toBe(true);
    expect(canDeleteDraft(summary('draft', { inBlock: true }))).toBe(false);
    expect(canDeleteDraft(summary('published'))).toBe(false);
    // The preselected week: an empty draft counts as free.
    expect(defaultWeekOf([{ weekStartDate: 'a', relation: 'this', plan: summary('draft'), copiesFromWeek: null }, { weekStartDate: 'b', relation: 'next', plan: summary('draft', { isEmpty: true }), copiesFromWeek: null }], undefined)).toBe('b');
  });

  it('no published plans = no source (the empty state); otherwise her own latest earlier plan first', () => {
    expect(defaultSourceFor([], 't1', '2026-11-15')).toBeUndefined();
    const sources = [source('a', 't2', '2026-11-15'), source('b', 't1', '2026-11-15'), source('c', 't1', '2026-11-08')];
    expect(defaultSourceFor(sources, 't1', '2026-11-15')?.id).toBe('c');
    expect(defaultSourceFor(sources, 't3', '2026-11-15')?.id).toBe('a');
  });

  it('every server error code gets its own line; no answer = the connection line', () => {
    const { errors } = traineesCopy.he.duplicate;
    const failure = (code: string) => new PlanRequestError('x', [], { code, status: 409 });
    expect(describePlanCreateError(failure('plan_week_taken'), 'he')).toBe(errors.plan_week_taken);
    expect(describePlanCreateError(failure('plan_source_not_found'), 'he')).toBe(errors.plan_source_not_found);
    expect(describePlanCreateError(failure('plan_locked'), 'he')).toBe(errors.plan_locked);
    expect(describePlanCreateError(failure('something_new'), 'he')).toBe(errors.unknown);
    expect(describePlanCreateError(new PlanRequestError('x'), 'he')).toBe(errors.network);
    expect(isStaleListError(failure('plan_week_taken'))).toBe(true);
    expect(isStaleListError(failure('plan_locked'))).toBe(false);
  });

  it('two steps (2026-11-10): only replaceable drafts go on to "start over"; the rows reach the end of the range', () => {
    const draft = { id: 'd', status: 'draft' as const, workoutCount: 3, isEmpty: false, inBlock: false, locked: false, updatedAt: '2026-11-09T10:00:00.000Z' };
    expect(replacesDrafts({ kind: 'draft', plan: draft, canReplace: true })).toBe(true);
    expect(replacesDrafts({ kind: 'draft', plan: { ...draft, inBlock: true }, canReplace: false })).toBe(false);
    expect(replacesDrafts({ kind: 'blockDrafts', weeks: ['2026-11-15'] })).toBe(true);
    expect(replacesDrafts({ kind: 'published', plan: { ...draft, status: 'published' } })).toBe(false);
    expect(replacesDrafts({ kind: 'create' })).toBe(false);

    const offered: PlanWeekOption[] = Array.from({ length: 8 }, (_, index) => ({
      weekStartDate: addDaysToDate('2026-11-08', index * 7),
      relation: index === 0 ? 'this' : index === 1 ? 'next' : 'later',
      plan: null,
      copiesFromWeek: null,
    }));
    expect(visibleWeekRows(offered, ['2026-11-15'])).toHaveLength(4);
    // A 4-week plan from next week ends on Dec 6: the fifth row shows.
    expect(visibleWeekRows(offered, ['2026-11-15', '2026-11-22', '2026-11-29', '2026-12-06'])).toHaveLength(5);
    expect(weekRowLabel(offered[0], '2026-11-08', 'he')).toBe('השבוע');
    expect(weekRowLabel(offered[2], '2026-11-08', 'he')).toBe('בעוד שבועיים');
    expect(weekRowLabel(offered[3], '2026-11-08', 'en')).toBe('In 3 weeks');
  });
});
