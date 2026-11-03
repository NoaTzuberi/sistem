import type { ReactNode } from 'react';
import type { TraineePlan, TraineePlanWorkout } from '@sistem/types';
import { dayName, formatPlural, formatWeekRange, useCopy, useLanguage } from '@sistem/shared';
import { workoutColorClass } from '../../../home/data/homeDisplay';
import { letterOf, nameScript, setTotal } from '../../data/weekPlanDisplay';
import { exerciseCountLabel, workoutStatusBadge } from '../../data/workoutDisplay';
import { workoutCopy } from '../../copy';
import './WorkoutDetailHero.css';

interface WorkoutDetailHeroProps {
  plan: TraineePlan;
  workout: TraineePlanWorkout;
  /** Start / Resume, the log link or the "not yet" line. */
  action: ReactNode;
}

/** The white hero card: the letter tile (its color from the Workouts tab), the name, soft fact chips, the week, the action. */
export function WorkoutDetailHero({ plan, workout, action }: WorkoutDetailHeroProps) {
  const language = useLanguage();
  const copy = useCopy(workoutCopy);
  const index = Math.max(0, plan.workouts.findIndex((item) => item.id === workout.id));
  const badge = workoutStatusBadge(workout, copy);

  return (
    <section className={`wk-hero ${workoutColorClass(index)}`}>
      <div className="wk-hero-head">
        <span className="wk-hero-letter" aria-hidden="true">
          {letterOf(index)}
        </span>
        <h1 className="wk-hero-name">
          <bdi className="display-name" {...nameScript(workout.title)}>
            {workout.title}
          </bdi>
        </h1>
      </div>
      <div className="wk-hero-chips">
        <span className="wk-chip">{exerciseCountLabel(workout.exercises.length, copy, language)}</span>
        <span className="wk-chip">{formatPlural(language, copy.plan.setCount, setTotal(workout))}</span>
        {workout.dayOfWeek !== undefined && <span className="wk-chip">{dayName(workout.dayOfWeek, language)}</span>}
        <span className={badge.variant === 'neutral' && workout.status !== 'missed' ? 'wk-chip' : 'wk-chip wk-chip-status'}>{badge.label}</span>
      </div>
      <p className="wk-hero-week">{formatWeekRange(plan.weekStartDate, language)}</p>
      {action}
    </section>
  );
}
