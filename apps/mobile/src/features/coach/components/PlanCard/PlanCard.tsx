import type { ReactNode } from 'react';
import type { CoachPlan, WorkoutStatus } from '@sistem/types';
import { IconCheck, IconChevronDown } from '@tabler/icons-react';
import { cardioMinutesLabel, cardioTotals, dayName, fill, sharedCopy, useCopy, useI18n } from '@sistem/shared';
import { PlanExerciseList } from '../../../workouts/components/PlanExerciseList/PlanExerciseList';
import { letterOf, nameScript } from '../../../workouts/data/weekPlanDisplay';
import { coachCopy } from '../../copy';
import './PlanCard.css';

interface PlanCardProps {
  plan: CoachPlan;
  /** This week only: each workout's status from the server (done / missed get a chip, upcoming none). */
  statuses?: Record<string, WorkoutStatus>;
  /** The light actions for this plan (publish), under the workouts. */
  children?: ReactNode;
}

/** The week colors cycle 1–4 (packages/tokens --color-week-N); a weekly plan uses week 1's pink. */
const WEEK_COLOR_COUNT = 4;

function accentClass(plan: CoachPlan): string {
  return `plan-card-week-${plan.block ? ((plan.block.week - 1) % WEEK_COLOR_COUNT) + 1 : 1}`;
}

/** One weekly plan, read-only (plans are edited on the web dashboard, PRD §6): status chips, then a card per workout. */
export function PlanCard({ plan, statuses, children }: PlanCardProps) {
  const shared = useCopy(sharedCopy);
  const coach = useCopy(coachCopy);
  const lane = coach.detail.lane;
  const copy = shared.coach;
  const { language, plural } = useI18n();
  return (
    <div className={`plan-card ${accentClass(plan)}`}>
      <div className="plan-card-chips">
        <span className={'plan-card-chip' + (plan.status === 'published' ? ' plan-card-chip-published' : '')}>{copy.planStatus[plan.status]}</span>
        {plan.locked && <span className="plan-card-chip">{copy.startedByTrainee}</span>}
        {plan.block && <span className="plan-card-chip">{fill(coach.blockWeekOf, { n: plan.block.week, total: plan.block.lengthWeeks })}</span>}
      </div>

      {plan.notes && (
        <p className="plan-card-notes" dir="auto">
          {plan.notes}
        </p>
      )}
      {plan.workouts.length === 0 && <p className="plan-card-empty">{copy.noWorkoutsInPlan}</p>}

      {plan.workouts.map((workout, index) => {
        const status = statuses?.[workout.id];
        return (
          <details key={workout.id} className="plan-workout">
            <summary className="plan-workout-summary">
              <span className="plan-workout-letter" aria-hidden="true">
                {letterOf(index)}
              </span>
              <span className="plan-workout-heading">
                <span className="plan-workout-title">
                  <bdi {...nameScript(workout.title)}>{workout.title}</bdi>
                </span>
                <span className="plan-workout-meta">
                  {workout.dayOfWeek !== undefined && `${dayName(workout.dayOfWeek, language)} · `}
                  {workout.kind === 'cardio' && workout.cardio
                    ? `${shared.cardio.cardioTag} · ${cardioMinutesLabel(cardioTotals(workout.cardio.steps).totalSec, language)}`
                    : plural(copy.exerciseCount, workout.exercises.length)}
                </span>
              </span>
              {status === 'done' && (
                <span className="plan-workout-status plan-workout-status-done">
                  <IconCheck size={14} stroke={3} aria-hidden="true" />
                  {lane.done}
                </span>
              )}
              {status === 'missed' && <span className="plan-workout-status plan-workout-status-missed">{lane.missed}</span>}
              <IconChevronDown className="plan-workout-chevron" size={20} aria-hidden="true" />
            </summary>

            {workout.notes && (
              <p className="plan-card-notes" dir="auto">
                {workout.notes}
              </p>
            )}
            <PlanExerciseList exercises={workout.exercises} />
          </details>
        );
      })}

      {children}
    </div>
  );
}
