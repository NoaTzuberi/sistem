import type { BodyMetric } from '@sistem/types';
import { fill, formatDateShort, photoDays, photoForPose, poseLabel, PROGRESS_PHOTO_POSES, useCopy, useLanguage } from '@sistem/shared';
import { PrivatePhoto } from '../../../../components/common/PrivatePhoto/PrivatePhoto';
import { bodyCopy } from '../../copy';
import './ProgressPhotoGallery.css';

interface ProgressPhotoGalleryProps {
  metrics: BodyMetric[];
  /** A link expired while the screen was open: load the days again. */
  onLinkExpired: () => void;
}

/** Coach mode, read-only: every progress photo (newest day first, front → side → back) in a 3-column grid; tap = full screen. */
export function ProgressPhotoGallery({ metrics, onLinkExpired }: ProgressPhotoGalleryProps) {
  const language = useLanguage();
  const copy = useCopy(bodyCopy);
  const photos = photoDays(metrics).flatMap((metric) =>
    PROGRESS_PHOTO_POSES.flatMap((pose) => {
      const photo = photoForPose(metric, pose);
      return photo ? [{ key: `${metric.date}:${pose}`, date: metric.date, pose, photo }] : [];
    }),
  );
  if (photos.length === 0) return <p className="progress-photo-gallery-empty">{copy.noPhotos}</p>;

  return (
    <ul className="progress-photo-gallery">
      {photos.map(({ key, date, pose, photo }) => {
        const day = formatDateShort(date, language);
        return (
          <li key={key} className="progress-photo-gallery-item">
            <PrivatePhoto
              photo={photo}
              thumbnail
              alt={fill(copy.photoAlt, { pose: poseLabel(pose, language), date: day })}
              openLabel={fill(copy.openPhoto, { pose: poseLabel(pose, language) })}
              closeLabel={copy.close}
              onLinkExpired={onLinkExpired}
            />
            <span className="progress-photo-gallery-caption">
              <span className="progress-photo-gallery-date">{day}</span>
              <span className="progress-photo-gallery-pose">{poseLabel(pose, language)}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
