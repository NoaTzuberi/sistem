import { useCallback, useState } from 'react';
import { getActiveLanguage } from '@sistem/shared';
import { useCopyText } from '../../profile/hooks/useCopyText';
import { coachCopy } from '../copy';

/**
 * Her details sheet: open / close, and copying her email. The value goes to the clipboard only —
 * never to a log or the server.
 */
export function useTraineeDetailsSheet(showToast: (message: string) => void) {
  const [isOpen, setIsOpen] = useState(false);
  const copyText = useCopyText();
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const copyEmail = useCallback(
    async (email: string) => {
      const copied = await copyText(email);
      const copy = coachCopy[getActiveLanguage()].details;
      showToast(copied ? copy.copied : copy.copyFailed);
    },
    [copyText, showToast],
  );
  return { isOpen, open, close, copyEmail };
}

export type TraineeDetailsSheetState = ReturnType<typeof useTraineeDetailsSheet>;
