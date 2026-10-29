import type { CoachPlan, PlanExercise, PlanExerciseInput, PlanWorkout, PlanWorkoutInput, SavePlanPayload } from '@sistem/types';

// A saved plan back into the PUT …/plans/:planId body, unchanged — the base for coach mode's light
// edits (move a workout's day, swap an exercise). Every id is sent, so her logs stay linked; the
// AI link and the split are left out (omitted = kept). Every plan rule stays on the server.

function exerciseInput(exercise: PlanExercise): PlanExerciseInput {
  const common: PlanExerciseInput = {
    id: exercise.id,
    exerciseId: exercise.exerciseId,
    notes: exercise.notes,
    supersetGroup: exercise.supersetGroup,
    interval: exercise.interval,
    slotId: exercise.slotId,
  };
  if (exercise.setTargets && exercise.setTargets.length > 0) {
    return { ...common, setTargets: exercise.setTargets.map((target) => ({ ...target })) };
  }
  return {
    ...common,
    sets: exercise.sets,
    reps: exercise.reps,
    repsMax: exercise.repsMax,
    durationSec: exercise.durationSec,
    targetWeight: exercise.targetWeight,
    restSec: exercise.restSec,
  };
}

function workoutInput(workout: PlanWorkout): PlanWorkoutInput {
  return {
    id: workout.id,
    title: workout.title,
    dayOfWeek: workout.dayOfWeek,
    notes: workout.notes,
    workoutType: workout.workoutType,
    ...(workout.kind === 'cardio' && workout.cardio ? { kind: 'cardio' as const, cardio: workout.cardio } : {}),
    exercises: workout.exercises.map(exerciseInput),
  };
}

export function planToSavePayload(plan: CoachPlan): SavePlanPayload {
  return { notes: plan.notes, workouts: [...plan.workouts].sort((a, b) => a.order - b.order).map(workoutInput) };
}

/** The same plan with one workout on another day (0 = Sunday … 6 = Saturday). */
export function withWorkoutDay(plan: CoachPlan, workoutId: string, dayOfWeek: number): SavePlanPayload {
  const payload = planToSavePayload(plan);
  return { ...payload, workouts: payload.workouts.map((workout) => (workout.id === workoutId ? { ...workout, dayOfWeek } : workout)) };
}

/**
 * The same plan with one exercise replaced, its sets / reps / weights / rest / notes kept. The swapped
 * line gets a new id: her logs of the old exercise must not point at the new one.
 */
export function withExerciseSwapped(plan: CoachPlan, workoutId: string, planExerciseId: string, exerciseId: string): SavePlanPayload {
  const payload = planToSavePayload(plan);
  return {
    ...payload,
    workouts: payload.workouts.map((workout) =>
      workout.id !== workoutId
        ? workout
        : {
            ...workout,
            exercises: workout.exercises.map((exercise) => (exercise.id === planExerciseId ? { ...exercise, id: undefined, exerciseId } : exercise)),
          },
    ),
  };
}
