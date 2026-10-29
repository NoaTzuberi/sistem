import { useCallback, useEffect, useRef, useState } from 'react';
import type { CoachSendDefault, CoachSendDefaults, SendDefaultsKind, UpdateCoachSendDefaultsPayload } from '@sistem/types';
import { canSaveNewAsDefault, canUpdateDefault, initialSendNote, sentNote } from '../sendNote';
import type { SendMessageMode, SendNoteState } from '../sendNote';

export interface SendDefaultsApi {
  getSendDefaults: () => Promise<CoachSendDefaults>;
  saveSendDefaults: (payload: UpdateCoachSendDefaultsPayload) => Promise<CoachSendDefaults>;
}

const NO_DEFAULTS: CoachSendDefault = { message: null, tip: null };
/** How long "Saved ✓" stays after "save as default". */
const SAVED_MS = 2000;

/**
 * The send sheet's message + tip for one plan kind (both apps): her saved defaults (loaded once),
 * this send's choice, and saving a text as the new default. `reset` runs when the sheet opens;
 * `take` gives what to send and first saves a ticked "save as default" (a failed save never blocks
 * the send).
 */
export function useSendNote(kind: SendDefaultsKind, api: SendDefaultsApi) {
  const apiRef = useRef(api);
  apiRef.current = api;
  const [defaults, setDefaults] = useState<CoachSendDefault>(NO_DEFAULTS);
  const [state, setState] = useState<SendNoteState>(() => initialSendNote(NO_DEFAULTS));
  const [isUpdating, setIsUpdating] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    apiRef.current
      .getSendDefaults()
      .then((loaded) => {
        if (!isCurrent) return;
        setDefaults(loaded[kind]);
        // Opened before they arrived: start from them (nothing typed yet).
        setState((current) => (current.newText || current.defaultText ? current : initialSendNote(loaded[kind])));
      })
      .catch(() => undefined); // No defaults offered; the sheet still works.
    return () => {
      isCurrent = false;
    };
  }, [kind]);

  useEffect(() => {
    if (!justSaved) return;
    const timer = window.setTimeout(() => setJustSaved(false), SAVED_MS);
    return () => window.clearTimeout(timer);
  }, [justSaved]);

  const reset = useCallback(
    (draftMessage = '') => {
      setJustSaved(false);
      setState(initialSendNote(defaults, draftMessage));
    },
    [defaults],
  );

  const patch = (next: Partial<SendNoteState>) => setState((current) => ({ ...current, ...next }));

  async function saveDefault(message: string): Promise<boolean> {
    try {
      const saved = await apiRef.current.saveSendDefaults({ [kind]: { message } });
      setDefaults(saved[kind]);
      return true;
    } catch {
      return false;
    }
  }

  /** "Save as default" while on the default: the edited text becomes her default. */
  async function updateDefault() {
    setIsUpdating(true);
    const text = state.defaultText.trim();
    if (await saveDefault(text)) {
      setJustSaved(true);
      patch({ defaultText: text });
    }
    setIsUpdating(false);
  }

  async function take(): Promise<{ introMessage: string; introTip: string }> {
    if (state.mode === 'new' && state.saveNewAsDefault && canSaveNewAsDefault(state)) await saveDefault(state.newText.trim());
    return sentNote(state, defaults);
  }

  const sent = sentNote(state, defaults);
  return {
    kind,
    defaults,
    state,
    hasDefaultMessage: defaults.message !== null,
    hasTip: defaults.tip !== null,
    /** What she will get: drives the "She will get: message + tip" line. */
    includes: { message: sent.introMessage.length > 0, tip: sent.introTip.length > 0 },
    isUpdating,
    justSaved,
    canUpdateDefault: canUpdateDefault(state, defaults),
    canSaveNewAsDefault: canSaveNewAsDefault(state),
    reset,
    setMode: (mode: SendMessageMode) => patch({ mode }),
    editMessage: (text: string) => {
      setJustSaved(false);
      patch(state.mode === 'default' && defaults.message ? { defaultText: text } : { newText: text });
    },
    setSaveNewAsDefault: (on: boolean) => patch({ saveNewAsDefault: on }),
    setAttachTip: (on: boolean) => patch({ attachTip: on }),
    updateDefault,
    take,
  };
}

export type SendNote = ReturnType<typeof useSendNote>;
