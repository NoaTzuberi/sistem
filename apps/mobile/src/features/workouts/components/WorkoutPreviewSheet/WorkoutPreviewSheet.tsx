import { IconPlayerPlayFilled } from '@tabler/icons-react';
import { describeSetsShort, useCopy, useLanguage } from '@sistem/shared';
import { BottomSheet } from '../../../../components/common/BottomSheet/BottomSheet';
import { exerciseCountLabel } from '../../data/workoutDisplay';
import { exerciseWeightLabel, nameScript, workoutDayLabel, type PlannedWorkout } from '../../data/weekPlanDisplay';
import { workoutCopy } from '../../copy';
import './WorkoutPreviewSheet.css';

interface WorkoutPreviewSheetProps {
  /** The workout shown; null = closed. */
  planned: PlannedWorkout | null;
  /** A workout of next week: it can be looked at, not started yet. */
  isNextWeek: boolean;
  onClose: () => void;
  onStart: (planned: PlannedWorkout) => void;
  onViewLog: (logId: string) => void;
  isStarting: boolean;
  error: string | null;
}

/**
 * Every exercise of one workout, then the sticky action: start / resume (the existing start flow);
 * a done workout opens what she logged — repeating a done workout is not supported by the server.
 */
export function WorkoutPreviewSheet({ planned, isNextWeek, onClose, onStart, onViewLog, isStarting, error }: WorkoutPreviewSheetProps) {
  const copy = useCopy(workoutCopy);
  const language = useLanguage();
  const workout = planned?.workout;

  const footer = !planned || !workout ? null : workout.logId ? (
    <button type="button" className="preview-sheet-action" onClick={() => onViewLog(workout.logId!)}>
      {copy.list.viewLog}
    </button>
  ) : isNextWeek ? (
    <p className="preview-sheet-note">{copy.list.notStartableYet}</p>
  ) : (
    <>
      <button
        type="button"
        className="preview-sheet-action preview-sheet-start"
        onClick={() => onStart(planned)}
        disabled={isStarting}
        aria-busy={isStarting}
      >
        <IconPlayerPlayFilled size={16} aria-hidden="true" />
        {workout.inProgress ? copy.list.resumeWorkout : copy.list.startWorkout}
      </button>
      {error && (
        <p className="preview-sheet-error" role="alert">
          {error}
        </p>
      )}
    </>
  );

  return (
    <BottomSheet isOpen={planned !== null} onClose={onClose} labelledBy="preview-sheet-title" footer={footer}>
      {planned && workout && (
        <div className={planned.colorClass}>
          <div className="preview-sheet-head">
            <h2 className="preview-sheet-title" id="preview-sheet-title">
              <bdi className="display-name" {...nameScript(workout.title)}>
                {workout.title}
              </bdi>
            </h2>
            <p className="preview-sheet-meta">
              {exerciseCountLabel(workout.exercises.length, copy, language)} · {workoutDayLabel(workout, language, copy)}
            </p>
          </div>
          <ol className="preview-sheet-list">
            {workout.exercises.map((exercise, index) => {
              const weight = exerciseWeightLabel(exercise, language, copy);
              return (
                <li key={exercise.id} className="preview-sheet-exercise">
                  <span className="preview-sheet-number" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span className="preview-sheet-text">
                    <bdi className="preview-sheet-name" dir="ltr">
                      {exercise.exercise?.name ?? '—'}
                    </bdi>
                    {weight && <span className="preview-sheet-weight">{weight}</span>}
                  </span>
                  <span className="preview-sheet-target">{describeSetsShort(exercise.resolvedSets, language)}</span>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </BottomSheet>
  );
}
