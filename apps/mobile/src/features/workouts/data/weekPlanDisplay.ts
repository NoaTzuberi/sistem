import type { Language, PlanExercise, TraineePlan, TraineePlanWorkout, TraineeWeek } from '@sistem/types';
import { fill, sharedCopy, weekdayName } from '@sistem/shared';
import { isHebrewText, workoutColorClass } from '../../home/data/homeDisplay';
import type { workoutCopy } from '../copy';

// The Workouts screen's "Plan" tab as plain functions. Every status comes from the server (/plans/week,
// /plans in her zone); these only arrange it.

type WorkoutCopy = (typeof workoutCopy)['he'];

const LETTER_A = 65;

export interface PlannedWorkout {
  workout: TraineePlanWorkout;
  /** The place in the plan, 0-based — drives the identity color and the letter (as Home and the plan builder). */
  index: number;
  colorClass: string;
  /** 'A', 'B', … by its place in the plan: the ticket's decoration only. */
  letter: string;
}

export interface WeekPlan {
  weekStartDate: string;
  plan: TraineePlan | null;
  workouts: PlannedWorkout[];
  /** The server's "next workout" (in progress → first upcoming → earliest missed); null when all are done. */
  next: PlannedWorkout | null;
  doneCount: number;
  nextWeek: { weekStartDate: string; plan: TraineePlan | null };
}

export function letterOf(index: number): string {
  return String.fromCharCode(LETTER_A + (index % 26));
}

export function toPlannedWorkouts(plan: TraineePlan | null): PlannedWorkout[] {
  return (plan?.workouts ?? []).map((workout, index) => ({
    workout,
    index,
    colorClass: workoutColorClass(index),
    letter: letterOf(index),
  }));
}

export function buildWeekPlan(week: TraineeWeek, nextWeek: WeekPlan['nextWeek']): WeekPlan {
  const workouts = toPlannedWorkouts(week.plan);
  return {
    weekStartDate: week.weekStartDate,
    plan: week.plan,
    workouts,
    next: workouts.find(({ workout }) => workout.id === week.nextWorkoutId) ?? null,
    doneCount: workouts.filter(({ workout }) => workout.status === 'done').length,
    nextWeek,
  };
}

export type TicketState = 'done' | 'today' | 'planned' | 'missed';

/** A ticket's look, from the server's status: done = solid color, today / open = ringed white, else tinted. */
export function ticketState({ workout }: PlannedWorkout): TicketState {
  if (workout.status === 'done') return 'done';
  if (workout.isToday || workout.inProgress) return 'today';
  return workout.status === 'missed' ? 'missed' : 'planned';
}

/** Every planned set of a workout (the server's resolvedSets). */
export function setTotal(workout: TraineePlanWorkout): number {
  return workout.exercises.reduce((sum, exercise) => sum + exercise.resolvedSets.length, 0);
}

/** "Today · Thu" / "Thursday" / "Any day" — the workout's planned day. */
export function workoutDayLabel(workout: TraineePlanWorkout, language: Language, copy: WorkoutCopy): string {
  if (workout.dayOfWeek === undefined) return copy.list.anyDay;
  const day = weekdayName(workout.dayOfWeek, language, 'short');
  return workout.isToday ? fill(copy.plan.todayDay, { day }) : day;
}

/** The short day only (a ticket): "Thu", or "Any day". */
export function workoutShortDay(workout: TraineePlanWorkout, language: Language, copy: WorkoutCopy): string {
  return workout.dayOfWeek === undefined ? copy.list.anyDay : weekdayName(workout.dayOfWeek, language, 'short');
}

const BODYWEIGHT_EQUIPMENT = new Set(['bodyweight', 'no_equipment']);

/** "40 kg" from the first working set's target; "Bodyweight" for a no-equipment exercise; else nothing. */
export function exerciseWeightLabel(exercise: PlanExercise, language: Language, copy: WorkoutCopy): string | null {
  const working = exercise.resolvedSets.find((set) => set.type === 'working') ?? exercise.resolvedSets[0];
  if (working?.targetWeight !== undefined) return `${working.targetWeight} ${sharedCopy[language].units.kg}`;
  const equipment = exercise.exercise?.equipment ?? [];
  return equipment.length > 0 && equipment.every((id) => BODYWEIGHT_EQUIPMENT.has(id)) ? copy.preview.bodyweight : null;
}

/**
 * Coach-written workout names may be Hebrew (Rubik, upright, right to left) or Latin (Barlow italic,
 * isolated left to right inside Hebrew text). `data-script` picks the font (typography.css).
 */
export function nameScript(text: string): { dir: 'ltr' | 'rtl'; 'data-script': 'he' | 'latin' } {
  return isHebrewText(text) ? { dir: 'rtl', 'data-script': 'he' } : { dir: 'ltr', 'data-script': 'latin' };
}
