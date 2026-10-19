import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import axios from 'axios';
import type { BodyMetric, ProgressPhoto, ProgressPhotoPose } from '@sistem/types';
import { IconCamera, IconPhoto } from '@tabler/icons-react';
import { fill, formatDateOnly, poseLabel, useCopy, useLanguage } from '@sistem/shared';
import { Button } from '../../../../components/common/Button/Button';
import { Modal } from '../../../../components/common/Modal/Modal';
import { PrivatePhoto } from '../../../../components/common/PrivatePhoto/PrivatePhoto';
import { removeProgressPhoto, uploadProgressPhoto } from '../../../../services/bodyMetrics/bodyMetricsService';
import { celebrate } from '../../../achievements/celebration';
import { PhotoTooLargeError, compressPhoto } from '../../../privatePhotos/data/photoCompression';
import { bodyCopy } from '../../copy';
import './ProgressPhotoSlot.css';

type BodyCopy = (typeof bodyCopy)['he'];

type Busy = { kind: 'preparing' } | { kind: 'uploading'; percent: number } | { kind: 'removing' } | null;

interface ProgressPhotoSlotProps {
  date: string;
  pose: ProgressPhotoPose;
  photo: ProgressPhoto | undefined;
  /** The day as the server has it now (null: nothing left in it). */
  onDayChange: (metric: BodyMetric | null) => void;
  onLinkExpired: () => void;
}

function uploadErrorMessage(error: unknown, copy: BodyCopy): string {
  if (error instanceof PhotoTooLargeError) return copy.tooLarge;
  if (axios.isAxiosError(error)) {
    if (!error.response) return copy.offline;
    if (error.response.status === 413) return copy.tooLarge;
    return copy.uploadError;
  }
  return copy.readError;
}

/**
 * One pose of one day: camera or gallery → compressed on the phone → uploaded at once
 * as a private photo (the Daily Pump flow). A new pick replaces the pose's photo.
 */
export function ProgressPhotoSlot({ date, pose, photo, onDayChange, onLinkExpired }: ProgressPhotoSlotProps) {
  const language = useLanguage();
  const copy = useCopy(bodyCopy);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  // The picked photo, shown from the phone itself — no download right after the upload.
  const [localSrc, setLocalSrc] = useState<string | null>(null);
  const [pending, setPending] = useState<Blob | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const label = poseLabel(pose, language);

  useEffect(() => () => {
    if (localSrc) URL.revokeObjectURL(localSrc);
  }, [localSrc]);

  async function upload(file: Blob) {
    setError(null);
    setPending(file);
    setBusy({ kind: 'uploading', percent: 0 });
    try {
      const saved = await uploadProgressPhoto(date, pose, file, (fraction) =>
        setBusy({ kind: 'uploading', percent: Math.round(fraction * 100) }),
      );
      setLocalSrc(URL.createObjectURL(file));
      setPending(null);
      onDayChange(saved.metric);
      celebrate(saved.achievementsUnlocked);
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
    let compressed: Blob;
    try {
      compressed = await compressPhoto(file);
    } catch (caught) {
      setBusy(null);
      setError(uploadErrorMessage(caught, copy));
      return;
    }
    await upload(compressed);
  }

  async function handleRemove() {
    setConfirmRemove(false);
    setError(null);
    setBusy({ kind: 'removing' });
    try {
      onDayChange(await removeProgressPhoto(date, pose));
      setLocalSrc(null);
    } catch {
      setError(copy.removeError);
    } finally {
      setBusy(null);
    }
  }

  const status =
    busy?.kind === 'preparing' ? copy.preparing : busy?.kind === 'uploading' ? fill(copy.uploading, { percent: busy.percent }) : null;

  return (
    <section className="progress-photo-slot" aria-label={label}>
      <div className="progress-photo-slot-preview">
        {photo ? (
          <PrivatePhoto
            photo={photo}
            thumbnail
            localSrc={localSrc ?? undefined}
            alt={fill(copy.photoAlt, { pose: label, date: formatDateOnly(date, language) })}
            openLabel={fill(copy.openPhoto, { pose: label })}
            closeLabel={copy.close}
            onLinkExpired={onLinkExpired}
          />
        ) : (
          <div className="progress-photo-slot-empty" aria-hidden="true" />
        )}
      </div>

      <div className="progress-photo-slot-body">
        <h2 className="progress-photo-slot-title display-title">{label}</h2>
        {status && (
          <p className="progress-photo-slot-status" role="status">
            {status}
          </p>
        )}
        {error && (
          <div className="progress-photo-slot-error" role="alert">
            <span>{error}</span>
            {pending && (
              <Button variant="secondary" onClick={() => void upload(pending)}>
                {copy.retry}
              </Button>
            )}
          </div>
        )}
        <Button
          variant="secondary"
          icon={<IconCamera size={20} aria-hidden="true" />}
          onClick={() => cameraRef.current?.click()}
          disabled={busy !== null}
          aria-label={`${copy.takePhoto}: ${label}`}
        >
          {copy.takePhoto}
        </Button>
        <Button
          variant="secondary"
          icon={<IconPhoto size={20} aria-hidden="true" />}
          onClick={() => galleryRef.current?.click()}
          disabled={busy !== null}
          aria-label={`${copy.chooseFromGallery}: ${label}`}
        >
          {copy.chooseFromGallery}
        </Button>
        {photo && (
          <Button
            variant="ghost"
            onClick={() => setConfirmRemove(true)}
            loading={busy?.kind === 'removing'}
            disabled={busy !== null}
            aria-label={`${copy.remove}: ${label}`}
          >
            {copy.remove}
          </Button>
        )}
      </div>

      {/* `capture` opens the camera directly; without it the phone offers its photo library. */}
      <input ref={cameraRef} className="progress-photo-slot-input" type="file" accept="image/*" capture onChange={handlePicked} />
      <input ref={galleryRef} className="progress-photo-slot-input" type="file" accept="image/*" onChange={handlePicked} />

      <Modal isOpen={confirmRemove} onClose={() => setConfirmRemove(false)} variant="flat" title={copy.removeTitle}>
        <div className="progress-photo-slot-dialog">
          <Button variant="danger" onClick={() => void handleRemove()}>
            {copy.remove}
          </Button>
          <Button variant="ghost" onClick={() => setConfirmRemove(false)}>
            {copy.cancel}
          </Button>
        </div>
      </Modal>
    </section>
  );
}
