import { useId } from 'react';
import { Link } from 'react-router-dom';
import { describeSendIncludes, fill, formatNumber, isolateNameToken, SEND_DEFAULT_MAX, SEND_MESSAGE_MAX, sharedCopy, useCopy, useLanguage } from '@sistem/shared';
import type { SendMessageMode, SendNote } from '@sistem/shared';
import { ROUTES } from '../../../../app/config/routes';
import { Icon } from '../../../../components/common/Icon/Icon';
import { SegmentedControl } from '../../../../components/common/SegmentedControl/SegmentedControl';
import { Switch } from '../../../../components/common/Switch/Switch';
import './SendNoteSection.css';

/**
 * The send sheet's message + tip. With a default message: "my default" (editable for this send,
 * "save as default" once edited) | "new message" (+ "save as my default"). Without one: the box,
 * the tick and a link to Settings. The fixed tip: a switch (only when one exists). Last, the line
 * saying what she will get.
 */
export function SendNoteSection({ note }: { note: SendNote }) {
  const copy = useCopy(sharedCopy).sendNote;
  const language = useLanguage();
  const titleId = useId();
  const hintId = useId();
  const { state } = note;
  const isDefault = note.hasDefaultMessage && state.mode === 'default';
  const text = isDefault ? state.defaultText : state.newText;
  const includes = describeSendIncludes(note.includes, { message: copy.previewMessage, tip: copy.previewTip });
  const tooLongForDefault = !isDefault && text.trim().length > SEND_DEFAULT_MAX.message;

  return (
    <div className="send-note-section">
      <section className="send-note-section-block" aria-labelledby={titleId}>
        <h3 className="send-note-section-title" id={titleId}>
          {copy.messageTitle}
        </h3>
        {note.hasDefaultMessage && (
          <SegmentedControl<SendMessageMode>
            block
            label={copy.modeLabel}
            options={[
              { value: 'default', label: copy.modeDefault },
              { value: 'new', label: copy.modeNew },
            ]}
            value={state.mode}
            onChange={note.setMode}
          />
        )}
        <textarea
          className="send-note-section-input"
          aria-labelledby={titleId}
          aria-describedby={hintId}
          // Empty: the page's direction, so the placeholder reads right (auto would fall back to ltr).
          dir={text ? 'auto' : undefined}
          rows={3}
          maxLength={SEND_MESSAGE_MAX}
          placeholder={isDefault ? undefined : copy.newPlaceholder}
          value={text}
          onChange={(event) => note.editMessage(event.target.value)}
        />
        <div className="send-note-section-meta">
          <span id={hintId}>{isolateNameToken(copy.nameHint)}</span>
          <span className="send-note-section-count">
            <bdi>{fill(copy.count, { count: formatNumber(text.length, language), max: formatNumber(SEND_MESSAGE_MAX, language) })}</bdi>
          </span>
        </div>

        {isDefault ? (
          (note.canUpdateDefault || note.isUpdating || note.justSaved) && (
            <button
              className="send-note-section-link"
              type="button"
              disabled={note.isUpdating || note.justSaved}
              data-saved={note.justSaved || undefined}
              onClick={() => void note.updateDefault()}
            >
              {note.isUpdating ? copy.updatingDefault : note.justSaved ? copy.defaultSaved : copy.updateDefault}
              {note.justSaved && <Icon name="check" size="sm" />}
            </button>
          )
        ) : (
          <label className="send-note-section-check" data-disabled={!note.canSaveNewAsDefault || undefined}>
            <input
              type="checkbox"
              checked={state.saveNewAsDefault && note.canSaveNewAsDefault}
              disabled={!note.canSaveNewAsDefault}
              onChange={(event) => note.setSaveNewAsDefault(event.target.checked)}
            />
            {copy.saveAsDefault[note.kind]}
          </label>
        )}
        {tooLongForDefault && <p className="send-note-section-note">{fill(copy.defaultTooLong, { max: formatNumber(SEND_DEFAULT_MAX.message, language) })}</p>}
        {!note.hasDefaultMessage && (
          <Link className="send-note-section-link" to={ROUTES.SETTINGS}>
            {copy.setUpDefault}
          </Link>
        )}
      </section>

      {note.hasTip && (
        <section className="send-note-section-tip">
          <Switch checked={state.attachTip} onChange={note.setAttachTip} label={copy.attachTip} />
          {state.attachTip && (
            <p className="send-note-section-tip-text" dir="auto">
              <Icon name="bulb" size="sm" className="send-note-section-tip-icon" />
              <span>{note.defaults.tip}</span>
            </p>
          )}
        </section>
      )}

      <p className="send-note-section-preview" aria-live="polite">
        <span className="send-note-section-preview-label">{copy.previewLabel}</span> {includes ?? copy.previewNone}
      </p>
    </div>
  );
}
