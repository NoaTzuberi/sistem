import type { PlanExercise } from '@sistem/types';
import { describeInterval, describeTargets, fill, sharedCopy, useCopy, useLanguage } from '@sistem/shared';
import { workoutCopy } from '../../copy';
import './PlanExerciseList.css';

interface PlanExerciseListProps {
  exercises: PlanExercise[];
}

/** The exercises of one planned workout, read-only — used by the trainee and by coach mode. */
export function PlanExerciseList({ exercises }: PlanExerciseListProps) {
  const shared = useCopy(sharedCopy);
  const copy = useCopy(workoutCopy);
  const language = useLanguage();
  return (
    <ul className="plan-exercises">
      {exercises.map((exercise) => (
        <li key={exercise.id} className="plan-exercise">
          <span className="plan-exercise-name">
            {/* Exercise names are the imported English facts for now (known issue). */}
            <bdi>{exercise.exercise?.name ?? shared.log.exercise}</bdi>
            {exercise.supersetGroup && (
              <span className="plan-exercise-superset-label">
                {' · '}
                {fill(copy.session.supersetLabel, { group: exercise.supersetGroup })}
              </span>
            )}
          </span>
          {exercise.interval && <span className="plan-exercise-interval">{describeInterval(exercise, language)}</span>}
          {describeTargets(exercise.resolvedSets, language).map((line) => (
            <span key={line} className="plan-exercise-target">
              {line}
            </span>
          ))}
          {/* The coach's notes are the instructions the trainee sees (PRD §5.2). */}
          {exercise.notes && (
            <span className="plan-exercise-notes" dir="auto">
              {exercise.notes}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
