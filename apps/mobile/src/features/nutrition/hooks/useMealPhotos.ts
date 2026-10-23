import { useEffect, useState } from 'react';
import axios from 'axios';
import type { MealLogDay } from '@sistem/types';
import { fill, getActiveLanguage } from '@sistem/shared';
import { removeMealPhoto, uploadMealPhoto } from '../../../services/nutrition/nutritionService';
import { PhotoTooLargeError, compressPhoto } from '../../privatePhotos/data/photoCompression';
import { nutritionCopy } from '../copy';
import { hourIn, mealForHour } from '../data/mealPick';

type Busy = { kind: 'preparing' } | { kind: 'uploading'; percent: number } | { kind: 'removing' } | null;

function uploadError(error: unknown): string {
  const copy = nutritionCopy[getActiveLanguage()];
  if (error instanceof PhotoTooLargeError) return copy.photoTooLarge;
  if (axios.isAxiosError(error)) {
    if (!error.response) return copy.photoOffline;
    if (error.response.status === 413) return copy.photoTooLarge;
    return copy.photoError;
  }
  return copy.photoReadError;
}

/**
 * The meal photo sheet: the meal picked (preselected by the time of day), upload (compressed on the
 * phone — EXIF / GPS dropped — then a private photo, 1-hour links), delete. Photos need a connection.
 */
export function useMealPhotos(isOpen: boolean, day: MealLogDay, timezone: string, onDayChange: (day: MealLogDay) => void, onToast: (text: string) => void) {
  const [mealId, setMealId] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);

  // Each opening preselects the meal of the time of day — only when the sheet opens or the day / its
  // meals change, never after an upload (a new day object with the same meals).
  const mealIds = day.meals.map((meal) => meal.id).join(',');
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setMealId(mealForHour(mealIds ? mealIds.split(',') : [], hourIn(timezone)));
  }, [isOpen, day.date, mealIds, timezone]);

  const meal = day.meals.find((candidate) => candidate.id === mealId) ?? day.meals[0] ?? null;

  async function upload(file: File) {
    if (!meal) return;
    setError(null);
    setBusy({ kind: 'preparing' });
    try {
      const compressed = await compressPhoto(file);
      setBusy({ kind: 'uploading', percent: 0 });
      const saved = await uploadMealPhoto(day.date, meal.id, compressed, (fraction) => setBusy({ kind: 'uploading', percent: Math.round(fraction * 100) }));
      onDayChange(saved);
      onToast(fill(nutritionCopy[getActiveLanguage()].mp.saved, { meal: meal.name }));
    } catch (caught) {
      setError(uploadError(caught));
    } finally {
      setBusy(null);
    }
  }

  async function remove(photoId: string): Promise<boolean> {
    const copy = nutritionCopy[getActiveLanguage()];
    setError(null);
    setBusy({ kind: 'removing' });
    try {
      onDayChange(await removeMealPhoto(day.date, photoId));
      onToast(copy.mp.deleted);
      return true;
    } catch (caught) {
      setError(axios.isAxiosError(caught) && !caught.response ? copy.photoOffline : copy.photoRemoveError);
      return false;
    } finally {
      setBusy(null);
    }
  }

  const status =
    busy?.kind === 'preparing'
      ? nutritionCopy[getActiveLanguage()].photoPreparing
      : busy?.kind === 'uploading'
        ? fill(nutritionCopy[getActiveLanguage()].photoUploading, { percent: busy.percent })
        : null;

  return { meal, selectMeal: setMealId, upload, remove, busy, status, error };
}
