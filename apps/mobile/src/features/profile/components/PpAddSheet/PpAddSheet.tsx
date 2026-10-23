import { useEffect, useState } from 'react';
import { IconLock } from '@tabler/icons-react';
import type { ProgressPhotoPose } from '@sistem/types';
import { PROGRESS_PHOTO_POSES, poseLabel, useCopy, useLanguage } from '@sistem/shared';
import { BottomSheet } from '../../../../components/common/BottomSheet/BottomSheet';
import { PhotoSourceTiles } from '../../../../components/common/PhotoSourceTiles/PhotoSourceTiles';
import type { PhotoTarget } from '../../hooks/useProgressPhotoUpload';
import { profileCopy } from '../../copy';
import './PpAddSheet.css';

interface PpAddSheetProps {
  isOpen: boolean;
  /** 'starting' = replace the starting photo (no pose); 'pose' = a progress photo for today. */
  mode: 'starting' | 'pose';
  selfGuided: boolean;
  isBusy: boolean;
  status: string | null;
  error: string | null;
  onClose: () => void;
  onPick: (file: File, target: PhotoTarget) => void;
}

/** Add a photo: camera / gallery, and for a progress photo the pose (front / side / back). */
export function PpAddSheet({ isOpen, mode, selfGuided, isBusy, status, error, onClose, onPick }: PpAddSheetProps) {
  const copy = useCopy(profileCopy).pp;
  const language = useLanguage();
  const [pose, setPose] = useState<ProgressPhotoPose>('front');

  useEffect(() => {
    if (isOpen) setPose('front');
  }, [isOpen]);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} labelledBy="pp-add-title">
      <h2 className="pp-add-title" id="pp-add-title">
        {mode === 'starting' ? copy.startTitle : copy.addTitle}
      </h2>
      <p className="pp-add-lock">
        <IconLock size={13} stroke={2.2} aria-hidden="true" />
        {selfGuided ? copy.lockSelf : copy.lock}
      </p>
      {mode === 'pose' && (
        <>
          <p className="pp-add-label" id="pp-add-pose">
            {copy.pose}
          </p>
          <div className="pp-add-poses" role="radiogroup" aria-labelledby="pp-add-pose">
            {PROGRESS_PHOTO_POSES.map((item) => (
              <button key={item} type="button" role="radio" aria-checked={pose === item} className="pp-add-pose" onClick={() => setPose(item)}>
                {poseLabel(item, language)}
              </button>
            ))}
          </div>
        </>
      )}
      <div className="pp-add-tiles">
        <PhotoSourceTiles
          labels={{ camera: copy.camera, cameraHint: copy.cameraHint, gallery: copy.gallery, galleryHint: copy.galleryHint }}
          onPick={(file) => onPick(file, mode === 'starting' ? { kind: 'starting' } : { kind: 'pose', pose })}
          disabled={isBusy}
        />
      </div>
      {status && (
        <p className="pp-add-status" role="status">
          {status}
        </p>
      )}
      {error && (
        <p className="pp-add-error" role="alert">
          {error}
        </p>
      )}
    </BottomSheet>
  );
}
