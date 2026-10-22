import { useState } from 'react';
import type { CSSProperties } from 'react';
import { IconArrowsHorizontal } from '@tabler/icons-react';
import { fill, formatDateOnly, useCopy, useLanguage } from '@sistem/shared';
import { padWeek } from '../../data/profileDisplay';
import type { ProfilePhoto } from '../../hooks/usePhotoCompare';
import type { usePhotoCompare } from '../../hooks/usePhotoCompare';
import { profileCopy } from '../../copy';
import './PhotoCompareFrame.css';

interface PhotoCompareFrameProps {
  compare: ReturnType<typeof usePhotoCompare>;
  /** Her membership week of a date (W01 …). */
  weekOf: (date: string) => number;
  /** The signed links last an hour: called once per link that fails, to fetch fresh ones. */
  onLinkExpired: () => void;
  describe: (photo: ProfilePhoto) => string;
}

/** Before (her first photo) / after (the latest, or the one picked) with a draggable divider. */
export function PhotoCompareFrame({ compare, weekOf, onLinkExpired, describe }: PhotoCompareFrameProps) {
  const copy = useCopy(profileCopy);
  const language = useLanguage();
  const [failedUrls, setFailedUrls] = useState<string[]>([]);
  const { before, after } = compare;
  if (!before || !after) return null;

  function handleError(url: string) {
    if (failedUrls.includes(url)) return;
    setFailedUrls((current) => [...current, url]);
    onLinkExpired();
  }

  const alt = (photo: ProfilePhoto) => fill(copy.photoTile, { kind: describe(photo), date: formatDateOnly(photo.date, language) });

  return (
    <div
      className={'pf-compare' + (compare.isDragging ? ' pf-compare-dragging' : '')}
      style={{ '--pf-split': `${compare.position}%` } as CSSProperties}
      {...compare.frameHandlers}
    >
      <img className="pf-compare-image" src={before.photo.url} alt={alt(before)} draggable={false} onError={() => handleError(before.photo.url)} />
      <div className="pf-compare-after">
        <img className="pf-compare-image" src={after.photo.url} alt={alt(after)} draggable={false} onError={() => handleError(after.photo.url)} />
      </div>

      <span className="pf-compare-label pf-compare-label-start">
        {copy.compareStart}
        <code aria-hidden="true">{fill(copy.eyebrow.week, { week: padWeek(weekOf(before.date)) })}</code>
      </span>
      <span className="pf-compare-label pf-compare-label-end">
        {compare.isLatest ? copy.compareNow : copy.compareChosen}
        <code aria-hidden="true">{fill(copy.eyebrow.week, { week: padWeek(weekOf(after.date)) })}</code>
      </span>

      <div className="pf-compare-divider">
        <button
          type="button"
          className="pf-compare-handle"
          role="slider"
          aria-label={copy.compareSlider}
          aria-valuemin={compare.limits.min}
          aria-valuemax={compare.limits.max}
          aria-valuenow={Math.round(compare.position)}
          aria-valuetext={`${Math.round(compare.position)}%`}
          onKeyDown={compare.onHandleKeyDown}
        >
          <IconArrowsHorizontal size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
