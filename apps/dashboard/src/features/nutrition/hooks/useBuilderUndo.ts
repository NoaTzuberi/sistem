import { createContext, useContext } from 'react';
import type { DraftMeal } from '../nutritionDraft';

export interface BuilderUndo {
  /**
   * A delete inside a meal (an option, a row) happened: show "Undo" for it. `restore` puts it back into the
   * meal with that key — by key, because the meals may have moved or changed since.
   */
  offer: (message: string, mealKey: string, restore: (meal: DraftMeal) => DraftMeal) => void;
}

/** Provided by the meals step (its undo toast); a meal card outside it simply deletes. */
export const BuilderUndoContext = createContext<BuilderUndo | null>(null);

export function useBuilderUndo(): BuilderUndo | null {
  return useContext(BuilderUndoContext);
}

/** Puts an item back at its old place (or at the end when the list got shorter). */
export function insertAt<T>(list: readonly T[], index: number, item: T): T[] {
  const at = Math.min(index, list.length);
  return [...list.slice(0, at), item, ...list.slice(at)];
}
