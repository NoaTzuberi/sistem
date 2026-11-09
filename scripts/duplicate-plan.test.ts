import { describe, expect, it } from 'vitest';
import { PlanRequestError } from '@sistem/api-client';
import type { PlanDuplicateSource } from '@sistem/types';
import { defaultSourceFor, startActionFor } from '../apps/dashboard/src/features/trainees/data/newPlanStart';
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
  it('a draft week asks (duplicate) instead of opening it; a published week always opens', () => {
    const draftWeek = { plan: { id: 'p1', status: 'draft' as const } };
    const publishedWeek = { plan: { id: 'p2', status: 'published' as const } };
    expect(startActionFor(draftWeek, 'duplicate')).toBe('duplicate');
    expect(startActionFor(draftWeek, 'scratch')).toBe('open');
    expect(startActionFor(publishedWeek, 'duplicate')).toBe('open');
    expect(startActionFor({ plan: null }, 'duplicate')).toBe('duplicate');
    expect(startActionFor({ plan: null }, 'scratch')).toBe('create');
    expect(startActionFor(undefined, 'scratch')).toBe('none');
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
});
