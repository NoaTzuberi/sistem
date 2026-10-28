import { fill, sharedCopy, useCopy } from '@sistem/shared';
import { CoachSheet } from '../CoachSheet/CoachSheet';
import { SheetButton, SheetButtonRow } from '../SheetButton/SheetButton';
import './EndCoachingSheet.css';

interface EndCoachingSheetProps {
  name: string;
  isOpen: boolean;
  isEnding: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/** "לסיים את הליווי עם <name>?" — what happens, then Cherry "סיום ליווי" / "ביטול". */
export function EndCoachingSheet({ name, isOpen, isEnding, error, onConfirm, onCancel }: EndCoachingSheetProps) {
  const copy = useCopy(sharedCopy).coach.endCoaching;
  return (
    <CoachSheet isOpen={isOpen} onClose={onCancel} title={fill(copy.title, { name })} subtitle={fill(copy.explanation, { name })}>
      {error && (
        <p className="end-coaching-error" role="alert">
          {error}
        </p>
      )}
      <SheetButtonRow>
        <SheetButton variant="danger" onClick={onConfirm} disabled={isEnding} aria-busy={isEnding || undefined}>
          {copy.confirm}
        </SheetButton>
        <SheetButton onClick={onCancel} disabled={isEnding}>
          {copy.cancel}
        </SheetButton>
      </SheetButtonRow>
    </CoachSheet>
  );
}
