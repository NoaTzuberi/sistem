import { useRef } from 'react';
import type { BodyMetric, StartingPhoto } from '@sistem/types';
import { formatDateOnly, useCopy, useLanguage } from '@sistem/shared';
import { IconCamera } from '@tabler/icons-react';
import { Button } from '../../../../components/common/Button/Button';
import { PrivatePhoto } from '../../../../components/common/PrivatePhoto/PrivatePhoto';
import { useStartingPhotoUpload } from '../../hooks/useStartingPhotoUpload';
import { bodyCopy } from '../../copy';
import './StartingPhotoCard.css';

interface StartingPhotoCardProps {
  date: string;
  photoDate?: string;
  photo?: StartingPhoto;
  onDayChange: (metric: BodyMetric | null) => void;
  onLinkExpired: () => void;
}

export function StartingPhotoCard({ date, photoDate, photo, onDayChange, onLinkExpired }: StartingPhotoCardProps) {
  const copy = useCopy(bodyCopy);
  const language = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useStartingPhotoUpload(date, onDayChange);
  const shownDate = photoDate ?? date;

  return (
    <section className="starting-photo-card" aria-labelledby="starting-photo-title">
      <div className="starting-photo-card-copy">
        <h2 id="starting-photo-title" className="starting-photo-card-title display-title">{copy.startingPhotoTitle}</h2>
        <p className="starting-photo-card-privacy">{copy.startingPhotoPrivacy}</p>
        {photo && <p className="starting-photo-card-date">{formatDateOnly(shownDate, language)}</p>}
      </div>
      {photo && (
        <PrivatePhoto
          photo={photo}
          localSrc={upload.localSrc}
          alt={`${copy.startingPhotoTitle}, ${formatDateOnly(shownDate, language)}`}
          openLabel={copy.startingPhotoTitle}
          closeLabel={copy.close}
          onLinkExpired={onLinkExpired}
          thumbnail
        />
      )}
      {upload.status && <p className="starting-photo-card-status" role="status">{upload.status}</p>}
      {upload.saved && <p className="starting-photo-card-status" role="status">{copy.startingPhotoSaved}</p>}
      {upload.error && (
        <div className="starting-photo-card-error" role="alert">
          <span>{upload.error}</span>
          {upload.canRetry && <Button variant="secondary" onClick={upload.retry}>{copy.retry}</Button>}
        </div>
      )}
      <Button
        variant="secondary"
        icon={<IconCamera size={19} aria-hidden="true" />}
        onClick={() => inputRef.current?.click()}
        disabled={upload.busy !== null}
      >
        {photo ? copy.startingPhotoChange : copy.startingPhotoUpload}
      </Button>
      <input
        ref={inputRef}
        className="starting-photo-card-input"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={upload.handlePicked}
      />
    </section>
  );
}
