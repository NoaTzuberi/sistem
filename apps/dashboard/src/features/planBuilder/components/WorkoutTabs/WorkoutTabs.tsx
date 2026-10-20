import { dayName, fill, useCopy, useLanguage } from '@sistem/shared';
import { workoutSetCount } from '../../data/planStats';
import { workoutColorClass } from '../../data/workoutColors';
import { workoutTabId } from '../../data/workoutTabs';
import { useTabListKeys } from '../../hooks/useTabListKeys';
import type { CardioSession } from '@sistem/types';
import { CardioTab } from '../CardioTab/CardioTab';
import { WorkoutAddMenu } from '../WorkoutAddMenu/WorkoutAddMenu';
import type { DraftWorkout } from '../../types';
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
  onAdd: () => void;
  /** This week's cardio sessions (drafts too) and where each one opens. */
  cardioSessions: CardioSession[];
  cardioPath: (sessionId?: string) => string;
  onAddCardio: () => void;
}

/**
 * The week's workouts in plan order, one pill each, in the workout's own color; the selected one
 * is filled. Switching is instant — it is used all the time. A workout's day is only a label
 * here (none, or shared with another workout, is fine); it is chosen inside the workout.
 */
export function WorkoutTabs({ workouts, selectedKey, issueKeys, panelId, onSelect, onAdd, cardioSessions, cardioPath, onAddCardio }: WorkoutTabsProps) {
  const language = useLanguage();
  const copy = useCopy(planBuilderCopy);
  const handleKeyDown = useTabListKeys();

  return (
    <div className="workout-tabs">
      <div className="workout-tabs-list" role="tablist" aria-label={copy.workoutsOfWeek} aria-orientation="horizontal" onKeyDown={handleKeyDown}>
        {workouts.map((workout, index) => {
          const isSelected = workout.key === selectedKey;
          const counts = fill(copy.dayCounts, { exercises: workout.exercises.length, sets: workoutSetCount(workout) });
          return (
            <button
              key={workout.key}
              id={workoutTabId(workout.key)}
              className={`workout-tab ${workoutColorClass(index)}`}
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
                  {workout.dayOfWeek !== undefined ? `${dayName(workout.dayOfWeek, language)} · ${counts}` : counts}
                  {issueKeys.has(workout.key) && <span className="workout-tab-alert"> · {copy.workoutHasIssues}</span>}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {cardioSessions.map((session) => (
        <CardioTab key={session.id} session={session} to={cardioPath(session.id)} />
      ))}
      <WorkoutAddMenu onAddStrength={onAdd} onAddCardio={onAddCardio} />
    </div>
  );
}
