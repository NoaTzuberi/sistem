import type { PlanBlockWeek } from '@sistem/types';
import { BLOCK_PROGRESSION } from './plan.constants';
import { resolvePlanExerciseSets } from './planSets';
import type { PlanDocument, PlanExerciseFields, PlanSetTargetFields, PlanWorkoutFields } from './plan.types';

// Pure rules of multi-week plans: what "copy to the next weeks" writes into each week, and the
// numbers the builder's ribbon / her Workouts tab show. Progression is applied at copy time (the
// targets are written into each week), never as a live rule.

type CopiedExercise = PlanExerciseFields;
export type CopiedWorkout = Omit<PlanWorkoutFields, 'exercises'> & { exercises: CopiedExercise[] };

type CopySource = Pick<PlanDocument, 'notes' | 'splitId'> & { workouts: (PlanWorkoutFields & { _id?: unknown })[] };

/** What a copy takes from its source: content only, with fresh workout / exercise ids (logs never mix). */
export function copiedContent(source: CopySource): { notes?: string; splitId?: string; workouts: CopiedWorkout[] } {
  return {
    notes: source.notes,
    // Workout types, slots and progression rules are copied with the workouts (coach structure); the AI link is not.
    splitId: source.splitId ?? undefined,
    workouts: source.workouts.map(({ _id: _workoutId, exercises, ...workout }) => ({
      ...workout,
      exercises: exercises.map(({ _id: _exerciseId, ...exercise }) => exercise as CopiedExercise),
    })),
  };
}

/** Weights in kg, kept to two decimals (2.5 steps never drift into 42.49999). */
function roundKg(value: number): number {
  return Math.round(value * 100) / 100;
}

/** At least one set; "שבוע קל" = sets × 0.7, rounded. */
export function deloadSetCount(sets: number): number {
  return Math.max(1, Math.round(sets * BLOCK_PROGRESSION.deloadSetsFactor));
}

function progressTarget<T extends { reps?: number; repsMax?: number; targetWeight?: number }>(target: T, rule: PlanExerciseFields['progression'], steps: number): T {
  if (steps <= 0 || !rule) return target;
  if (rule === 'weight') {
    return target.targetWeight === undefined ? target : { ...target, targetWeight: roundKg(target.targetWeight + BLOCK_PROGRESSION.weightStepKg * steps) };
  }
  if (target.reps === undefined) return target;
  const add = BLOCK_PROGRESSION.repsStep * steps;
  return { ...target, reps: target.reps + add, ...(target.repsMax !== undefined ? { repsMax: target.repsMax + add } : {}) };
}

/**
 * One exercise as it appears `steps` weeks later: its progression added `steps` times; a deload week
 * also cuts its sets to 70% (at least one). Exercises without a rule keep their targets.
 */
export function progressExercise(exercise: CopiedExercise, steps: number, deload: boolean): CopiedExercise {
  const rule = exercise.progression;
  let next: CopiedExercise = progressTarget(exercise, rule, steps);
  if (next.setTargets?.length) {
    let targets: PlanSetTargetFields[] = next.setTargets.map((target) => progressTarget(target, rule, steps));
    if (deload) targets = targets.slice(0, deloadSetCount(targets.length));
    next = { ...next, setTargets: targets, sets: targets.length };
  } else if (deload) {
    next = { ...next, sets: deloadSetCount(next.sets) };
  }
  return next;
}

export function progressWorkouts(workouts: CopiedWorkout[], steps: number, deload: boolean): CopiedWorkout[] {
  return workouts.map((workout) =>
    workout.kind === 'cardio' ? workout : { ...workout, exercises: workout.exercises.map((exercise) => progressExercise(exercise, steps, deload)) },
  );
}

/**
 * How week `target` is filled from week `source`: the steps of progression, and whether it is the
 * deload week (then the weights stay as the week before it: one step fewer).
 */
export function copyStepsFor(source: number, target: number, lengthWeeks: number, deloadLastWeek: boolean): { steps: number; deload: boolean } {
  const deload = deloadLastWeek && target === lengthWeeks;
  return { steps: Math.max(0, target - source - (deload ? 1 : 0)), deload };
}

type VolumeWorkout = Pick<PlanWorkoutFields, 'kind'> & { exercises: Parameters<typeof resolvePlanExerciseSets>[0][] };

/** Σ sets × reps × kg over its strength sets (reps = the low end of a range); no weights at all = its set count. */
export function weekVolume(workouts: VolumeWorkout[]): PlanBlockWeek['volume'] {
  let kg = 0;
  let sets = 0;
  for (const workout of workouts) {
    if (workout.kind === 'cardio') continue;
    for (const exercise of workout.exercises) {
      for (const set of resolvePlanExerciseSets(exercise)) {
        sets += 1;
        if (set.reps !== undefined && set.targetWeight !== undefined) kg += set.reps * set.targetWeight;
      }
    }
  }
  return kg > 0 ? { value: Math.round(kg), unit: 'kg' } : { value: sets, unit: 'sets' };
}

type WeightWorkout = { exercises: (Parameters<typeof resolvePlanExerciseSets>[0] & { exerciseId: unknown })[] };

function topWeight(exercise: Parameters<typeof resolvePlanExerciseSets>[0]): number | undefined {
  const weights = resolvePlanExerciseSets(exercise).flatMap((set) => (set.targetWeight === undefined ? [] : [set.targetWeight]));
  return weights.length ? Math.max(...weights) : undefined;
}

/** Exercises (same place, same exercise) whose top target weight went up vs the week before. */
export function countWeightIncreases(previous: WeightWorkout[], current: WeightWorkout[]): number {
  let count = 0;
  current.forEach((workout, workoutIndex) => {
    workout.exercises.forEach((exercise, exerciseIndex) => {
      const before = previous[workoutIndex]?.exercises[exerciseIndex];
      if (!before || String(before.exerciseId) !== String(exercise.exerciseId)) return;
      const was = topWeight(before);
      const now = topWeight(exercise);
      if (was !== undefined && now !== undefined && now > was) count += 1;
    });
  });
  return count;
}
