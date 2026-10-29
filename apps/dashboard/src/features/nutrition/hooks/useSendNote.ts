import { useCallback, useEffect, useState } from 'react';
import type { CoachSendDefault } from '@sistem/types';
import { getSendDefaults, saveSendDefaults } from '../../../services/coachProfile/coachDefaultsService';
import { canSaveAsDefault, editNoteText, initialNoteField, toggleNoteDefault } from '../data/sendNote';
import type { NoteField, NoteFieldId } from '../data/sendNote';

const EMPTY_FIELD: NoteField = { useDefault: false, text: '', ownText: '', saveAsDefault: false };
const NO_DEFAULTS: CoachSendDefault = { message: null, tip: null };

/**
 * The send sheet's note + tip: her saved defaults (loaded once), the text of this send, and saving
 * a text as the new default. `reset` runs when the sheet opens; `take` gives what to send and saves
 * any "save as my default" ticks first (a failed default save never blocks the send).
 */
export function useSendNote() {
  const [defaults, setDefaults] = useState<CoachSendDefault>(NO_DEFAULTS);
  const [fields, setFields] = useState<Record<NoteFieldId, NoteField>>({ message: EMPTY_FIELD, tip: EMPTY_FIELD });
  const [savingId, setSavingId] = useState<NoteFieldId | null>(null);
  const [savedId, setSavedId] = useState<NoteFieldId | null>(null);

  useEffect(() => {
    let isCurrent = true;
    getSendDefaults()
      .then((loaded) => isCurrent && setDefaults(loaded.nutrition))
      .catch(() => undefined); // No defaults offered; the sheet still works.
    return () => {
      isCurrent = false;
    };
  }, []);

  const reset = useCallback(
    (draft: { introMessage: string; introTip: string }) => {
      setSavedId(null);
      setFields({ message: initialNoteField(draft.introMessage, defaults.message), tip: initialNoteField(draft.introTip, defaults.tip) });
    },
    [defaults],
  );

  const update = (id: NoteFieldId, next: (field: NoteField) => NoteField) => {
    setSavedId((current) => (current === id ? null : current));
    setFields((current) => ({ ...current, [id]: next(current[id]) }));
  };

  async function saveDefault(id: NoteFieldId, text: string): Promise<boolean> {
    try {
      const saved = await saveSendDefaults({ nutrition: { [id]: text } });
      setDefaults(saved.nutrition);
      return true;
    } catch {
      return false;
    }
  }

  /** "Update the default" while the default is on: the edited text becomes the default. */
  async function updateDefault(id: NoteFieldId) {
    setSavingId(id);
    const text = fields[id].text;
    if (await saveDefault(id, text)) {
      setSavedId(id);
      setFields((current) => ({ ...current, [id]: { ...current[id], text: text.trim() } }));
    }
    setSavingId(null);
  }

  async function take(): Promise<{ introMessage: string; introTip: string }> {
    const ticked = (['message', 'tip'] as const).filter((id) => fields[id].saveAsDefault && canSaveAsDefault(fields[id], id, defaults[id]));
    await Promise.all(ticked.map((id) => saveDefault(id, fields[id].text)));
    return { introMessage: fields.message.text, introTip: fields.tip.text };
  }

  return {
    defaults,
    fields,
    savingId,
    savedId,
    reset,
    toggle: (id: NoteFieldId, on: boolean) => update(id, (field) => toggleNoteDefault(field, on, defaults[id])),
    edit: (id: NoteFieldId, text: string) => update(id, (field) => editNoteText(field, text)),
    tickSaveAsDefault: (id: NoteFieldId, on: boolean) => update(id, (field) => ({ ...field, saveAsDefault: on })),
    canSave: (id: NoteFieldId) => canSaveAsDefault(fields[id], id, defaults[id]),
    updateDefault,
    take,
  };
}

export type SendNote = ReturnType<typeof useSendNote>;
