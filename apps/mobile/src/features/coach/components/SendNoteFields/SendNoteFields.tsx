import { useId } from 'react';
import { IconBulb, IconCheck } from '@tabler/icons-react';
import { describeSendIncludes, fill, formatNumber, isolateNameToken, SEND_DEFAULT_MAX, SEND_MESSAGE_MAX, sharedCopy, useCopy, useLanguage } from '@sistem/shared';
import type { SendMessageMode, SendNote } from '@sistem/shared';
import { CardioSwitch } from '../../../cardio/components/CardioSwitch/CardioSwitch';
import { SegmentedControl } from '../../../profile/components/SegmentedControl/SegmentedControl';
import { dashboardLinks } from '../../data/dashboardLinks';
import './SendNoteFields.css';

/**
 * Coach mode's publish sheet: the message (my default | a new one), the fixed tip switch and what
 * she will get — the same rules as the dashboard sheet. No default yet: a link to the dashboard's
 * Settings (coach mode has no settings screen for it).
 */
export function SendNoteFields({ note }: { note: SendNote }) {
  const copy = useCopy(sharedCopy).sendNote;
  const language = useLanguage();
  const titleId = useId();
  const hintId = useId();
  const { state } = note;
  const isDefault = note.hasDefaultMessage && state.mode === 'default';
  const text = isDefault ? state.defaultText : state.newText;
  const includes = describeSendIncludes(note.includes, { message: copy.previewMessage, tip: copy.previewTip });
  const settingsUrl = dashboardLinks.settings();

  return (
    <div className="send-note-fields">
      <section className="send-note-fields-block" aria-labelledby={titleId}>
        <h3 className="send-note-fields-title" id={titleId}>
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
          className="send-note-fields-input"
          aria-labelledby={titleId}
          aria-describedby={hintId}
          dir={text ? 'auto' : undefined}
          rows={3}
          maxLength={SEND_MESSAGE_MAX}
          placeholder={isDefault ? undefined : copy.newPlaceholder}
          value={text}
          onChange={(event) => note.editMessage(event.target.value)}
        />
        <div className="send-note-fields-meta">
          <span id={hintId}>{isolateNameToken(copy.nameHint)}</span>
          <bdi className="send-note-fields-count">{fill(copy.count, { count: formatNumber(text.length, language), max: formatNumber(SEND_MESSAGE_MAX, language) })}</bdi>
        </div>
        {isDefault ? (
          (note.canUpdateDefault || note.isUpdating || note.justSaved) && (
            <button className="send-note-fields-link" type="button" disabled={note.isUpdating || note.justSaved} onClick={() => void note.updateDefault()}>
              {note.isUpdating ? copy.updatingDefault : note.justSaved ? copy.defaultSaved : copy.updateDefault}
              {note.justSaved && <IconCheck size={16} stroke={2.25} aria-hidden="true" />}
            </button>
          )
        ) : (
          <label className="send-note-fields-check" data-disabled={!note.canSaveNewAsDefault || undefined}>
            <input
              type="checkbox"
              checked={state.saveNewAsDefault && note.canSaveNewAsDefault}
              disabled={!note.canSaveNewAsDefault}
              onChange={(event) => note.setSaveNewAsDefault(event.target.checked)}
            />
            {copy.saveAsDefault[note.kind]}
          </label>
        )}
        {!isDefault && text.trim().length > SEND_DEFAULT_MAX.message && (
          <p className="send-note-fields-note">{fill(copy.defaultTooLong, { max: formatNumber(SEND_DEFAULT_MAX.message, language) })}</p>
        )}
        {!note.hasDefaultMessage && settingsUrl && (
          <a className="send-note-fields-link" href={settingsUrl} target="_blank" rel="noreferrer">
            {copy.setUpDefault}
          </a>
        )}
      </section>

      {note.hasTip && (
        <section className="send-note-fields-tip">
          <CardioSwitch checked={state.attachTip} onChange={note.setAttachTip} label={copy.attachTip} />
          {state.attachTip && (
            <p className="send-note-fields-tip-text">
              <IconBulb className="send-note-fields-tip-icon" size={18} stroke={1.75} aria-hidden="true" />
              <span dir="auto">{note.defaults.tip}</span>
            </p>
          )}
        </section>
      )}

      <p className="send-note-fields-preview" aria-live="polite">
        <b>{copy.previewLabel}</b> {includes ?? copy.previewNone}
      </p>
    </div>
  );
}
