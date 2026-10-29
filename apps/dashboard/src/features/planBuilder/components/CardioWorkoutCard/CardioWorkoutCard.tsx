import type { PlanIssue } from '@sistem/types';
import { cardioMinutes, cardioTotals, fill, formatClock, useCopy } from '@sistem/shared';
import { CardioEditor } from '../../../cardio/components/CardioEditor/CardioEditor';
import { cardioCopy } from '../../../cardio/copy';
import type { DraftWorkout } from '../../types';
import { workoutLetter } from '../../data/workoutLetters';
import { WorkoutHero } from '../WorkoutHero/WorkoutHero';
import { planBuilderCopy } from '../../copy';
import './CardioWorkoutCard.css';

interface CardioWorkoutCardProps {
  workout: DraftWorkout;
  index: number;
  count: number;
  /** A workout just added: its name field takes the focus. */
  autoFocusTitle?: boolean;
  /** Problems the server reported for this workout. */
  issues: PlanIssue[];
  onChange: (workout: DraftWorkout) => void;
  onMove: (direction: -1 | 1) => void;
  onDuplicate: () => void;
  /** Deletes this workout only — at once, the page offers "Undo". */
  onRemove: () => void;
}

/**
 * The selected cardio workout: the same hero as a strength workout (name, day, note, ⋯ menu) with its
 * own three numbers, then the cardio editor. It is saved and published with the plan, like any workout.
 */
export function CardioWorkoutCard({ workout, index, count, autoFocusTitle, issues, onChange, onMove, onDuplicate, onRemove }: CardioWorkoutCardProps) {
  const copy = useCopy(planBuilderCopy);
  const cardioText = useCopy(cardioCopy);
  const title = workout.title.trim() || fill(copy.workoutPlaceholder, { n: index + 1 });
  const cardio = workout.cardio;
  if (!cardio) return null;
  const totals = cardioTotals(cardio.steps);

  return (
    <section className="workout-card cardio-workout-card workout-kind-cardio" aria-label={title}>
      <WorkoutHero
        workout={workout}
        config={null}
        type={undefined}
        letter={workoutLetter(index)}
        autoFocusTitle={autoFocusTitle}
        defaultTitle={fill(copy.workoutPlaceholder, { n: index + 1 })}
        coveredGroups={[]}
        menuItems={[
          { id: 'up', label: fill(copy.moveUpNamed, { name: title }), disabled: index === 0, onSelect: () => onMove(-1) },
          { id: 'down', label: fill(copy.moveDownNamed, { name: title }), disabled: index === count - 1, onSelect: () => onMove(1) },
          { id: 'duplicate', label: copy.duplicate, onSelect: onDuplicate },
          { id: 'delete', label: copy.deleteWorkout, danger: true, onSelect: onRemove },
        ]}
        onDelete={onRemove}
        deleteLabel={fill(copy.deleteWorkoutNamed, { name: title })}
        stats={[
          { id: 'total', label: cardioText.total, value: `${cardioMinutes(totals.totalSec)}′` },
          { id: 'high', label: cardioText.high, value: formatClock(totals.highIntensitySec) },
          { id: 'rounds', label: cardioText.rounds, value: totals.rounds > 0 ? String(totals.rounds) : '—' },
        ]}
        onChange={onChange}
      />
      {issues.length > 0 && (
        <ul className="cardio-workout-issues">
          {issues.map((issue) => (
            <li key={issue.message} role="alert">
              {issue.message}
            </li>
          ))}
        </ul>
      )}
      <CardioEditor workoutKey={workout.key} cardio={cardio} onChange={(next) => onChange({ ...workout, cardio: next })} />
    </section>
  );
}
