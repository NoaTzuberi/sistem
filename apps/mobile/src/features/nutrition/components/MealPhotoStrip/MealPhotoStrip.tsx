import type { MealPhoto } from '@sistem/types';
import { fill, useCopy } from '@sistem/shared';
import { IconPlus } from '@tabler/icons-react';
import { Eyebrow } from '../../../../components/common/Eyebrow/Eyebrow';
import { PrivatePhoto } from '../../../../components/common/PrivatePhoto/PrivatePhoto';
import { appCopy } from '../../../../copy';
import { nutritionCopy } from '../../copy';
import './MealPhotoStrip.css';

interface MealPhotoStripProps {
  photos: MealPhoto[];
  /** Null = no adding (a locked day, or no meal that day). */
  onAdd: (() => void) | null;
  onLinkExpired: () => void;
}

/** The day's meal photos: an "add" tile, then her private photos with the meal's name. */
export function MealPhotoStrip({ photos, onAdd, onLinkExpired }: MealPhotoStripProps) {
  const copy = useCopy(nutritionCopy);
  const eyebrow = useCopy(appCopy).eyebrow;
  if (!onAdd && photos.length === 0) return null;

  return (
    <section className="tn-photos" aria-labelledby="tn-photos-title">
      <div className="tn-section-head">
        <h2 className="tn-section-title" id="tn-photos-title">
          <Eyebrow>{eyebrow.photos}</Eyebrow>
          {copy.photosTitle}
        </h2>
        {onAdd && (
          <button type="button" className="tn-photos-link" onClick={onAdd}>
            {copy.photosAdd}
          </button>
        )}
      </div>
      <ul className="tn-photos-strip">
        {onAdd && (
          <li>
            <button type="button" className="tn-photos-tile tn-photos-add" onClick={onAdd} aria-label={copy.photoAdd}>
              <span className="tn-photos-add-icon" aria-hidden="true">
                <IconPlus size={18} stroke={2.2} />
              </span>
              {copy.photoTile}
            </button>
          </li>
        )}
        {photos.map((photo) => (
          <li key={photo.id} className="tn-photos-tile">
            <PrivatePhoto
              photo={photo}
              alt={fill(copy.photoAlt, { meal: photo.mealName })}
              openLabel={fill(copy.photoAlt, { meal: photo.mealName })}
              closeLabel={copy.photoClose}
              onLinkExpired={onLinkExpired}
              thumbnail
            />
            <span className="tn-photos-chip" dir="auto" aria-hidden="true">
              {photo.mealName}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
