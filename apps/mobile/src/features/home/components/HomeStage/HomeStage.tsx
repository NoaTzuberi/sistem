import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { ActiveWorkoutRef, Language } from '@sistem/types';
import { dateFormat, dayName, fill, useCopy, useLanguage } from '@sistem/shared';
import { workoutPath } from '../../../../app/config/routes';
import { workoutCopy } from '../../../workouts/copy';
import { exerciseCountLabel } from '../../../workouts/data/workoutDisplay';
import { type StageState, initialsOf, isHebrewText, twoDigits } from '../../data/homeDisplay';
import { homeCopy } from '../../copy';
import { Kettlebell3D } from '../Kettlebell3D/Kettlebell3D';
import { TodayWorkoutHeadline } from '../TodayWorkoutHeadline/TodayWorkoutHeadline';
import { type WorkoutFact, WorkoutFacts } from '../WorkoutFacts/WorkoutFacts';
import { SlideToStart } from '../SlideToStart/SlideToStart';
import './HomeStage.css';

interface HomeStageProps {
  name: string;
  /** 'YYYY-MM-DD' in her zone, from the server; undefined while the week loads. */
  today?: string;
  stage: StageState | null;
  weekCount: { done: number; planned: number } | null;
  kettlebellWeight: number;
  activeLog: ActiveWorkoutRef | null;
  onStart: () => void;
  isStarting: boolean;
  startError: string | null;
  /** The week's loading / error line, shown on the stage until the week is there. */
  status?: ReactNode;
}

function todayLabel(today: string, language: Language): string {
  const date = new Date(`${today}T00:00:00Z`);
  const weekday = dateFormat(language, { timeZone: 'UTC', weekday: 'short' }).format(date);
  const dayMonth = dateFormat(language, { timeZone: 'UTC', day: 'numeric', month: 'long' }).format(date);
  return `${weekday} · ${dayMonth}`;
}

/** The full-bleed pink stage: greeting, the live kettlebell, today's workout and slide-to-start. */
export function HomeStage(props: HomeStageProps) {
  const { name, today, stage, weekCount, kettlebellWeight, activeLog, onStart, isStarting, startError, status } = props;
  const copy = useCopy(homeCopy);
  const workoutText = useCopy(workoutCopy);
  const language = useLanguage();
  const firstName = name.trim().split(' ')[0] ?? '';

  const weekFact: WorkoutFact[] = weekCount
    ? [{ id: 'week', value: `${weekCount.done}/${weekCount.planned}`, label: copy.stage.thisWeek }]
    : [];
  const next = stage && (stage.kind === 'workout' || stage.kind === 'rest') ? stage.next : null;
  const canSlide = stage?.kind === 'workout' || activeLog !== null;

  let kicker: string | null = null;
  let title: string | undefined;
  let facts: WorkoutFact[] = weekFact;
  if (stage?.kind === 'workout') {
    kicker = copy.todayWorkout;
    title = stage.next.workout.title;
    facts = [{ id: 'exercises', value: twoDigits(stage.next.workout.exercises.length), label: copy.stage.exercises }, ...weekFact];
  } else if (stage?.kind === 'rest') {
    kicker = copy.todayWorkout;
    title = copy.stage.restDay;
  } else if (activeLog) {
    // An open workout outside this week's plan still resumes from here.
    kicker = workoutText.status.inProgress;
    title = activeLog.workoutTitle;
  }

  const message =
    stage?.kind === 'noPlan' ? copy.noPlanThisWeek : stage?.kind === 'empty' ? copy.noWorkoutsInPlan : stage?.kind === 'finished' ? copy.allDone : null;

  return (
    <section className="home-stage" aria-labelledby="home-stage-greeting">
      <div className="home-stage-bar">
        <span className="home-stage-avatar" aria-hidden="true">
          {initialsOf(name)}
        </span>
        <div className="home-stage-hello">
          <p className="home-stage-greeting" id="home-stage-greeting">
            {fill(copy.greeting, { firstName })}
          </p>
          {today && <p className="home-stage-date">{todayLabel(today, language)}</p>}
        </div>
      </div>

      <Kettlebell3D weight={kettlebellWeight} />

      {status}
      {kicker && <TodayWorkoutHeadline kicker={kicker} title={title} />}
      {!kicker && message && (
        <p className="home-stage-message">{message}</p>
      )}

      {stage?.kind === 'rest' && next && (
        <Link className="home-stage-next" to={workoutPath(stage.plan.id, next.workout.id)}>
          <span className="home-stage-next-label">{copy.nextWorkout}</span>
          <bdi className={'home-stage-next-title' + (isHebrewText(next.workout.title) ? ' home-stage-next-title-he' : '')} dir="auto">
            {next.workout.title}
          </bdi>
          <span className="home-stage-next-meta">
            {[
              next.workout.dayOfWeek !== undefined ? dayName(next.workout.dayOfWeek, language) : null,
              exerciseCountLabel(next.workout.exercises.length, workoutText, language),
              next.workout.status === 'missed' ? workoutText.status.missed : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </Link>
      )}

      <WorkoutFacts facts={stage?.kind === 'workout' || stage?.kind === 'rest' || stage?.kind === 'finished' ? facts : []} label={copy.stage.facts} />

      {canSlide && (
        <SlideToStart
          label={activeLog ? fill(copy.resumeWorkout, { title: activeLog.workoutTitle }) : copy.stage.slideToStart}
          knobLabel={activeLog ? fill(copy.resumeWorkout, { title: activeLog.workoutTitle }) : copy.stage.startWorkout}
          onComplete={onStart}
          busy={isStarting}
        />
      )}
      {startError && (
        <p className="home-stage-error" role="alert">
          {startError}
        </p>
      )}
    </section>
  );
}
