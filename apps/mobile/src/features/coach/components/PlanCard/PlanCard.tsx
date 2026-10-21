import type { ReactNode } from 'react';
import type { CoachPlan } from '@sistem/types';
import { IconChevronDown } from '@tabler/icons-react';
import { Badge } from '../../../../components/common/Badge/Badge';
import { cardioMinutesLabel, cardioTotals, dayName, sharedCopy, useCopy, useI18n } from '@sistem/shared';
import { PlanExerciseList } from '../../../workouts/components/PlanExerciseList/PlanExerciseList';
import './PlanCard.css';

interface PlanCardProps {
  plan: CoachPlan;
  /** The light actions for this plan (publish), under the workouts. */
  children?: ReactNode;
}

/** One weekly plan, read-only: plans are edited on the web dashboard (PRD §6). */
export function PlanCard({ plan, children }: PlanCardProps) {
  const shared = useCopy(sharedCopy);
  const copy = shared.coach;
  const { language, plural } = useI18n();
  return (
    <div className="plan-card">
      <div className="plan-card-badges">
        <Badge variant={plan.status === 'published' ? 'accent' : 'neutral'}>
          {copy.planStatus[plan.status]}
        </Badge>
        {plan.locked && <Badge variant="neutral">{copy.startedByTrainee}</Badge>}
      </div>

      {plan.notes && (
        <p className="plan-card-notes" dir="auto">
          {plan.notes}
        </p>
      )}
      {plan.workouts.length === 0 && <p className="plan-card-empty">{copy.noWorkoutsInPlan}</p>}

      {plan.workouts.map((workout) => (
        <details key={workout.id} className="plan-workout">
          <summary className="plan-workout-summary">
            <span className="plan-workout-heading">
              <span className="plan-workout-title" dir="auto">
                {workout.title}
              </span>
              <span className="plan-workout-meta">
                {workout.dayOfWeek !== undefined && `${dayName(workout.dayOfWeek, language)} · `}
                {workout.kind === 'cardio' && workout.cardio
                  ? `${shared.cardio.cardioTag} · ${cardioMinutesLabel(cardioTotals(workout.cardio.steps).totalSec, language)}`
                  : plural(copy.exerciseCount, workout.exercises.length)}
              </span>
            </span>
            <IconChevronDown className="plan-workout-chevron" size={20} aria-hidden="true" />
          </summary>

          {workout.notes && (
            <p className="plan-card-notes" dir="auto">
              {workout.notes}
            </p>
          )}
          <PlanExerciseList exercises={workout.exercises} />
        </details>
      ))}

      {children}
    </div>
  );
}
