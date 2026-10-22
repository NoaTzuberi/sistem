import { describe, it, expect } from 'vitest';
import { Types } from 'mongoose';
import { resolvePlanExerciseSets, validatePlanExerciseTargets, deriveSetCount } from '../planSets';
import { Plan } from '../plan.model';
import { Template } from '../../templates/template.model';
import { translate, type ServerMessage } from '../../../i18n';

// Messages are codes (Phase 15); these tests read them in English.
function expectEn(message: ServerMessage | string | null | undefined) {
  return expect(message && typeof message === 'object' ? translate('en', message) : message);
}

describe('resolvePlanExerciseSets', () => {
  it('repeats the uniform targets for every set', () => {
    expect(resolvePlanExerciseSets({ sets: 3, reps: 8, repsMax: 12, targetWeight: 40, restSec: 90 })).toEqual([
      { setIndex: 0, type: 'working', reps: 8, repsMax: 12, targetWeight: 40, restSec: 90 },
      { setIndex: 1, type: 'working', reps: 8, repsMax: 12, targetWeight: 40, restSec: 90 },
      { setIndex: 2, type: 'working', reps: 8, repsMax: 12, targetWeight: 40, restSec: 90 },
    ]);
  });

  it('handles time-based exercises', () => {
    expect(resolvePlanExerciseSets({ sets: 2, durationSec: 45, restSec: 30 })).toEqual([
      { setIndex: 0, type: 'working', durationSec: 45, restSec: 30 },
      { setIndex: 1, type: 'working', durationSec: 45, restSec: 30 },
    ]);
  });

  it('uses setTargets as the full definition of every set, ignoring the uniform fields', () => {
    const sets = resolvePlanExerciseSets({
      sets: 3,
      reps: 5,
      targetWeight: 100,
      restSec: 180,
      setTargets: [
        { type: 'warmup', reps: 12, targetWeight: 20 },
        { reps: 10, targetWeight: 40, restSec: 90 },
        { type: 'drop', reps: 12, targetWeight: 30 },
      ],
    });
    expect(sets).toEqual([
      { setIndex: 0, type: 'warmup', reps: 12, targetWeight: 20 },
      { setIndex: 1, type: 'working', reps: 10, targetWeight: 40, restSec: 90 },
      { setIndex: 2, type: 'drop', reps: 12, targetWeight: 30 },
    ]);
  });

  it('treats an empty setTargets array as absent', () => {
    expect(resolvePlanExerciseSets({ sets: 1, reps: 10, setTargets: [] })).toEqual([
      { setIndex: 0, type: 'working', reps: 10 },
    ]);
  });

  it('never emits null targets (lean documents may carry nulls)', () => {
    expect(resolvePlanExerciseSets({ sets: 1, reps: 10, targetWeight: null, restSec: null })).toEqual([
      { setIndex: 0, type: 'working', reps: 10 },
    ]);
  });

  it('returns no sets when there is no set count', () => {
    expect(resolvePlanExerciseSets({ reps: 10 })).toEqual([]);
  });
});

describe('deriveSetCount', () => {
  it('derives sets from setTargets', () => {
    expect(deriveSetCount({ sets: 99, setTargets: [{ reps: 1 }, { reps: 2 }] })).toBe(2);
  });

  it('keeps sets without setTargets', () => {
    expect(deriveSetCount({ sets: 4, reps: 8 })).toBe(4);
  });
});

