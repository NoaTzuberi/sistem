import { useCallback, useEffect, useState } from 'react';
import type { CoachNoteId } from '@sistem/types';
import { thankCoach } from '../../../services/notifications/notificationsService';

type ThanksState = 'idle' | 'sending' | 'sent' | 'failed';

const STORAGE_PREFIX = 'sistem.coachThanks.';

// "Sent" is remembered on this device only, so the chip stays "sent" after a reload. The server
// keeps one notification per note anyway, so a second tap elsewhere never thanks twice.
function readSent(key: string): boolean {
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + key) === '1';
  } catch {
    return false;
  }
}

function storeSent(key: string): void {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, '1');
  } catch {
    // Private mode: the chip just forgets after a reload.
  }
}

/** "👍 Thanks!" under the coach's note → POST /notifications/thanks (her coach gets a notification). */
export function useCoachThanks(note: { id: CoachNoteId; key: string } | null) {
  const key = note?.key ?? null;
  const [state, setState] = useState<ThanksState>(() => (key && readSent(key) ? 'sent' : 'idle'));

  useEffect(() => {
    setState(key && readSent(key) ? 'sent' : 'idle');
  }, [key]);

  const send = useCallback(() => {
    if (!note || state === 'sending' || state === 'sent') return;
    setState('sending');
    thankCoach(note.id)
      .then(() => {
        storeSent(note.key);
        setState('sent');
      })
      .catch(() => setState('failed'));
  }, [note, state]);

  return { state, send };
}
