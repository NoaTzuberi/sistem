import { useCopy } from '@sistem/shared';
import { nutritionCopy } from '../../copy';
import type { SendNote as SendNoteState } from '../../hooks/useSendNote';
import { SendNoteField } from '../SendNoteField/SendNoteField';
import './SendNote.css';

/** The send sheet's body: her message, the coach's tip, and one line saying what she will get. */
export function SendNote({ note }: { note: SendNoteState }) {
  const copy = useCopy(nutritionCopy).send;
  const parts = [note.fields.message.text.trim() && copy.previewMessage, note.fields.tip.text.trim() && copy.previewTip].filter(Boolean);
  return (
    <div className="send-note">
      <SendNoteField id="message" note={note} />
      <SendNoteField id="tip" note={note} />
      <p className="send-note-preview" aria-live="polite">
        <span className="send-note-preview-label">{copy.previewLabel}</span> {parts.length > 0 ? parts.join(' + ') : copy.previewNone}
      </p>
    </div>
  );
}
