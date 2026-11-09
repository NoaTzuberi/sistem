import { describe, expect, it } from 'vitest';
import type { PlanBlockWeek, PlanWorkout } from '@sistem/types';
import { firstTakenBlockWeek, startActionFor } from '../apps/dashboard/src/features/trainees/data/newPlanStart';
import { laterWeeksRange, progressChipFor, volumeShares, weekColorClass } from '../apps/dashboard/src/features/planBuilder/data/blockWeeks';
import type { DraftExercise } from '../apps/dashboard/src/features/planBuilder/types';

// Multi-week plans (2026-11-09): the dashboard's display rules. The server tests cover the API.

const week = (n: number, value: number, workoutCount = 1): PlanBlockWeek => ({
  planId: `p${n}`,
  week: n,
  weekStartDate: `2026-11-${String(n).padStart(2, '0')}`,
  status: 'draft',
  workoutCount,
  volume: { value, unit: 'kg' },
  locked: false,
  isDeload: false,
});

const draftExercise = (fields: Partial<DraftExercise>): DraftExercise => ({
  key: 'k',
  exerciseId: 'squat',
  mode: 'reps',
  notes: '',
  supersetGroup: '',
  setTargets: null,
  interval: false,
  ...fields,
});

const previousWeek = [
  { exercises: [{ exerciseId: 'squat', sets: 4, reps: 8, targetWeight: 40 }] },
] as unknown as PlanWorkout[];

describe('multi-week plans (dashboard rules)', () => {
  it('week colors cycle pink → purple → orange → blue', () => {
    expect([1, 2, 3, 4, 5, 8].map(weekColorClass)).toEqual(['week-color-1', 'week-color-2', 'week-color-3', 'week-color-4', 'week-color-1', 'week-color-4']);
  });

  it('bars are relative to the heaviest week; empty weeks have none', () => {
    expect(volumeShares([week(1, 4000), week(2, 5000), week(3, 0, 0)])).toEqual([0.8, 1, 0]);
  });

  it('later weeks of a block, none after the last', () => {
    expect(laterWeeksRange(1, 4)).toEqual({ from: 2, to: 4 });
    expect(laterWeeksRange(4, 4)).toBeNull();
  });

  it('chips: heavier, more reps, fewer sets in the light week; nothing changed = none', () => {
    expect(progressChipFor(previousWeek, 0, 0, draftExercise({ sets: 4, reps: 8, targetWeight: 42.5 }))).toEqual({ kind: 'weight', amount: 2.5 });
    expect(progressChipFor(previousWeek, 0, 0, draftExercise({ sets: 4, reps: 9, targetWeight: 40 }))).toEqual({ kind: 'reps', amount: 1 });
    expect(progressChipFor(previousWeek, 0, 0, draftExercise({ sets: 3, reps: 8, targetWeight: 40 }))).toEqual({ kind: 'deload' });
    expect(progressChipFor(previousWeek, 0, 0, draftExercise({ sets: 4, reps: 8, targetWeight: 40 }))).toBeNull();
    // Another exercise in that place: nothing to compare.
    expect(progressChipFor(previousWeek, 0, 0, draftExercise({ exerciseId: 'row', sets: 4, reps: 8, targetWeight: 50 }))).toBeNull();
  });

  it('a block never starts on a taken week, and finds the first taken week inside it', () => {
    const weeks = [
      { weekStartDate: 'w1', plan: null },
      { weekStartDate: 'w2', plan: null },
      { weekStartDate: 'w3', plan: { id: 'x', status: 'draft' as const } },
    ];
    expect(firstTakenBlockWeek(weeks, 'w1', 2)).toBeNull();
    expect(firstTakenBlockWeek(weeks, 'w1', 3)).toBe(3);
    // A draft week: a weekly duplicate asks replace / open, a block just opens it.
    expect(startActionFor(weeks[2], 'duplicate', 'weekly')).toBe('duplicate');
    expect(startActionFor(weeks[2], 'duplicate', 'block')).toBe('open');
    expect(startActionFor(weeks[0], 'scratch', 'block')).toBe('create');
  });
});
