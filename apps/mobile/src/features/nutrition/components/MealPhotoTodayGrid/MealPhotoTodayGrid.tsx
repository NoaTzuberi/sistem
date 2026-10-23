import type { MealPhoto } from '@sistem/types';
import { fill, useCopy } from '@sistem/shared';
import { nutritionCopy } from '../../copy';
import { timeIn } from '../../data/mealPick';
import './MealPhotoTodayGrid.css';

interface MealPhotoTodayGridProps {
  photos: MealPhoto[];
  timezone: string;
  onOpen: (index: number) => void;
  /** The signed link expired: fetch the day again. */
  onLinkExpired: () => void;
}

/** "Today's photos": 3 square tiles a row, each with its time and meal; tap = the viewer. */
export function MealPhotoTodayGrid({ photos, timezone, onOpen, onLinkExpired }: MealPhotoTodayGridProps) {
  const copy = useCopy(nutritionCopy).mp;
  if (photos.length === 0) return <p className="mp-today-empty">{copy.todayEmpty}</p>;
  return (
    <ul className="mp-today">
      {photos.map((photo, index) => {
        const time = timeIn(timezone, photo.uploadedAt);
        return (
          <li key={photo.id}>
            <button type="button" className="mp-thumb" onClick={() => onOpen(index)} aria-label={fill(copy.openPhoto, { meal: photo.mealName, time })}>
              <img className="mp-thumb-image" src={photo.url} alt="" loading="lazy" decoding="async" onError={onLinkExpired} />
              <time className="mp-thumb-time" dir="ltr" aria-hidden="true">
                {time}
              </time>
              <span className="mp-thumb-meal" dir="auto" aria-hidden="true">
                {photo.mealName}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
