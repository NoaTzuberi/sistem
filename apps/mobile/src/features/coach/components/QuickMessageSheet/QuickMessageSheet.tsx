import { useCopy } from '@sistem/shared';
import { messagesCopy } from '../../../messages/copy';
import { MAX_MESSAGE_LENGTH } from '../../../messages/components/MessageComposer/MessageComposer';
import { coachCopy } from '../../copy';
import type { useQuickMessage } from '../../hooks/useQuickMessage';
import { CoachAvatar } from '../CoachAvatar/CoachAvatar';
import { CoachSheet } from '../CoachSheet/CoachSheet';
import { SheetButton, SheetButtonRow } from '../SheetButton/SheetButton';
import './QuickMessageSheet.css';

/** "הודעה": to whom, the ready messages (a tap fills the text), the text, "ביטול" / "שליחה". */
export function QuickMessageSheet({ quick }: { quick: ReturnType<typeof useQuickMessage> }) {
  const copy = useCopy(coachCopy).messages;
  const thread = useCopy(messagesCopy);
  const { recipient } = quick;

  return (
    <CoachSheet isOpen={recipient !== null} onClose={quick.close} title={copy.quickTitle}>
      {recipient && (
        <>
          <div className="cm-quick-to">
            <CoachAvatar name={recipient.name} seed={recipient.id} photoUrl={recipient.avatarUrl} />
            <bdi className="cm-quick-name display-title">{recipient.name}</bdi>
          </div>
          <div className="cm-quick-templates" role="group" aria-label={copy.templatesLabel}>
            {copy.templates.map((template) => (
              <button
                key={template}
                type="button"
                className="cm-quick-template"
                aria-pressed={quick.text === template}
                onClick={() => quick.setText(template)}
              >
                {template}
              </button>
            ))}
          </div>
          <textarea
            className="cm-quick-text"
            value={quick.text}
            onChange={(event) => quick.setText(event.target.value)}
            placeholder={thread.placeholder}
            aria-label={thread.inputLabel}
            maxLength={MAX_MESSAGE_LENGTH}
            dir="auto"
          />
          {quick.hasError && (
            <p className="cm-quick-error" role="alert">
              {thread.sendError}
            </p>
          )}
          <SheetButtonRow>
            <SheetButton onClick={quick.close} disabled={quick.isSending}>
              {copy.cancel}
            </SheetButton>
            <SheetButton variant="primary" onClick={() => void quick.send()} disabled={!quick.text.trim() || quick.isSending} aria-busy={quick.isSending}>
              {copy.send}
            </SheetButton>
          </SheetButtonRow>
        </>
      )}
    </CoachSheet>
  );
}
