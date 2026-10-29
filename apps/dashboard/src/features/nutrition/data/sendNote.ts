// The send sheet's two fields (the note to her + the coach's tip): "my default" on or off,
// the text for this send, and "save as my default". Pure; useSendNote holds the state.

export type NoteFieldId = 'message' | 'tip';

export interface NoteField {
  /** The saved default is used (only offered when one exists). */
  useDefault: boolean;
  /** What goes out with this send (editable in both states). */
  text: string;
  /** Her own text, kept while the default is on, back when she turns it off. */
  ownText: string;
  /** Off: also save this text as the new default when sending. */
  saveAsDefault: boolean;
}

/** The server's limits for a saved default (coachDefaults.validation.ts). */
export const DEFAULT_MAX: Record<NoteFieldId, number> = { message: 600, tip: 300 };
/** The limits on the plan itself (nutrition.constants). */
export const SEND_MAX: Record<NoteFieldId, number> = { message: 1500, tip: 300 };

const same = (a: string, b: string) => a.trim() === b.trim();

/**
 * Opening the sheet: what the draft already holds wins (written in step 3, or sent last time).
 * Empty or equal to the default → the default, on; else her own text, off.
 */
export function initialNoteField(draftText: string, defaultText: string | null): NoteField {
  if (defaultText && (!draftText.trim() || same(draftText, defaultText))) {
    return { useDefault: true, text: defaultText, ownText: '', saveAsDefault: false };
  }
  return { useDefault: false, text: draftText, ownText: draftText, saveAsDefault: false };
}

export function toggleNoteDefault(field: NoteField, on: boolean, defaultText: string | null): NoteField {
  if (on && defaultText) return { ...field, useDefault: true, text: defaultText, ownText: field.useDefault ? field.ownText : field.text, saveAsDefault: false };
  return { ...field, useDefault: false, text: field.ownText };
}

export function editNoteText(field: NoteField, text: string): NoteField {
  return field.useDefault ? { ...field, text } : { ...field, text, ownText: text };
}

/** "Update the default" (on, edited) / "save as default" (off) can be offered for this text. */
export function canSaveAsDefault(field: NoteField, id: NoteFieldId, defaultText: string | null): boolean {
  const text = field.text.trim();
  return text.length > 0 && text.length <= DEFAULT_MAX[id] && !(defaultText !== null && same(text, defaultText));
}
