import { IconListDetails, IconPlayerPlayFilled } from '@tabler/icons-react';
import { describeSetsShort, formatPlural, useCopy, useLanguage } from '@sistem/shared';
import { exerciseCountLabel } from '../../data/workoutDisplay';
import { nameScript, setTotal, workoutDayLabel, type PlannedWorkout } from '../../data/weekPlanDisplay';
import { workoutCopy } from '../../copy';
import { Eyebrow } from '../../../../components/common/Eyebrow/Eyebrow';
import { appCopy } from '../../../../copy';
import './UpNextCard.css';

/** Exercises listed on the card; the rest are "+N more" (all of them are in the preview sheet). */
const LISTED_EXERCISES = 3;

interface UpNextCardProps {
  /** The server's next workout; null = every workout of the week is done. */
  next: PlannedWorkout | null;
  onStart: () => void;
  onPreview: () => void;
  isStarting: boolean;
  error: string | null;
  /** Shown in the all-done state when free workouts are available. */
  onFreeWorkout?: () => void;
}

/**
 * The ink "up next" card: the next workout huge, its facts, the first exercises and the start button
 * (the existing start / resume flow). No duration: plans have none.
 */
export function UpNextCard({ next, onStart, onPreview, isStarting, error, onFreeWorkout }: UpNextCardProps) {
  const copy = useCopy(workoutCopy);
  const eyebrow = useCopy(appCopy).eyebrow;
  const language = useLanguage();

  if (!next) {
    return (
      <section className="up-next-card up-next-card-done workout-color-1" aria-live="polite">
        <p className="up-next-done-text">{copy.plan.allDone}</p>
        {onFreeWorkout && (
          <button type="button" className="up-next-done-link" onClick={onFreeWorkout}>
            {copy.screen.freeWorkout}
          </button>
        )}
      </section>
    );
  }

  const { workout, colorClass } = next;
  const listed = workout.exercises.slice(0, LISTED_EXERCISES);
  const more = workout.exercises.length - listed.length;

  return (
    <section className={`up-next-card ${colorClass}`} aria-labelledby="up-next-name">
      <div className="up-next-top">
        <span className="up-next-live">
          <span className="up-next-live-dot" aria-hidden="true" />
          {copy.plan.upNext}
        </span>
        <Eyebrow>{eyebrow.upNext}</Eyebrow>
        <span className="up-next-day">{workoutDayLabel(workout, language, copy)}</span>
      </div>

      <h2 className="up-next-name" id="up-next-name">
        <bdi className="display-name" {...nameScript(workout.title)}>
          {workout.title}
        </bdi>
      </h2>

      <p className="up-next-meta">
        <span>{exerciseCountLabel(workout.exercises.length, copy, language)}</span>
        <span>{formatPlural(language, copy.plan.setCount, setTotal(workout))}</span>
      </p>

      {listed.length > 0 && (
        <ol className="up-next-exercises">
          {listed.map((exercise, index) => (
            <li key={exercise.id} className="up-next-exercise">
              <span className="up-next-exercise-index" aria-hidden="true">
                {index + 1}
              </span>
              <bdi className="up-next-exercise-name" dir="ltr">
                {exercise.exercise?.name ?? '—'}
              </bdi>
              <span className="up-next-exercise-target">{describeSetsShort(exercise.resolvedSets, language)}</span>
            </li>
          ))}
          {more > 0 && <li className="up-next-more">{formatPlural(language, copy.plan.moreExercises, more)}</li>}
        </ol>
      )}

      <div className="up-next-actions">
        <button type="button" className="up-next-start" onClick={onStart} disabled={isStarting} aria-busy={isStarting}>
          <IconPlayerPlayFilled size={16} aria-hidden="true" />
          {workout.inProgress ? copy.list.resumeWorkout : copy.list.startWorkout}
        </button>
        <button type="button" className="up-next-preview" onClick={onPreview} aria-label={copy.plan.allExercises}>
          <IconListDetails size={20} stroke={2} aria-hidden="true" />
        </button>
      </div>
      {error && (
        <p className="up-next-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
