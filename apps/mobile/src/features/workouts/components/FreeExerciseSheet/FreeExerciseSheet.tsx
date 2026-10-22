import { useState } from 'react';
import { IconPlus, IconSearch } from '@tabler/icons-react';
import type { ExerciseFacts } from '@sistem/types';
import { useCopy } from '@sistem/shared';
import { BottomSheet } from '../../../../components/common/BottomSheet/BottomSheet';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { useFreeExercisePicker } from '../../hooks/useFreeExercisePicker';
import { workoutCopy } from '../../copy';
import './FreeExerciseSheet.css';

interface FreeExerciseSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** Adds it on the server; resolves to an error line or null. */
  onPick: (exercise: ExerciseFacts) => Promise<string | null>;
}

/** "Add exercise" in a free workout: search the library (what fits her equipment), tap to add. */
export function FreeExerciseSheet({ isOpen, onClose, onPick }: FreeExerciseSheetProps) {
  const copy = useCopy(workoutCopy).free;
  const picker = useFreeExercisePicker(isOpen);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(exercise: ExerciseFacts) {
    setBusyId(exercise.id);
    setError(null);
    const problem = await onPick(exercise);
    setBusyId(null);
    if (problem) setError(problem);
    else {
      picker.reset();
      onClose();
    }
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} labelledBy="free-exercise-title" className="free-ex-sheet">
      <h2 className="free-ex-title" id="free-exercise-title">
        {copy.addExercise}
      </h2>
      <label className="free-ex-search">
        <IconSearch size={18} aria-hidden="true" />
        <span className="free-ex-search-label">{copy.searchLabel}</span>
        <input
          type="search"
          value={picker.query}
          placeholder={copy.searchPlaceholder}
          dir="auto"
          enterKeyHint="search"
          onChange={(event) => picker.setQuery(event.target.value)}
        />
      </label>
      {error && (
        <p className="free-ex-error" role="alert">
          {error}
        </p>
      )}
      {picker.error ? (
        <StateMessage onRetry={picker.retry}>{picker.error}</StateMessage>
      ) : picker.items === null ? (
        <StateMessage>{copy.searching}</StateMessage>
      ) : picker.items.length === 0 ? (
        <StateMessage>{copy.noResults}</StateMessage>
      ) : (
        <ul className="free-ex-list">
          {picker.items.map((exercise) => (
            <li key={exercise.id}>
              <button type="button" className="free-ex-row" onClick={() => void pick(exercise)} disabled={busyId !== null} aria-busy={busyId === exercise.id || undefined}>
                {/* Library names are never translated. */}
                <bdi className="free-ex-name" dir="auto">
                  {exercise.name}
                </bdi>
                <IconPlus size={18} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </BottomSheet>
  );
}
