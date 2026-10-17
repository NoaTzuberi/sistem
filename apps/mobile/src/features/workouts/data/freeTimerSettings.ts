import { FREE_TIMER_DEFAULTS } from './sessionConfig';

// The free interval timer's last settings, on this device only (it logs nothing). Read by the
// timer screen and by Home (the last-used interval on its timer bar).

const SETTINGS_KEY = 'sistem.interval.free.settings';

export type FreeTimerSettings = typeof FREE_TIMER_DEFAULTS;

/** The stored settings, or null when she never set the timer on this device. */
export function readSavedFreeTimerSettings(): FreeTimerSettings | null {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...FREE_TIMER_DEFAULTS, ...(JSON.parse(raw) as Partial<FreeTimerSettings>) } : null;
  } catch {
    return null;
  }
}

export function loadFreeTimerSettings(): FreeTimerSettings {
  return readSavedFreeTimerSettings() ?? FREE_TIMER_DEFAULTS;
}

export function saveFreeTimerSettings(settings: FreeTimerSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Remembered for this visit only.
  }
}
