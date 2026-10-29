import { type FormEvent, useId, useState } from 'react';
import { IconSend } from '@tabler/icons-react';
import { useCopy } from '@sistem/shared';
import { messagesCopy } from '../../copy';
import './MessageComposer.css';

/** The longest message the server takes. */
export const MAX_MESSAGE_LENGTH = 2000;

interface MessageComposerProps {
  /** True when it was sent (the field clears). */
  onSend: (text: string) => Promise<boolean>;
  isSending: boolean;
  sendError: boolean;
}

/** The thread's composer: a growing text field + the send button. Enter adds a line (phone keyboards). */
export function MessageComposer({ onSend, isSending, sendError }: MessageComposerProps) {
  const copy = useCopy(messagesCopy);
  const [text, setText] = useState('');
  const errorId = useId();
  const canSend = text.trim().length > 0 && !isSending;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSend) return;
    if (await onSend(text.trim())) setText('');
  }

  return (
    <form className="cm-composer" onSubmit={(event) => void handleSubmit(event)}>
      {sendError && (
        <p className="cm-composer-error" id={errorId} role="alert">
          {copy.sendError}
        </p>
      )}
      <div className="cm-composer-row">
        <textarea
          className="cm-composer-input"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={copy.placeholder}
          aria-label={copy.inputLabel}
          aria-describedby={sendError ? errorId : undefined}
          maxLength={MAX_MESSAGE_LENGTH}
          rows={1}
          dir="auto"
        />
        <button type="submit" className="cm-composer-send" disabled={!canSend} aria-label={copy.send}>
          <IconSend className="flip-rtl" size={20} stroke={2} aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}
