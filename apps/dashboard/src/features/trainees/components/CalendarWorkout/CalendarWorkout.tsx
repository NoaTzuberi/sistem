import { Link } from 'react-router-dom';
import type { PlanWorkout, WorkoutStatus } from '@sistem/types';
import { cardioMinutesLabel, cardioTotals, formatPlural, sharedCopy, useCopy, useLanguage } from '@sistem/shared';
import { workoutColorClass } from '../../../planBuilder/data/workoutColors';
import { traineesCopy } from '../../copy';
import './CalendarWorkout.css';

interface CalendarWorkoutProps {
  workout: PlanWorkout;
  /** Its place in the plan: its identity color. */
  index: number;
  /** The server's status; 'draft' for a plan not published yet. */
  status: WorkoutStatus | 'draft';
  /** The builder (the plan it belongs to). */
  to: string;
}

/** A workout on the week calendar: its color, name, exercise count and status chip — one press to the builder. */
export function CalendarWorkout({ workout, index, status, to }: CalendarWorkoutProps) {
  const language = useLanguage();
  const shared = useCopy(sharedCopy);
  const copy = useCopy(traineesCopy);
  const chip =
    status === 'done' ? `${copy.workoutDone} ✓` : status === 'upcoming' ? copy.workoutPlanned : status === 'missed' ? copy.weeks.skipped : shared.coach.planStatus.draft;

  return (
    <Link className={`pw-workout ${workoutColorClass(index)}`} data-status={status} to={to}>
      <bdi className="pw-workout-name" dir="auto">
        {workout.title}
      </bdi>
      <span className="pw-workout-count">
        {workout.kind === 'cardio' && workout.cardio
          ? `${shared.cardio.cardioTag} · ${cardioMinutesLabel(cardioTotals(workout.cardio.steps).totalSec, language)}`
          : formatPlural(language, shared.coach.exerciseCount, workout.exercises.length)}
      </span>
      <span className="pw-workout-chip">{chip}</span>
    </Link>
  );
}
