import { useId } from 'react';
import { fill, formatNumber, useCopy, useLanguage } from '@sistem/shared';
import { Switch } from '../../../../components/common/Switch/Switch';
import { nutritionCopy } from '../../copy';
import { DEFAULT_MAX, SEND_MAX } from '../../data/sendNote';
import type { NoteField, NoteFieldId } from '../../data/sendNote';
import type { SendNote } from '../../hooks/useSendNote';
import './SendNoteField.css';

interface SendNoteFieldProps {
  id: NoteFieldId;
  note: SendNote;
}

/**
 * One section of the send sheet (her message, or the coach's tip). With a saved default: a switch —
 * on = the default, editable for this send + "update the default"; off = a new text + "save as my
 * default". Without one: just the new text + the tick.
 */
export function SendNoteField({ id, note }: SendNoteFieldProps) {
  const language = useLanguage();
  const copy = useCopy(nutritionCopy).send;
  const inputId = useId();
  const hintId = useId();
  const field: NoteField = note.fields[id];
  const defaultText = note.defaults[id];
  const isMessage = id === 'message';
  const max = SEND_MAX[id];
  const overDefaultMax = field.text.trim().length > DEFAULT_MAX[id];
  const canSave = note.canSave(id);

  return (
    <section className="send-note-field" aria-labelledby={`${inputId}-title`}>
      <h3 className="send-note-field-title" id={`${inputId}-title`}>
        {isMessage ? copy.messageTitle : copy.tipTitle}
      </h3>
      {defaultText && (
        <Switch
          className="send-note-field-switch"
          checked={field.useDefault}
          onChange={(on) => note.toggle(id, on)}
          label={isMessage ? copy.messageToggle : copy.tipToggle}
        />
      )}
      <textarea
        className="send-note-field-input"
        id={inputId}
        aria-labelledby={`${inputId}-title`}
        aria-describedby={hintId}
        // Empty: the page's direction, so the placeholder reads right (auto would fall back to ltr).
        dir={field.text ? 'auto' : undefined}
        rows={isMessage ? 4 : 2}
        maxLength={max}
        placeholder={isMessage ? copy.messagePlaceholder : copy.tipPlaceholder}
        value={field.text}
        onChange={(event) => note.edit(id, event.target.value.slice(0, max))}
      />
      <div className="send-note-field-meta">
        <span className="send-note-field-hint" id={hintId}>
          {copy.nameHint}
        </span>
        <span className="send-note-field-count" aria-live="polite">
          <bdi>{fill(copy.count, { count: formatNumber(field.text.length, language), max: formatNumber(max, language) })}</bdi>
        </span>
      </div>

      {field.useDefault ? (
        (canSave || note.savingId === id || note.savedId === id) && (
          <button className="send-note-field-link" type="button" disabled={note.savingId === id} onClick={() => void note.updateDefault(id)}>
            {note.savingId === id ? copy.updatingDefault : note.savedId === id ? copy.defaultUpdated : copy.updateDefault}
          </button>
        )
      ) : (
        <label className="send-note-field-check" data-disabled={!canSave || undefined}>
          <input type="checkbox" checked={field.saveAsDefault && canSave} disabled={!canSave} onChange={(event) => note.tickSaveAsDefault(id, event.target.checked)} />
          {isMessage ? copy.messageSaveAsDefault : copy.tipSaveAsDefault}
        </label>
      )}
      {overDefaultMax && <p className="send-note-field-note">{fill(copy.defaultTooLong, { max: formatNumber(DEFAULT_MAX[id], language) })}</p>}
    </section>
  );
}
