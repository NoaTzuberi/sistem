import { sharedCopy, useCopy } from '@sistem/shared';
import { FREE_WORKOUT_MUSCLES, type FreeWorkoutMuscle } from '../../data/freeWorkout';
import './MusclePicker.css';

interface MusclePickerProps {
  selected: FreeWorkoutMuscle[];
  onToggle: (muscle: FreeWorkoutMuscle) => void;
  label: string;
}

/** Multi-select muscle chips — the onboarding muscle-focus ids and their labels. */
export function MusclePicker({ selected, onToggle, label }: MusclePickerProps) {
  const shared = useCopy(sharedCopy);
  return (
    <div className="muscle-picker" role="group" aria-label={label}>
      {FREE_WORKOUT_MUSCLES.map((muscle) => (
        <button
          key={muscle}
          type="button"
          className="muscle-picker-chip"
          aria-pressed={selected.includes(muscle)}
          onClick={() => onToggle(muscle)}
        >
          {shared.onboardingOptions.muscleFocus[muscle]}
        </button>
      ))}
    </div>
  );
}
