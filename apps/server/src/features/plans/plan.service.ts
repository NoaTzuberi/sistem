import type { Types } from 'mongoose';
import type { CardioStep, Plan as PublicPlan, PlanExercise, PlanWorkout } from '@sistem/types';
import { getExerciseFactsByIds } from '../exercises/exercise.service';
import { Plan } from './plan.model';
import { resolvePlanExerciseSets } from './planSets';
import type { PlanDocument, PlanExerciseFields, PlanWorkoutFields } from './plan.types';
import { LocalizedError } from '../../i18n';
import { coachingIdsOf } from '../coachings/coaching.service';

export class PlanNotFoundError extends LocalizedError {}

export type LeanPlan = PlanDocument & { _id: Types.ObjectId };

function toPublicExercise(exercise: PlanExerciseFields & { _id: Types.ObjectId }): PlanExercise {
  return {
    id: String(exercise._id),
    exerciseId: String(exercise.exerciseId),
    sets: exercise.sets,
    reps: exercise.reps,
    repsMax: exercise.repsMax,
    durationSec: exercise.durationSec,
    targetWeight: exercise.targetWeight,
    restSec: exercise.restSec,
    notes: exercise.notes,
    supersetGroup: exercise.supersetGroup,
    setTargets: exercise.setTargets?.length ? exercise.setTargets : undefined,
    interval: exercise.interval || undefined,
    resolvedSets: resolvePlanExerciseSets(exercise),
  };
}

function toPublicWorkout(workout: PlanWorkoutFields & { _id: Types.ObjectId }): PlanWorkout {
  return {
    id: String(workout._id),
    title: workout.title,
    dayOfWeek: workout.dayOfWeek,
    order: workout.order,
    notes: workout.notes,
    ...(workout.kind === 'cardio' && workout.cardio
      ? { kind: 'cardio' as const, cardio: { sport: workout.cardio.sport, metric: workout.cardio.metric, steps: workout.cardio.steps as CardioStep[] } }
      : {}),
    exercises: workout.exercises.map(toPublicExercise),
  };
}

export function toPublicPlan(plan: LeanPlan): PublicPlan {
  return {
    id: String(plan._id),
    traineeId: String(plan.traineeId),
    coachId: String(plan.coachId),
    weekStartDate: plan.weekStartDate,
    status: plan.status,
    publishedAt: plan.publishedAt ? plan.publishedAt.toISOString() : null,
    notes: plan.notes,
    workouts: [...plan.workouts].sort((a, b) => a.order - b.order).map(toPublicWorkout),
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  };
}

/**
 * Adds the library facts (name, muscles, …) to every plan exercise, in place — one
 * query for all the plans. Facts only: the imported text is never returned.
 */
export async function attachExerciseFacts(plans: PublicPlan[]): Promise<void> {
  const exerciseIds = new Set<string>();
  for (const plan of plans) {
    for (const workout of plan.workouts) {
      for (const exercise of workout.exercises) exerciseIds.add(exercise.exerciseId);
    }
  }

  const facts = await getExerciseFactsByIds([...exerciseIds]);
  for (const plan of plans) {
    for (const workout of plan.workouts) {
      for (const exercise of workout.exercises) exercise.exercise = facts.get(exercise.exerciseId);
    }
  }
}

/** A published plan from a LIVE coaching (an ended coach's plans don't keep her on Home). */
export async function hasPublishedPlan(traineeId: string): Promise<boolean> {
  const liveIds = await coachingIdsOf(traineeId);
  if (liveIds.length === 0) return false;
  return (await Plan.exists({ traineeId, status: 'published', coachingId: { $in: liveIds } })) !== null;
}
