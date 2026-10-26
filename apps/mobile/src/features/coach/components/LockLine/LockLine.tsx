import { IconLock } from '@tabler/icons-react';
import { useCopy } from '@sistem/shared';
import { coachCopy } from '../../copy';
import './LockLine.css';

/** "פרטי · רק את והיא" under her private photos. */
export function LockLine() {
  const copy = useCopy(coachCopy);
  return (
    <p className="lock-line">
      <IconLock size={12} aria-hidden="true" />
      {copy.detail.lock}
    </p>
  );
}