describe('validatePlanExerciseTargets', () => {
  it('accepts reps or a duration', () => {
    expect(validatePlanExerciseTargets({ sets: 3, reps: 10 })).toBeNull();
    expect(validatePlanExerciseTargets({ sets: 3, durationSec: 30 })).toBeNull();
  });

  it('rejects an exercise with neither reps nor a duration', () => {
    expectEn(validatePlanExerciseTargets({ sets: 3, targetWeight: 20 })).toMatch(/reps or a duration/);
  });

  it('rejects a missing or zero set count', () => {
    expectEn(validatePlanExerciseTargets({ reps: 10 })).toMatch(/at least one set/);
    expectEn(validatePlanExerciseTargets({ sets: 0, reps: 10 })).toMatch(/at least one set/);
  });

  it('rejects an inverted or orphan rep range', () => {
    expectEn(validatePlanExerciseTargets({ sets: 3, reps: 12, repsMax: 8 })).toMatch(/repsMax/);
    expectEn(validatePlanExerciseTargets({ sets: 3, durationSec: 30, repsMax: 8 })).toMatch(/rep range needs reps/);
  });

  it('checks every set target', () => {
    expectEn(validatePlanExerciseTargets({ setTargets: [{ reps: 10 }, { targetWeight: 20 }] })).toMatch(/^Set 2/);
    expect(validatePlanExerciseTargets({ setTargets: [{ reps: 10 }, { durationSec: 20 }] })).toBeNull();
  });

  it('rejects a set count that disagrees with setTargets', () => {
    expectEn(validatePlanExerciseTargets({ sets: 3, setTargets: [{ reps: 10 }] })).toMatch(/sets must equal/);
  });
});

function planWith(exercise: Record<string, unknown>) {
  return new Plan({
    traineeId: new Types.ObjectId(),
    coachId: new Types.ObjectId(),
    coachingId: new Types.ObjectId(),
    weekStartDate: '2026-10-04',
    workouts: [{ title: 'Day 1', order: 0, exercises: [{ exerciseId: new Types.ObjectId(), ...exercise }] }],
  });
}

describe('Plan schema', () => {
  it('derives sets from setTargets before validating', async () => {
    const plan = planWith({ sets: 1, setTargets: [{ reps: 10 }, { type: 'drop', reps: 12 }] });
    await plan.validate();
    expect(plan.workouts[0].exercises[0].sets).toBe(2);
    expect(plan.workouts[0].exercises[0].setTargets?.[0].type).toBe('working');
  });

  it('rejects an exercise with neither reps nor a duration', async () => {
    await expect(planWith({ sets: 3 }).validate()).rejects.toThrow(/reps or a duration/);
  });

  it('rejects a set target with neither reps nor a duration', async () => {
    await expect(planWith({ setTargets: [{ type: 'warmup', targetWeight: 20 }] }).validate()).rejects.toThrow(/Set 1/);
  });

  it('normalizes the superset group and rejects long labels', async () => {
    const plan = planWith({ sets: 3, reps: 10, supersetGroup: 'a' });
    await plan.validate();
    expect(plan.workouts[0].exercises[0].supersetGroup).toBe('A');
    await expect(planWith({ sets: 3, reps: 10, supersetGroup: 'superset' }).validate()).rejects.toThrow();
  });

  it('only accepts a Sunday as weekStartDate', async () => {
    const plan = planWith({ sets: 3, reps: 10 });
    plan.weekStartDate = '2026-10-05';
    await expect(plan.validate()).rejects.toThrow(/Sunday/);
  });
});

describe('Template schema', () => {
  const workout = { title: 'Push', order: 0, exercises: [{ exerciseId: new Types.ObjectId(), sets: 3, reps: 10 }] };

  it('holds exactly one workout for type workout', async () => {
    await new Template({ coachId: new Types.ObjectId(), type: 'workout', name: 'Push', workouts: [workout] }).validate();
    await expect(
      new Template({ coachId: new Types.ObjectId(), type: 'workout', name: 'Two', workouts: [workout, workout] }).validate(),
    ).rejects.toThrow(/exactly one/);
  });

  it('reuses the plan exercise rules', async () => {
    const bad = { title: 'Bad', order: 0, exercises: [{ exerciseId: new Types.ObjectId(), sets: 3 }] };
    await expect(
      new Template({ coachId: new Types.ObjectId(), type: 'plan', name: 'Bad', workouts: [bad] }).validate(),
    ).rejects.toThrow(/reps or a duration/);
  });
});
