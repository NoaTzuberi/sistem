import { IconCamera } from '@tabler/icons-react';
import { fill, formatDateOnly, useCopy, useLanguage } from '@sistem/shared';
import { PhotoSourceTiles } from '../../../../components/common/PhotoSourceTiles/PhotoSourceTiles';
import type { StartingItem } from '../../data/progressTimeline';
import { profileCopy } from '../../copy';
import './PpStartingCard.css';

interface PpStartingCardProps {
  starting: StartingItem | null;
  selfGuided: boolean;
  disabled: boolean;
  onPick: (file: File) => void;
  onReplace: () => void;
  onOpen: () => void;
  onLinkExpired: () => void;
}

/** The starting photo: missing → the card that asks for it (camera / gallery); set → a compact row with "Replace". */
export function PpStartingCard({ starting, selfGuided, disabled, onPick, onReplace, onOpen, onLinkExpired }: PpStartingCardProps) {
  const copy = useCopy(profileCopy).pp;
  const language = useLanguage();

  if (!starting) {
    return (
      <section className="pp-start" aria-labelledby="pp-start-title">
        <span className="pp-start-icon" aria-hidden="true">
          <IconCamera size={22} />
        </span>
        <h2 className="pp-start-title" id="pp-start-title">
          {copy.startTitle}
        </h2>
        <p className="pp-start-text">{selfGuided ? copy.startTextSelf : copy.startText}</p>
        <PhotoSourceTiles
          labels={{ camera: copy.camera, cameraHint: copy.cameraHint, gallery: copy.gallery, galleryHint: copy.galleryHint }}
          onPick={onPick}
          disabled={disabled}
        />
      </section>
    );
  }

  const date = formatDateOnly(starting.date, language);
  return (
    <section className="pp-start-set" aria-labelledby="pp-start-set-title">
      <button type="button" className="pp-start-thumb" onClick={onOpen} aria-label={fill(copy.openPhoto, { pose: copy.startTitle, date })}>
        <img src={starting.photo.url} alt="" decoding="async" onError={onLinkExpired} />
      </button>
      <div className="pp-start-set-text">
        <h2 className="pp-start-set-title" id="pp-start-set-title">
          {copy.startTitle}
        </h2>
        <p className="pp-start-set-date">{fill(copy.startedOn, { date })}</p>
      </div>
      <button type="button" className="pp-text-button" onClick={onReplace} disabled={disabled}>
        {copy.replace}
      </button>
    </section>
  );
}
