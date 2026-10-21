import { cardioMinutesLabel, cardioTotals, dayName, fill, useCopy, useLanguage } from '@sistem/shared';
import { Icon } from '../../../../components/common/Icon/Icon';
import { workoutSetCount } from '../../data/planStats';
import { workoutColorClass } from '../../data/workoutColors';
import { workoutTabId } from '../../data/workoutTabs';
import { useTabListKeys } from '../../hooks/useTabListKeys';
import type { DraftWorkout } from '../../types';
import { AddWorkoutMenu } from '../AddWorkoutMenu/AddWorkoutMenu';
import { planBuilderCopy } from '../../copy';
import './WorkoutTabs.css';

interface WorkoutTabsProps {
  workouts: DraftWorkout[];
  selectedKey: string | undefined;
  /** Workouts (by key) the server reported a problem in. */
  issueKeys: ReadonlySet<string>;
  /** The id of the panel the selected tab controls. */
  panelId: string;
  onSelect: (workoutKey: string) => void;
  onAddStrength: () => void;
  onAddCardio: () => void;
}

/**
 * The week's workouts in plan order, one pill each, in the workout's own color (a cardio workout:
 * the cardio purple, a small pulse icon and its minutes); the selected one is filled. Switching is
 * instant — it is used all the time. A workout's day is only a label here; it is chosen inside it.
 */
export function WorkoutTabs({ workouts, selectedKey, issueKeys, panelId, onSelect, onAddStrength, onAddCardio }: WorkoutTabsProps) {
  const language = useLanguage();
  const copy = useCopy(planBuilderCopy);
  const handleKeyDown = useTabListKeys();

  return (
    <div className="workout-tabs">
      <div className="workout-tabs-list" role="tablist" aria-label={copy.workoutsOfWeek} aria-orientation="horizontal" onKeyDown={handleKeyDown}>
        {workouts.map((workout, index) => {
          const isSelected = workout.key === selectedKey;
          const isCardio = workout.kind === 'cardio' && workout.cardio !== undefined;
          const counts =
            isCardio && workout.cardio
              ? cardioMinutesLabel(cardioTotals(workout.cardio.steps).totalSec, language)
              : fill(copy.dayCounts, { exercises: workout.exercises.length, sets: workoutSetCount(workout) });
          return (
            <button
              key={workout.key}
              id={workoutTabId(workout.key)}
              className={`workout-tab ${isCardio ? 'workout-kind-cardio' : workoutColorClass(index)}`}
              type="button"
              role="tab"
              data-selects=""
              aria-selected={isSelected}
              aria-controls={isSelected ? panelId : undefined}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onSelect(workout.key)}
            >
              <span className="workout-tab-dot" aria-hidden="true" />
              <span className="workout-tab-text">
                <bdi className="workout-tab-name">{workout.title.trim() || fill(copy.workoutPlaceholder, { n: index + 1 })}</bdi>
                <span className="workout-tab-meta">
                  {isCardio && <Icon name="pulse" size="sm" className="workout-tab-kind" />}
                  {workout.dayOfWeek !== undefined ? `${dayName(workout.dayOfWeek, language)} · ${counts}` : counts}
                  {issueKeys.has(workout.key) && <span className="workout-tab-alert"> · {copy.workoutHasIssues}</span>}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <AddWorkoutMenu onAddStrength={onAddStrength} onAddCardio={onAddCardio} />
    </div>
  );
}
