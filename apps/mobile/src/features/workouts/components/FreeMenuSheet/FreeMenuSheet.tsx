import type { ReactNode } from 'react';
import { IconBarbell, IconRun, IconStopwatch } from '@tabler/icons-react';
import { useCopy } from '@sistem/shared';
import { BottomSheet } from '../../../../components/common/BottomSheet/BottomSheet';
import type { FreeMenuOption } from '../../hooks/useFreeMenu';
import { workoutCopy } from '../../copy';
import './FreeMenuSheet.css';

interface FreeMenuSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onPick: (option: FreeMenuOption) => void;
}

/** "אימון חופשי": a soft grouped list (as the photo source sheet) — free strength, interval timer, free run. */
export function FreeMenuSheet({ isOpen, onClose, onPick }: FreeMenuSheetProps) {
  const copy = useCopy(workoutCopy);
  const options: { id: FreeMenuOption; label: string; icon: ReactNode }[] = [
    { id: 'strength', label: copy.freeMenu.strength, icon: <IconBarbell size={18} /> },
    { id: 'timer', label: copy.freeMenu.timer, icon: <IconStopwatch size={18} /> },
    { id: 'run', label: copy.freeMenu.run, icon: <IconRun size={18} /> },
  ];

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} labelledBy="free-menu-title">
      <h2 className="free-menu-title display-title" id="free-menu-title">
        {copy.screen.freeWorkout}
      </h2>
      <ul className="free-menu-options">
        {options.map((option) => (
          <li key={option.id}>
            <button type="button" className="free-menu-option" onClick={() => onPick(option.id)}>
              <span className="free-menu-option-icon" aria-hidden="true">
                {option.icon}
              </span>
              {option.label}
            </button>
          </li>
        ))}
      </ul>
    </BottomSheet>
  );
}
