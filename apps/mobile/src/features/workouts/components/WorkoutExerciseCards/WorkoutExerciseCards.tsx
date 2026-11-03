import type { PlanExercise } from '@sistem/types';
import { describeInterval, describeTargets, fill, sharedCopy, useCopy, useLanguage } from '@sistem/shared';
import { cardNumber, groupExerciseCards } from '../../data/exerciseCards';
import { formatRest } from '../../data/workoutDisplay';
import { workoutCopy } from '../../copy';
import './WorkoutExerciseCards.css';

interface WorkoutExerciseCardsProps {
  exercises: PlanExercise[];
}

function ExerciseRow({ exercise, number }: { exercise: PlanExercise; number: number }) {
  const shared = useCopy(sharedCopy);
  const language = useLanguage();
  const interval = exercise.interval ? describeInterval(exercise, language) : null;
  return (
    <div className="wk-ex">
      <span className="wk-ex-index" aria-hidden="true">
        {cardNumber(number)}
      </span>
      <span className="wk-ex-text">
        {/* Exercise names are the imported English facts for now (known issue). */}
        <bdi className="wk-ex-name">{exercise.exercise?.name ?? shared.log.exercise}</bdi>
        {interval && <span className="wk-ex-sub">{interval}</span>}
        {/* The rest in the player's short form (1′, 45″). */}
        {describeTargets(exercise.resolvedSets, language, formatRest).map((line) => (
          <span key={line} className="wk-ex-sub">
            {line}
          </span>
        ))}
        {/* The coach's notes are the instructions the trainee sees (PRD §5.2). */}
        {exercise.notes && (
          <span className="wk-ex-notes" dir="auto">
            {exercise.notes}
          </span>
        )}
      </span>
    </div>
  );
}

/** The workout's exercises as white cards; a superset shares one card (pink side line + its chip). */
export function WorkoutExerciseCards({ exercises }: WorkoutExerciseCardsProps) {
  const copy = useCopy(workoutCopy);
  return (
    <ul className="wk-ex-list">
      {groupExerciseCards(exercises).map((group) => (
        <li key={group.items[0].exercise.id} className={group.superset ? 'wk-ex-card wk-ex-superset' : 'wk-ex-card'}>
          {group.superset && <span className="wk-ex-chip">{fill(copy.session.supersetLabel, { group: group.superset })}</span>}
          {group.items.map((item) => (
            <ExerciseRow key={item.exercise.id} exercise={item.exercise} number={item.number} />
          ))}
        </li>
      ))}
    </ul>
  );
}
