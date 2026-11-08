import { useCopy } from '@sistem/shared';
import type { MyCoaching } from '@sistem/types';
import { BottomSheet } from '../../../../components/common/BottomSheet/BottomSheet';
import { CoachCard } from '../CoachCard/CoachCard';
import { initialsOf } from '../../data/profileDisplay';
import { profileCopy } from '../../copy';
// The sheet title look is shared with the measurement sheet.
import '../MeasurementSheet/MeasurementSheet.css';
import './MyCoachSheet.css';

interface MyCoachSheetProps {
  coaching: MyCoaching;
  isOpen: boolean;
  onClose: () => void;
  /** "סיום הליווי" — the caller closes this sheet and opens the confirm. */
  onEnd: () => void;
  onToast: (text: string) => void;
}

/** Settings → "המאמנת שלי": her coach's card (photo, status, payment links) + a Cherry text action to end it. */
export function MyCoachSheet({ coaching, isOpen, onClose, onEnd, onToast }: MyCoachSheetProps) {
  const copy = useCopy(profileCopy).myCoach;
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} labelledBy="pf-my-coach-title" className="pf-sheet my-coach-sheet">
      <h2 className="pf-sheet-title" id="pf-my-coach-title">
        {copy.sheetTitle}
      </h2>
      <CoachCard
        coach={{ name: coaching.coachName, initials: initialsOf(coaching.coachName) }}
        avatar={coaching.coachAvatar ?? null}
        status={coaching.status}
        payment={coaching.payment ?? null}
        onToast={onToast}
      />
      <button type="button" className="my-coach-end" onClick={onEnd}>
        {copy.end}
      </button>
    </BottomSheet>
  );
}
