import { useEffect, useState } from 'react';
import { getActiveLanguage } from '@sistem/shared';
import { getSendDefaults, saveSendDefaults } from '../../../services/coachProfile/coachDefaultsService';
import { coachSettingsCopy } from '../copy';

export interface DefaultsForm {
  message: string;
  tip: string;
}

const EMPTY: DefaultsForm = { message: '', tip: '' };
const same = (a: DefaultsForm, b: DefaultsForm) => a.message.trim() === b.message.trim() && a.tip.trim() === b.tip.trim();

/** Her saved nutrition message + tip: loaded once, edited, saved together (the server trims and checks). */
export function useSendDefaults(onSaved: (text: string) => void) {
  const [saved, setSaved] = useState<DefaultsForm | null>(null);
  const [form, setForm] = useState<DefaultsForm>(EMPTY);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    getSendDefaults()
      .then(({ nutrition }) => {
        if (!isCurrent) return;
        const loaded = { message: nutrition.message ?? '', tip: nutrition.tip ?? '' };
        setSaved(loaded);
        setForm(loaded);
      })
      .catch(() => isCurrent && setLoadError(coachSettingsCopy[getActiveLanguage()].defaults.loadError));
    return () => {
      isCurrent = false;
    };
  }, []);

  async function save() {
    const copy = coachSettingsCopy[getActiveLanguage()].defaults;
    setIsSaving(true);
    setSaveError(null);
    try {
      const { nutrition } = await saveSendDefaults({ nutrition: { message: form.message, tip: form.tip } });
      const next = { message: nutrition.message ?? '', tip: nutrition.tip ?? '' };
      setSaved(next);
      setForm(next);
      onSaved(copy.saved);
    } catch (caught) {
      setSaveError((caught instanceof Error && caught.message) || copy.saveError);
    } finally {
      setIsSaving(false);
    }
  }

  return {
    form,
    change: (patch: Partial<DefaultsForm>) => {
      setSaveError(null);
      setForm((current) => ({ ...current, ...patch }));
    },
    isLoaded: saved !== null,
    isEmpty: saved !== null && !saved.message && !saved.tip,
    isDirty: saved !== null && !same(saved, form),
    loadError,
    saveError,
    isSaving,
    save,
  };
}
