import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { IconPlus } from '@tabler/icons-react';
import { fill, formatDateOnly, useCopy, useLanguage } from '@sistem/shared';
import { progressPhotosDayPath } from '../../../../app/config/routes';
import { padWeek } from '../../data/profileDisplay';
import type { ProfilePhoto } from '../../hooks/usePhotoCompare';
import { profileCopy } from '../../copy';
import './PhotoGrid.css';

interface PhotoGridProps {
  /** Oldest first (shown newest first). */
  photos: ProfilePhoto[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  weekOf: (date: string) => number;
  describe: (photo: ProfilePhoto) => string;
  /** A signed link stopped working (they last an hour): fetch fresh ones — once per link. */
  onLinkExpired: () => void;
}

/** "+ new photo" then every photo, newest first, 3:4 tiles; a tap puts the photo in the compare. */
export function PhotoGrid({ photos, selectedKey, onSelect, weekOf, describe, onLinkExpired }: PhotoGridProps) {
  const failed = useRef(new Set<string>());
  const copy = useCopy(profileCopy);
  const language = useLanguage();

  return (
    <ul className="pf-photo-grid">
      <li>
        <Link to={progressPhotosDayPath()} className="pf-photo-tile pf-photo-add">
          <span className="pf-photo-add-icon" aria-hidden="true">
            <IconPlus size={16} />
          </span>
          {copy.newPhoto}
        </Link>
      </li>
      {[...photos].reverse().map((photo) => (
        <li key={photo.key}>
          <button
            type="button"
            className="pf-photo-tile"
            aria-pressed={photo.key === selectedKey}
            aria-label={fill(copy.photoTile, { kind: describe(photo), date: formatDateOnly(photo.date, language) })}
            onClick={() => onSelect(photo.key)}
          >
            <img className="pf-photo-image" src={photo.photo.url} alt="" loading="lazy"
              draggable={false}
              onError={() => {
                if (failed.current.has(photo.photo.url)) return;
                failed.current.add(photo.photo.url);
                onLinkExpired();
              }}
            />
            <span className="pf-photo-week" aria-hidden="true">
              {fill(copy.eyebrow.week, { week: padWeek(weekOf(photo.date)) })}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
