import { useCopy } from '@sistem/shared';
import { useState } from 'react';
import { IconBulb } from '@tabler/icons-react';
import { workoutCopy } from '../../copy';
import './PlayerTip.css';

// "Don't show again" is remembered on this phone only (a per-device convenience). Same key as the
// old Focus tip, so a trainee who hid it keeps it hidden.
const HIDE_KEY = 'sistem.focusTip.hidden';

function isHidden(): boolean {
  try {
    return localStorage.getItem(HIDE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * The gentle tip at the start of a fresh workout: turn on Focus / Do Not Disturb (PRD §14, web
 * version; the native parts come with Capacitor in Phase 5b). A soft card, two text buttons.
 */
export function PlayerTip() {
  const copy = useCopy(workoutCopy);
  const [isOpen, setIsOpen] = useState(() => !isHidden());
  if (!isOpen) return null;

  function hideForGood() {
    try {
      localStorage.setItem(HIDE_KEY, '1');
    } catch {
      // Storage blocked: it just shows again next time.
    }
    setIsOpen(false);
  }

  return (
    <aside className="wp-tip" role="note">
      <IconBulb className="wp-tip-icon" size={18} stroke={2} aria-hidden="true" />
      <div className="wp-tip-body">
        <p className="wp-tip-text">{copy.focusTip.text}</p>
        <div className="wp-tip-actions">
          <button type="button" className="wp-tip-button" onClick={() => setIsOpen(false)}>
            {copy.focusTip.gotIt}
          </button>
          <button type="button" className="wp-tip-button wp-tip-button-quiet" onClick={hideForGood}>
            {copy.focusTip.dontShowAgain}
          </button>
        </div>
      </div>
    </aside>
  );
}
