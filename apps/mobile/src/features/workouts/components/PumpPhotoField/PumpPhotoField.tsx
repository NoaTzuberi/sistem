import { fill, useCopy } from '@sistem/shared';
import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import axios from 'axios';
import type { WorkoutLog } from '@sistem/types';
import { IconCamera, IconLock, IconPhoto } from '@tabler/icons-react';
import { Eyebrow } from '../../../../components/common/Eyebrow/Eyebrow';
import { appCopy } from '../../../../copy';
import { Button } from '../../../../components/common/Button/Button';
import { Modal } from '../../../../components/common/Modal/Modal';
import { PrivatePhoto } from '../../../../components/common/PrivatePhoto/PrivatePhoto';
import { removePumpPhoto, uploadPumpPhoto } from '../../../../services/workoutLogs/workoutLogsService';
import { PhotoTooLargeError, compressPhoto } from '../../../privatePhotos/data/photoCompression';
import { workoutCopy } from '../../copy';
import './PumpPhotoField.css';

type Busy = { kind: 'preparing' } | { kind: 'uploading'; percent: number } | { kind: 'removing' } | null;

interface PumpPhotoFieldProps {
  log: WorkoutLog;
  onLogChange: (log: WorkoutLog) => void;
  /** The signed link expired while the screen was open: fetch the log again. */
  onLinkExpired: () => void;
}

function uploadErrorMessage(error: unknown, copy: (typeof workoutCopy)['he']): string {
  if (error instanceof PhotoTooLargeError) return copy.pumpPhoto.tooLarge;
  if (axios.isAxiosError(error)) {
    if (!error.response) return copy.pumpPhoto.offline;
    if (error.response.status === 413) return copy.pumpPhoto.tooLarge;
    return copy.pumpPhoto.uploadError;
  }
  return copy.pumpPhoto.readError;
}

/**
 * The Daily Pump photo (PRD §5.3): camera or gallery → compressed on the phone →
 * uploaded at once as a private photo (only she and her coach can see it; compression drops
 * EXIF / GPS). A soft card with round camera / gallery buttons. A new pick
 * replaces the photo. Separate from the rating / notes save, so a slow or failed
 * upload never blocks them.
 */
export function PumpPhotoField({ log, onLogChange, onLinkExpired }: PumpPhotoFieldProps) {
  const copy = useCopy(workoutCopy);
  const eyebrow = useCopy(appCopy).eyebrow;
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  // The picked photo, shown from the phone itself — no download right after the upload.
  const [localSrc, setLocalSrc] = useState<string | null>(null);
  const [pending, setPending] = useState<Blob | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => () => {
    if (localSrc) URL.revokeObjectURL(localSrc);
  }, [localSrc]);

  async function upload(photo: Blob) {
    setError(null);
    setPending(photo);
    setBusy({ kind: 'uploading', percent: 0 });
    try {
      const updated = await uploadPumpPhoto(log.id, photo, (fraction) =>
        setBusy({ kind: 'uploading', percent: Math.round(fraction * 100) }),
      );
      setLocalSrc(URL.createObjectURL(photo));
      setPending(null);
      onLogChange(updated);
    } catch (caught) {
      setError(uploadErrorMessage(caught, copy));
    } finally {
      setBusy(null);
    }
  }

  async function handlePicked(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Cleared so picking the same file again still fires a change.
    event.target.value = '';
    if (!file) return;
    setError(null);
    setBusy({ kind: 'preparing' });
    let photo: Blob;
    try {
      photo = await compressPhoto(file);
    } catch (caught) {
      setBusy(null);
      setError(uploadErrorMessage(caught, copy));
      return;
    }
    await upload(photo);
  }

  async function handleRemove() {
    setConfirmRemove(false);
    setError(null);
    setBusy({ kind: 'removing' });
    try {
      onLogChange(await removePumpPhoto(log.id));
      setLocalSrc(null);
    } catch {
      setError(copy.pumpPhoto.removeError);
    } finally {
      setBusy(null);
    }
  }

  const status =
    busy?.kind === 'preparing'
      ? copy.pumpPhoto.preparing
      : busy?.kind === 'uploading'
        ? fill(copy.pumpPhoto.uploading, { percent: busy.percent })
        : null;

  return (
    <section className="ws-section" aria-labelledby="pump-photo-title">
      <h2 className="ws-section-title" id="pump-photo-title">
        <Eyebrow>{eyebrow.dailyPump}</Eyebrow>
        {copy.finish.pumpSection}
      </h2>

      <div className="ws-pump">
        <span className="ws-pump-icon" aria-hidden="true">
          <IconCamera size={22} stroke={2} />
        </span>
        <div className="ws-pump-text">
          <b dir="ltr">{copy.pumpPhoto.title}</b>
          <small>
            <IconLock size={12} stroke={2.2} aria-hidden="true" />
            {copy.pumpPhoto.privacy}
          </small>
        </div>
        <div className="ws-pump-buttons">
          <button type="button" aria-label={copy.pumpPhoto.takePhoto} onClick={() => cameraRef.current?.click()} disabled={busy !== null}>
            <IconCamera size={18} stroke={2} aria-hidden="true" />
          </button>
          <button type="button" aria-label={copy.pumpPhoto.chooseFromGallery} onClick={() => galleryRef.current?.click()} disabled={busy !== null}>
            <IconPhoto size={18} stroke={2} aria-hidden="true" />
          </button>
        </div>
      </div>

      {log.pumpPhoto && (
        <div className="ws-pump-photo">
          <PrivatePhoto
            photo={log.pumpPhoto}
            localSrc={localSrc ?? undefined}
            alt={copy.pumpPhoto.alt}
            openLabel={copy.pumpPhoto.open}
            closeLabel={copy.summary.close}
            onLinkExpired={onLinkExpired}
          />
          <button type="button" className="ws-pump-remove" onClick={() => setConfirmRemove(true)} disabled={busy !== null}>
            {copy.pumpPhoto.remove}
          </button>
        </div>
      )}

      {status && (
        <p className="ws-pump-status" role="status">
          {status}
        </p>
      )}
      {error && (
        <div className="ws-pump-error" role="alert">
          <span>{error}</span>
          {pending && (
            <Button variant="secondary" onClick={() => void upload(pending)}>
              {copy.pumpPhoto.retry}
            </Button>
          )}
        </div>
      )}

      {/* `capture` opens the camera directly; without it the phone offers its photo library. */}
      <input ref={cameraRef} className="ws-pump-input" type="file" accept="image/*" capture onChange={handlePicked} />
      <input ref={galleryRef} className="ws-pump-input" type="file" accept="image/*" onChange={handlePicked} />

      <Modal isOpen={confirmRemove} onClose={() => setConfirmRemove(false)} variant="flat" title={copy.pumpPhoto.removeTitle}>
        <div className="ws-pump-dialog">
          <Button variant="danger" onClick={() => void handleRemove()} loading={busy?.kind === 'removing'}>
            {copy.pumpPhoto.removeConfirm}
          </Button>
          <Button variant="ghost" onClick={() => setConfirmRemove(false)}>
            {copy.pumpPhoto.cancel}
          </Button>
        </div>
      </Modal>
    </section>
  );
}
