import { useCallback, useState } from 'react';
import { sendTraineeMessage } from '../../../services/coach/coachConnectService';

export interface MessageRecipient {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

/** The quick message sheet: who it is to, the text, and sending (the server checks the coaching + rate limit). */
export function useQuickMessage(onSent: (recipient: MessageRecipient) => void) {
  const [recipient, setRecipient] = useState<MessageRecipient | null>(null);
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [hasError, setHasError] = useState(false);

  const open = useCallback((next: MessageRecipient) => {
    setRecipient(next);
    setText('');
    setHasError(false);
  }, []);

  const close = useCallback(() => {
    if (!isSending) setRecipient(null);
  }, [isSending]);

  const send = useCallback(async () => {
    if (!recipient || !text.trim()) return;
    setIsSending(true);
    setHasError(false);
    try {
      await sendTraineeMessage(recipient.id, text.trim());
      setRecipient(null);
      onSent(recipient);
    } catch {
      setHasError(true);
    } finally {
      setIsSending(false);
    }
  }, [recipient, text, onSent]);

  return { recipient, open, close, text, setText, send, isSending, hasError };
}
