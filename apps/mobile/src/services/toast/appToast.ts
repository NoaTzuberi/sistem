import { useSyncExternalStore } from 'react';
import type { Language } from '@sistem/types';

/**
 * One toast that outlives the screen that asked for it (a password reset jumps into the app, which
 * may land on any screen). AppToast (mounted once in AppRouter) shows it. The text is a function of the
 * language, read when drawn: signing in can switch the app to her saved language a moment later.
 */
export type AppToastText = (language: Language) => string;

interface AppToastEntry {
  id: number;
  text: AppToastText;
}

let current: AppToastEntry | null = null;
let nextId = 1;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function showAppToast(text: AppToastText): void {
  current = { id: nextId++, text };
  emit();
}

/** Clears it, only if it is still the one shown (a newer toast keeps its own time). */
export function hideAppToast(id: number): void {
  if (current?.id !== id) return;
  current = null;
  emit();
}

export function useAppToast(): AppToastEntry | null {
  return useSyncExternalStore(subscribe, () => current);
}
