import { useState } from 'react';
import { IconDots } from '@tabler/icons-react';
import { sharedCopy, useCopy } from '@sistem/shared';
import { CoachSheet } from '../CoachSheet/CoachSheet';
import './TraineeMoreMenu.css';

interface TraineeMoreMenuProps {
  onEndCoaching: () => void;
}

/** The ⋯ on her page's stage: quiet actions (for now only "End coaching", in Cherry text). */
export function TraineeMoreMenu({ onEndCoaching }: TraineeMoreMenuProps) {
  const copy = useCopy(sharedCopy).coach.endCoaching;
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button type="button" className="coach-stage-round" aria-label={copy.moreActions} aria-haspopup="dialog" onClick={() => setIsOpen(true)}>
        <IconDots size={18} stroke={2.2} aria-hidden="true" />
      </button>
      <CoachSheet isOpen={isOpen} onClose={() => setIsOpen(false)} title={copy.moreActions}>
        <button
          type="button"
          className="trainee-more-end"
          onClick={() => {
            setIsOpen(false);
            onEndCoaching();
          }}
        >
          {copy.action}
        </button>
      </CoachSheet>
    </>
  );
}
