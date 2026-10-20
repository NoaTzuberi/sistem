import type { Language } from '@sistem/types';

// Voice cues and the block-change buzz — both only when she switched them on and the phone has the API.

// i18n-ignore: speech voices are picked by BCP-47 tag, one per app language
const VOICE_LANG: Record<Language, string> = { he: 'he-IL', en: 'en-US' };

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

export function speak(text: string, language: Language): void {
  if (!canSpeak()) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = VOICE_LANG[language];
    window.speechSynthesis.speak(utterance);
  } catch {
    // No voice on this device.
  }
}

export function stopSpeaking(): void {
  if (canSpeak()) window.speechSynthesis.cancel();
}

export function canVibrate(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

export function buzz(): void {
  try {
    if (canVibrate()) navigator.vibrate([60, 40, 60]);
  } catch {
    // Not allowed here.
  }
}

/* Her two switches, kept on this phone. */

export interface CardioPrefs {
  voice: boolean;
  vibrate: boolean;
}

const PREFS_KEY = 'sistem.cardioPrefs';
const DEFAULT_PREFS: CardioPrefs = { voice: true, vibrate: true };

export function loadPrefs(): CardioPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<CardioPrefs>) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export function storePrefs(prefs: CardioPrefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Kept for this visit only.
  }
}
