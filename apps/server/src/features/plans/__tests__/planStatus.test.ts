import { describe, it, expect } from 'vitest';
import type { Plan } from '@sistem/types';
import { pickNextWorkoutId, resolvePlanPeriod, resolveWorkoutStatus, toTraineePlan } from '../planStatus';
import type { WorkoutLogRef } from '../planStatus';
import { localDateString } from '../planWeek';

// Phase 7: upcoming / done / missed, decided from the trainee's own calendar date.

const WEEK = '2026-09-27'; // a Sunday

function plan(workouts: { id: string; dayOfWeek?: number }[], weekStartDate = WEEK): Plan {
  return {
    id: 'plan-1',
    traineeId: 'trainee',
    coachId: 'coach',
    weekStartDate,
    status: 'published',
    publishedAt: null,
    introMessage: null,
    introTip: null,
    workouts: workouts.map((workout, order) => ({ ...workout, title: `Workout ${order + 1}`, order, exercises: [] })),
    createdAt: '',
    updatedAt: '',
  };
}

function log(workoutId: string, status: WorkoutLogRef['status'], id = `log-${workoutId}`): WorkoutLogRef {
  return { id, planId: 'plan-1', workoutId, status };
}

describe('resolveWorkoutStatus', () => {
  it('a planned day that has passed is missed; today and later are upcoming', () => {
    expect(resolveWorkoutStatus('2026-09-29', WEEK, '2026-09-30', false)).toBe('missed');
    expect(resolveWorkoutStatus('2026-09-30', WEEK, '2026-09-30', false)).toBe('upcoming');
    expect(resolveWorkoutStatus('2026-10-01', WEEK, '2026-09-30', false)).toBe('upcoming');
  });

  it('done wins, even when the day has passed', () => {
    expect(resolveWorkoutStatus('2026-09-27', WEEK, '2026-10-03', true)).toBe('done');
  });

  it('a workout without a day is missed only once its week is over', () => {
    expect(resolveWorkoutStatus(null, WEEK, '2026-10-03', false)).toBe('upcoming'); // Saturday
    expect(resolveWorkoutStatus(null, WEEK, '2026-10-04', false)).toBe('missed'); // next Sunday
  });
});

describe('time zone', () => {
  it('the same instant is two different days — and two different statuses — in two zones', () => {
    // 22:30 UTC on Tuesday is already Wednesday 01:30 in Jerusalem.
    const instant = new Date('2026-09-29T22:30:00Z');
    const jerusalem = localDateString(instant, 'Asia/Jerusalem');
    const newYork = localDateString(instant, 'America/New_York');
    expect(jerusalem).toBe('2026-09-30');
    expect(newYork).toBe('2026-09-29');

    const tuesday = '2026-09-29';
    expect(resolveWorkoutStatus(tuesday, WEEK, jerusalem, false)).toBe('missed');
    expect(resolveWorkoutStatus(tuesday, WEEK, newYork, false)).toBe('upcoming');
  });

  it('Saturday night in UTC is already the next week in Jerusalem', () => {
    const today = localDateString(new Date('2026-10-03T21:30:00Z'), 'Asia/Jerusalem');
    expect(today).toBe('2026-10-04');
    expect(resolvePlanPeriod(WEEK, today)).toBe('past');
  });
});

describe('resolvePlanPeriod', () => {
  it('past / current / upcoming around the week edges', () => {
    expect(resolvePlanPeriod(WEEK, '2026-09-26')).toBe('upcoming');
    expect(resolvePlanPeriod(WEEK, '2026-09-27')).toBe('current');
    expect(resolvePlanPeriod(WEEK, '2026-10-03')).toBe('current');
    expect(resolvePlanPeriod(WEEK, '2026-10-04')).toBe('past');
  });
});

describe('toTraineePlan', () => {
  const today = '2026-09-30'; // Wednesday
  const base = plan([{ id: 'sun', dayOfWeek: 0 }, { id: 'wed', dayOfWeek: 3 }, { id: 'fri', dayOfWeek: 5 }, { id: 'any' }]);

  it('sets status, date, isToday and the completed log per workout', () => {
    const result = toTraineePlan(base, [log('sun', 'completed')], today);
    expect(result.period).toBe('current');
    expect(result.workouts.map((w) => [w.id, w.status, w.date, w.isToday, w.logId])).toEqual([
      ['sun', 'done', '2026-09-27', false, 'log-sun'],
      ['wed', 'upcoming', '2026-09-30', true, null],
      ['fri', 'upcoming', '2026-10-02', false, null],
      ['any', 'upcoming', null, false, null],
    ]);
  });

  it('an abandoned or in-progress log does not make a workout done', () => {
    const result = toTraineePlan(base, [log('sun', 'abandoned'), log('wed', 'in_progress')], today);
    expect(result.workouts[0].status).toBe('missed');
    expect(result.workouts[0].inProgress).toBe(false);
    expect(result.workouts[1].status).toBe('upcoming');
    expect(result.workouts[1].inProgress).toBe(true);
  });

  it('ignores the logs of other plans', () => {
    const other: WorkoutLogRef = { id: 'x', planId: 'another-plan', workoutId: 'sun', status: 'completed' };
    expect(toTraineePlan(base, [other], today).workouts[0].status).toBe('missed');
  });
});

describe('pickNextWorkoutId', () => {
  const workouts = [{ id: 'sun', dayOfWeek: 0 }, { id: 'wed', dayOfWeek: 3 }, { id: 'fri', dayOfWeek: 5 }];

  it('the first upcoming workout, skipping done and missed ones', () => {
    expect(pickNextWorkoutId(toTraineePlan(plan(workouts), [], '2026-09-30'))).toBe('wed');
  });

  it('a workout in progress comes first', () => {
    const result = toTraineePlan(plan(workouts), [log('fri', 'in_progress')], '2026-09-30');
    expect(pickNextWorkoutId(result)).toBe('fri');
  });

  it('falls back to the earliest missed workout when nothing is upcoming', () => {
    const result = toTraineePlan(plan(workouts), [log('fri', 'completed')], '2026-10-03');
    expect(pickNextWorkoutId(result)).toBe('sun');
  });

  it('nothing when every workout is done, or the week is not the current one', () => {
    const allDone = workouts.map((workout) => log(workout.id, 'completed'));
    expect(pickNextWorkoutId(toTraineePlan(plan(workouts), allDone, '2026-09-30'))).toBeNull();
    expect(pickNextWorkoutId(toTraineePlan(plan(workouts), [], '2026-10-04'))).toBeNull();
    expect(pickNextWorkoutId(toTraineePlan(plan(workouts), [], '2026-09-20'))).toBeNull();
  });
});
