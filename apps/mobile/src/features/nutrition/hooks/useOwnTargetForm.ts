import { useEffect, useState } from 'react';
import { extractErrorMessage } from '@sistem/api-client';
import type { OwnNutritionTarget, PortionCounts, PortionGroup } from '@sistem/types';
import { getActiveLanguage } from '@sistem/shared';
import { saveOwnNutritionTarget } from '../../../services/nutrition/nutritionService';
import { nutritionCopy } from '../copy';

/** Steppers stop here (the server's limit too); halves, like the coach's portions. */
export const MAX_OWN_PORTIONS = 20;
export const OWN_PORTION_STEP = 0.5;
const EMPTY: PortionCounts = { protein: 0, carb: 0, fat: 0, snack: 0 };

/** "היעד שלי": her daily portions per group + free vegetables, saved on the server. */
export function useOwnTargetForm(isOpen: boolean, current: OwnNutritionTarget | null, onSaved: () => void) {
  const [portions, setPortions] = useState<PortionCounts>(current?.portions ?? EMPTY);
  const [freeVegetables, setFreeVegetables] = useState(current?.freeVegetables ?? true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Opening again starts from what is saved.
  useEffect(() => {
    if (!isOpen) return;
    setPortions(current?.portions ?? EMPTY);
    setFreeVegetables(current?.freeVegetables ?? true);
    setError(null);
  }, [current, isOpen]);

  function step(group: PortionGroup, direction: 1 | -1) {
    setPortions((value) => ({ ...value, [group]: Math.min(MAX_OWN_PORTIONS, Math.max(0, value[group] + direction * OWN_PORTION_STEP)) }));
  }

  const isEmpty = Object.values(portions).every((value) => value === 0);

  async function save() {
    const copy = nutritionCopy[getActiveLanguage()].ownTarget;
    if (isEmpty) {
      setError(copy.empty);
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await saveOwnNutritionTarget({ portions, freeVegetables });
      onSaved();
    } catch (caught) {
      setError(extractErrorMessage(caught, copy.saveError));
    } finally {
      setIsSaving(false);
    }
  }

  return { portions, freeVegetables, setFreeVegetables, step, isEmpty, isSaving, error, save };
}
