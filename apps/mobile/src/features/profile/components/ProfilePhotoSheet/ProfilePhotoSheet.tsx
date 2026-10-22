import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ChangeEvent } from 'react';
import { getActiveLanguage, useCopy } from '@sistem/shared';
import { IconCamera, IconPhoto, IconTrash, IconZoomIn, IconZoomOut } from '@tabler/icons-react';
import { BottomSheet } from '../../../../components/common/BottomSheet/BottomSheet';
import { CROP_MAX_ZOOM, CROP_MIN_ZOOM, pickedFileProblem } from '../../data/avatarCrop';
import { useImageCrop } from '../../hooks/useImageCrop';
import { profileCopy } from '../../copy';
// The title / hint / error / ink save look is shared with the measurement sheet (MeasurementSheet.css).
import '../MeasurementSheet/MeasurementSheet.css';
import './ProfilePhotoSheet.css';

interface ProfilePhotoSheetProps {
  isOpen: boolean;
  onClose: () => void;
  hasPhoto: boolean;
  /** Uploads the cropped JPEG; the sheet is already closed (the avatar shows a spinner). */
  onSave: (photo: Blob) => void;
  onRemove: () => void;
}

/**
 * "תמונת פרופיל": camera (front) / gallery / remove, then "התאמה" in the same sheet — a circular
 * crop she drags to pan and zooms with the slider (1–3×). Saving makes a 400×400 JPEG on the phone
 * (no EXIF / GPS). Web: a file input with capture="user"; Capacitor (later): @capacitor/camera.
 */
export function ProfilePhotoSheet({ isOpen, onClose, hasPhoto, onSave, onRemove }: ProfilePhotoSheetProps) {
  const copy = useCopy(profileCopy).photoSheet;
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const crop = useImageCrop(file, () => {
    setFile(null);
    setError(profileCopy[getActiveLanguage()].photoSheet.unreadable);
  });

  // Every opening starts at the options.
  useEffect(() => {
    if (!isOpen) return;
    setFile(null);
    setError(null);
  }, [isOpen]);

  function pick(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    event.target.value = '';
    if (!picked) return;
    const problem = pickedFileProblem(picked);
    if (problem) {
      setError(copy[problem]);
      return;
    }
    setError(null);
    setFile(picked);
  }

  async function save() {
    setIsExporting(true);
    try {
      const photo = await crop.exportJpeg();
      onClose();
      onSave(photo);
    } catch {
      setError(copy.unreadable);
    } finally {
      setIsExporting(false);
    }
  }

  const isCropping = Boolean(file);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} labelledBy="pf-photo-title" className="pf-sheet pf-photo-sheet">
      {/* Hidden pickers: the front camera, and the gallery. */}
      <input ref={cameraInput} className="pf-photo-input" type="file" accept="image/*" capture="user" tabIndex={-1} aria-hidden="true" onChange={pick} />
      <input ref={galleryInput} className="pf-photo-input" type="file" accept="image/*" tabIndex={-1} aria-hidden="true" onChange={pick} />

      {!isCropping ? (
        <>
          <h2 className="pf-sheet-title" id="pf-photo-title">
            {copy.title}
          </h2>
          <p className="pf-sheet-hint">{copy.hint}</p>
          <ul className="pf-photo-options">
            <li>
              <button type="button" className="pf-photo-option" onClick={() => cameraInput.current?.click()}>
                <span className="pf-photo-option-icon" aria-hidden="true">
                  <IconCamera size={18} />
                </span>
                {copy.camera}
              </button>
            </li>
            <li>
              <button type="button" className="pf-photo-option" onClick={() => galleryInput.current?.click()}>
                <span className="pf-photo-option-icon" aria-hidden="true">
                  <IconPhoto size={18} />
                </span>
                {copy.gallery}
              </button>
            </li>
            {hasPhoto && (
              <li>
                <button
                  type="button"
                  className="pf-photo-option pf-photo-option-remove"
                  onClick={() => {
                    onClose();
                    onRemove();
                  }}
                >
                  <span className="pf-photo-option-icon" aria-hidden="true">
                    <IconTrash size={18} />
                  </span>
                  {copy.remove}
                </button>
              </li>
            )}
          </ul>
        </>
      ) : (
        <>
          <h2 className="pf-sheet-title" id="pf-photo-title">
            {copy.cropTitle}
          </h2>
          <p className="pf-sheet-hint">{copy.cropHint}</p>
          <div
            className="pf-crop"
            role="group"
            tabIndex={0}
            aria-label={copy.cropArea}
            style={
              {
                '--pf-crop-w': `${crop.size?.width ?? 0}px`,
                '--pf-crop-h': `${crop.size?.height ?? 0}px`,
                '--pf-crop-x': `${crop.pan.x}px`,
                '--pf-crop-y': `${crop.pan.y}px`,
                '--pf-crop-zoom': crop.zoom,
              } as CSSProperties
            }
            {...crop.frameProps}
          >
            {crop.url && <img className="pf-crop-image" src={crop.url} alt="" draggable={false} />}
          </div>
          <label className="pf-crop-zoom">
            <IconZoomOut size={18} aria-hidden="true" />
            <input
              type="range"
              min={CROP_MIN_ZOOM}
              max={CROP_MAX_ZOOM}
              step={0.01}
              value={crop.zoom}
              aria-label={copy.zoom}
              onChange={(event) => crop.setZoom(Number(event.target.value))}
            />
            <IconZoomIn size={18} aria-hidden="true" />
          </label>
          <div className="pf-photo-actions">
            <button type="button" className="pf-photo-cancel" onClick={onClose}>
              {copy.cancel}
            </button>
            <button type="button" className="pf-save" disabled={!crop.url || isExporting} onClick={() => void save()}>
              {copy.save}
            </button>
          </div>
        </>
      )}

      {error && (
        <p className="pf-sheet-error" role="alert">
          {error}
        </p>
      )}
    </BottomSheet>
  );
}
