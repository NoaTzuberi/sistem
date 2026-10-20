import { useState } from 'react';
import { type CardioPrefs, loadPrefs, storePrefs } from '../data/cardioCues';

/** Her voice / vibration switches, kept on this phone. */
export function useCardioPrefs() {
  const [prefs, setPrefs] = useState<CardioPrefs>(loadPrefs);
  function change(next: Partial<CardioPrefs>) {
    setPrefs((current) => {
      const merged = { ...current, ...next };
      storePrefs(merged);
      return merged;
    });
  }
  return { prefs, change };
}
