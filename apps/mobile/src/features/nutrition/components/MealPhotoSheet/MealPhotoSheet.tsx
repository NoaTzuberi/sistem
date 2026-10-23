import { useState } from 'react';
import { IconLock, IconTrash } from '@tabler/icons-react';
import type { MealLogDay } from '@sistem/types';
import { fill, useCopy, useI18n } from '@sistem/shared';
import { BottomSheet } from '../../../../components/common/BottomSheet/BottomSheet';
import { GalleryViewer } from '../../../../components/common/GalleryViewer/GalleryViewer';
import { PhotoSourceTiles } from '../../../../components/common/PhotoSourceTiles/PhotoSourceTiles';
import { MealPhotoTodayGrid } from '../MealPhotoTodayGrid/MealPhotoTodayGrid';
import { useMealPhotos } from '../../hooks/useMealPhotos';
import { photoCounts, timeIn } from '../../data/mealPick';
import { nutritionCopy } from '../../copy';
import { appCopy } from '../../../../copy';
import './MealPhotoSheet.css';

interface MealPhotoSheetProps {
  isOpen: boolean;
  onClose: () => void;
  day: MealLogDay;
  timezone: string;
  /** Self-guided: the photos are hers alone (the privacy line says so). */
  selfGuided: boolean;
  onDayChange: (day: MealLogDay) => void;
  onLinkExpired: () => void;
  onToast: (text: string) => void;
}

/**
 * "Meal photo" (docs/design/trainee-first-run.html): ONE sheet — the meal (pills, preselected by the
 * time of day, today's count on each), camera / gallery, and today's photos. Private photos only.
 */
export function MealPhotoSheet({ isOpen, onClose, day, timezone, selfGuided, onDayChange, onLinkExpired, onToast }: MealPhotoSheetProps) {
  const copy = useCopy(nutritionCopy);
  const { plural } = useI18n();
  const eyebrow = useCopy(appCopy).eyebrow;
  const photos = useMealPhotos(isOpen, day, timezone, onDayChange, onToast);
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  const counts = photoCounts(day.photos);

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={onClose} labelledBy="mp-title" className="mp-sheet">
        <h2 className="mp-title" id="mp-title">
          {copy.mealPhoto}
        </h2>
        <p className="mp-lock">
          <IconLock size={13} stroke={2.2} aria-hidden="true" />
          {selfGuided ? copy.mp.privacySelf : copy.photoPrivacy}
        </p>

        {day.editable && (
          <>
            <p className="mp-label" id="mp-meals-label">
              {copy.mp.whichMeal}
            </p>
            <div className="mp-meals" role="radiogroup" aria-labelledby="mp-meals-label">
              {day.meals.map((meal) => {
                const count = counts.get(meal.id) ?? 0;
                const checked = photos.meal?.id === meal.id;
                return (
                  <button
                    key={meal.id}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    tabIndex={checked ? 0 : -1}
                    className="mp-meal"
                    onClick={() => photos.selectMeal(meal.id)}
                    onKeyDown={(event) => {
                      // A radiogroup moves with the arrow keys (in reading order).
                      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
                      event.preventDefault();
                      const index = day.meals.findIndex((candidate) => candidate.id === meal.id);
                      const forward = (event.key === 'ArrowLeft') === (document.dir === 'rtl');
                      const next = day.meals[(index + (forward ? 1 : -1) + day.meals.length) % day.meals.length];
                      photos.selectMeal(next.id);
                      (event.currentTarget.parentElement?.querySelector(`[data-meal-id="${next.id}"]`) as HTMLElement | null)?.focus();
                    }}
                    data-meal-id={meal.id}
                  >
                    <bdi dir="auto">{meal.name}</bdi>
                    {count > 0 && (
                      <small className="mp-meal-count" aria-label={plural(copy.mp.photosOfMeal, count)}>
                        {count}
                      </small>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mp-tiles">
              <PhotoSourceTiles
                labels={{ camera: copy.mp.camera, cameraHint: copy.mp.cameraHint, gallery: copy.mp.gallery, galleryHint: copy.mp.galleryHint }}
                onPick={(file) => void photos.upload(file)}
                disabled={photos.busy !== null || !photos.meal}
              />
            </div>
            {photos.status && (
              <p className="mp-status" role="status">
                {photos.status}
              </p>
            )}
          </>
        )}
        {photos.error && (
          <p className="mp-error" role="alert">
            {photos.error}
          </p>
        )}

        <p className="mp-label">
          <code className="mp-eyebrow" aria-hidden="true">
            {eyebrow.today}
          </code>
          {copy.mp.today}
        </p>
        <MealPhotoTodayGrid photos={day.photos} timezone={timezone} onOpen={setViewIndex} onLinkExpired={onLinkExpired} />
      </BottomSheet>

      {viewIndex !== null && day.photos.length > 0 && (
        <GalleryViewer
          items={day.photos.map((photo) => ({
            id: photo.id,
            src: photo.url,
            alt: fill(copy.photoAlt, { meal: photo.mealName }),
            caption: (
              <>
                <bdi dir="auto">{photo.mealName}</bdi> · <span dir="ltr">{timeIn(timezone, photo.uploadedAt)}</span>
              </>
            ),
          }))}
          index={Math.min(viewIndex, day.photos.length - 1)}
          onIndexChange={setViewIndex}
          onClose={() => setViewIndex(null)}
          labels={{ close: copy.photoClose, previous: copy.mp.previous, next: copy.mp.next }}
          onLinkExpired={onLinkExpired}
          renderActions={(item) =>
            day.editable ? (
              <button
                type="button"
                className="gallery-viewer-action"
                data-tone="danger"
                disabled={photos.busy !== null}
                onClick={async () => {
                  const removed = await photos.remove(item.id);
                  if (removed && day.photos.length <= 1) setViewIndex(null);
                }}
              >
                <IconTrash size={16} aria-hidden="true" />
                {copy.mp.delete}
              </button>
            ) : null
          }
        />
      )}
    </>
  );
}
