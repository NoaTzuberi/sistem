import { useEffect, useState } from 'react';
import { getActiveLanguage } from '@sistem/shared';
import type { CoachSendDefaults, SendDefaultsKind } from '@sistem/types';
import { getSendDefaults, saveSendDefaults } from '../../../services/coachProfile/coachDefaultsService';
import { coachSettingsCopy } from '../copy';

export interface DefaultsForm {
  message: string;
  tip: string;
}

export const DEFAULTS_KINDS: readonly SendDefaultsKind[] = ['nutrition', 'workouts'];
/** How long "Saved ✓" stays on the button. */
const SAVED_MS = 2000;
const EMPTY: Record<SendDefaultsKind, DefaultsForm> = { nutrition: { message: '', tip: '' }, workouts: { message: '', tip: '' } };

const same = (a: DefaultsForm, b: DefaultsForm) => a.message.trim() === b.message.trim() && a.tip.trim() === b.tip.trim();
const toForms = (defaults: CoachSendDefaults): Record<SendDefaultsKind, DefaultsForm> => ({
  nutrition: { message: defaults.nutrition.message ?? '', tip: defaults.nutrition.tip ?? '' },
  workouts: { message: defaults.workouts.message ?? '', tip: defaults.workouts.tip ?? '' },
});

/**
 * Her saved message + tip per plan kind: loaded once, each card edited and saved on its own (the
 * server trims and checks). "Saved ✓" shows for 2 s; deleting clears both fields of that kind.
 */
export function useSendDefaults() {
  const [saved, setSaved] = useState<Record<SendDefaultsKind, DefaultsForm> | null>(null);
  const [forms, setForms] = useState(EMPTY);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingKind, setSavingKind] = useState<SendDefaultsKind | null>(null);
  const [savedKind, setSavedKind] = useState<SendDefaultsKind | null>(null);
  const [errors, setErrors] = useState<Partial<Record<SendDefaultsKind, string>>>({});

  useEffect(() => {
    let isCurrent = true;
    getSendDefaults()
      .then((loaded) => {
        if (!isCurrent) return;
        setSaved(toForms(loaded));
        setForms(toForms(loaded));
      })
      .catch(() => isCurrent && setLoadError(coachSettingsCopy[getActiveLanguage()].defaults.loadError));
    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    if (!savedKind) return;
    const timer = window.setTimeout(() => setSavedKind(null), SAVED_MS);
    return () => window.clearTimeout(timer);
  }, [savedKind]);

  async function write(kind: SendDefaultsKind, form: DefaultsForm) {
    setSavingKind(kind);
    setErrors((current) => ({ ...current, [kind]: undefined }));
    try {
      const next = toForms(await saveSendDefaults({ [kind]: { message: form.message, tip: form.tip } }));
      // Only this card takes the server's answer; the other keeps what she is typing.
      setSaved((current) => ({ ...(current ?? next), [kind]: next[kind] }));
      setForms((current) => ({ ...current, [kind]: next[kind] }));
      setSavedKind(kind);
    } catch (caught) {
      const fallback = coachSettingsCopy[getActiveLanguage()].defaults.saveError;
      setErrors((current) => ({ ...current, [kind]: (caught instanceof Error && caught.message) || fallback }));
    } finally {
      setSavingKind(null);
    }
  }

  function card(kind: SendDefaultsKind) {
    const form = forms[kind];
    const stored = saved?.[kind];
    return {
      kind,
      form,
      isLoaded: saved !== null,
      /** Something is saved for this kind (the delete link shows). */
      hasSaved: Boolean(stored && (stored.message || stored.tip)),
      isDirty: Boolean(stored && !same(stored, form)),
      isSaving: savingKind === kind,
      justSaved: savedKind === kind,
      error: errors[kind] ?? null,
      change: (patch: Partial<DefaultsForm>) => {
        if (savedKind === kind) setSavedKind(null);
        setErrors((current) => ({ ...current, [kind]: undefined }));
        setForms((current) => ({ ...current, [kind]: { ...current[kind], ...patch } }));
      },
      save: () => write(kind, form),
      remove: () => write(kind, { message: '', tip: '' }),
    };
  }

  return {
    loadError,
    isDirty: saved !== null && DEFAULTS_KINDS.some((kind) => !same(saved[kind], forms[kind])),
    card,
  };
}

export type DefaultsCardState = ReturnType<ReturnType<typeof useSendDefaults>['card']>;
