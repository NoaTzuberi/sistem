import type { ReactNode } from 'react';
import { IconPlayerPlayFilled, IconPlus, IconRotateClockwise2, IconTarget } from '@tabler/icons-react';
import { formatDate, useCopy, useLanguage } from '@sistem/shared';
import { BottomSheet } from '../../../../components/common/BottomSheet/BottomSheet';
import type { FreeWorkoutMode } from '../../data/freeWorkout';
import { nameScript } from '../../data/weekPlanDisplay';
import type { useFreeWorkout } from '../../hooks/useFreeWorkout';
import { MusclePicker } from '../MusclePicker/MusclePicker';
import { workoutCopy } from '../../copy';
import './FreeWorkoutSheet.css';

interface FreeWorkoutSheetProps {
  isOpen: boolean;
  onClose: () => void;
  free: ReturnType<typeof useFreeWorkout>;
}

/**
 * "Free workout": from scratch, repeat a past workout, or by muscle, then Start. Built ahead of the
 * server: Start calls the PROPOSED endpoint (see data/freeWorkout.ts).
 */
export function FreeWorkoutSheet({ isOpen, onClose, free }: FreeWorkoutSheetProps) {
  const copy = useCopy(workoutCopy);
  const language = useLanguage();

  const options: { mode: FreeWorkoutMode; title: string; text: string; icon: ReactNode; colorClass: string }[] = [
    { mode: 'scratch', title: copy.free.scratch, text: copy.free.scratchText, icon: <IconPlus size={22} stroke={2} />, colorClass: 'workout-color-1' },
    { mode: 'repeat', title: copy.free.repeat, text: copy.free.repeatText, icon: <IconRotateClockwise2 size={22} stroke={2} />, colorClass: 'workout-color-2' },
    { mode: 'muscle', title: copy.free.muscle, text: copy.free.muscleText, icon: <IconTarget size={22} stroke={2} />, colorClass: 'workout-color-3' },
  ];

  const footer = (
    <>
      <button
        type="button"
        className="free-sheet-start"
        onClick={() => void free.start()}
        disabled={!free.canStart || free.isStarting}
        aria-busy={free.isStarting}
      >
        <IconPlayerPlayFilled size={16} aria-hidden="true" />
        {copy.free.start}
      </button>
      {free.error && (
        <p className="free-sheet-error" role="alert">
          {free.error}
        </p>
      )}
    </>
  );

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} labelledBy="free-sheet-title" footer={footer}>
      <h2 className="free-sheet-title display-title" id="free-sheet-title">
        {copy.screen.freeWorkout}
      </h2>
      <p className="free-sheet-intro">{copy.free.intro}</p>

      <div className="free-sheet-options" role="radiogroup" aria-labelledby="free-sheet-title">
        {options.map((option) => (
          <button
            key={option.mode}
            type="button"
            role="radio"
            aria-checked={free.mode === option.mode}
            className={`free-sheet-option ${option.colorClass}`}
            onClick={() => free.setMode(option.mode)}
          >
            <span className="free-sheet-option-icon" aria-hidden="true">
              {option.icon}
            </span>
            <span className="free-sheet-option-text">
              <span className="free-sheet-option-title display-title">{option.title}</span>
              <span className="free-sheet-option-note">{option.text}</span>
            </span>
          </button>
        ))}
      </div>

      {free.mode === 'muscle' && <MusclePicker selected={free.muscles} onToggle={free.toggleMuscle} label={copy.free.musclesLabel} />}

      {free.mode === 'repeat' && (
        <div className="free-sheet-logs" role="radiogroup" aria-label={copy.free.pickLog}>
          {free.recentLogs === null && <p className="free-sheet-note">{copy.list.loading}</p>}
          {free.recentLogs?.length === 0 && <p className="free-sheet-note">{copy.free.noLogs}</p>}
          {free.recentLogs?.map((log) => (
            <button
              key={log.id}
              type="button"
              role="radio"
              aria-checked={free.fromLogId === log.id}
              className="free-sheet-log"
              onClick={() => free.setFromLogId(log.id)}
            >
              <bdi className="free-sheet-log-name display-name" {...nameScript(log.workoutTitle)}>
                {log.workoutTitle}
              </bdi>
              <span className="free-sheet-log-date">{formatDate(log.finishedAt ?? log.startedAt, language)}</span>
            </button>
          ))}
        </div>
      )}
    </BottomSheet>
  );
}
