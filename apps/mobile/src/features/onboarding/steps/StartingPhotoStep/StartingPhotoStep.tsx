import { useEffect } from 'react';
import { PhotoSourceTiles } from '../../../../components/common/PhotoSourceTiles/PhotoSourceTiles';
import { DeckButton } from '../../components/DeckButton/DeckButton';
import { useStartingPhotoUpload } from '../../../bodyTracking/hooks/useStartingPhotoUpload';
import { onboardingCopy } from '../../copy';
import { bodyCopy } from '../../../bodyTracking/copy';
import { useCopy } from '@sistem/shared';
import './StartingPhotoStep.css';

interface StartingPhotoStepProps {
  date: string;
  onPhotoSaved: () => void;
  onBusyChange: (busy: boolean) => void;
}

export function StartingPhotoStep({ date, onPhotoSaved, onBusyChange }: StartingPhotoStepProps) {
  const copy = useCopy(onboardingCopy);
  const bodyText = useCopy(bodyCopy);
  const upload = useStartingPhotoUpload(date, onPhotoSavedMetric);

  function onPhotoSavedMetric() {
    onPhotoSaved();
  }

  useEffect(() => onBusyChange(upload.busy !== null), [onBusyChange, upload.busy]);

  return (
    <div className="starting-photo-step">
      <p className="starting-photo-step-explanation">{copy.startingPhoto.explanation}</p>
      {/* Camera or gallery, like every other photo in the app (no forced camera). */}
      <PhotoSourceTiles
        labels={{
          camera: copy.startingPhoto.camera,
          cameraHint: copy.startingPhoto.cameraHint,
          gallery: copy.startingPhoto.gallery,
          galleryHint: copy.startingPhoto.galleryHint,
        }}
        onPick={(file) => void upload.pickFile(file)}
        disabled={upload.busy !== null}
      />
      {upload.status && (
        <p className="starting-photo-step-status" role="status">
          {upload.status}
        </p>
      )}
      {upload.saved && <p className="starting-photo-step-status" role="status">{bodyText.startingPhotoSaved}</p>}
      {upload.error && (
        <div className="starting-photo-step-error" role="alert">
          <span>{upload.error}</span>
          {upload.canRetry && <DeckButton variant="quiet" onClick={upload.retry} disabled={upload.busy !== null}>
            {bodyText.retry}
          </DeckButton>}
        </div>
      )}
    </div>
  );
}
