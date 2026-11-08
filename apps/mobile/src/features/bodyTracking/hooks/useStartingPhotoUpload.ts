import { useEffect, useState } from 'react';
import axios from 'axios';
import type { BodyMetric } from '@sistem/types';
import { fill, useCopy } from '@sistem/shared';
import { uploadStartingPhoto } from '../../../services/bodyMetrics/bodyMetricsService';
import { PhotoReadError, PhotoTooLargeError, compressPhoto } from '../../privatePhotos/data/photoCompression';
import { bodyCopy } from '../copy';

type UploadState = { kind: 'preparing' } | { kind: 'uploading'; percent: number } | null;

function errorText(error: unknown, copy: (typeof bodyCopy)['he']): string {
  if (error instanceof PhotoTooLargeError) return copy.tooLarge;
  if (error instanceof PhotoReadError) return copy.readError;
  if (axios.isAxiosError(error)) {
    if (!error.response) return copy.offline;
    if (error.response.status === 413) return copy.tooLarge;
    return copy.uploadError;
  }
  return copy.readError;
}

export function useStartingPhotoUpload(date: string, onSaved: (metric: BodyMetric | null) => void) {
  const copy = useCopy(bodyCopy);
  const [busy, setBusy] = useState<UploadState>(null);
  const [error, setError] = useState<string>();
  const [localSrc, setLocalSrc] = useState<string>();
  const [pending, setPending] = useState<Blob>();
  const [saved, setSaved] = useState(false);

  useEffect(() => () => {
    if (localSrc) URL.revokeObjectURL(localSrc);
  }, [localSrc]);

  async function upload(photo: Blob) {
    setError(undefined);
    setPending(photo);
    setBusy({ kind: 'uploading', percent: 0 });
    try {
      const response = await uploadStartingPhoto(date, photo, (fraction) => {
        setBusy({ kind: 'uploading', percent: Math.round(fraction * 100) });
      });
      setLocalSrc((current) => {
        if (current) URL.revokeObjectURL(current);
        return URL.createObjectURL(photo);
      });
      setPending(undefined);
      setSaved(true);
      onSaved(response.metric);
    } catch (caught) {
      setError(errorText(caught, copy));
    } finally {
      setBusy(null);
    }
  }

  /** A photo from the camera or the gallery (PhotoSourceTiles). */
  async function pickFile(file: File) {
    setError(undefined);
    setPending(undefined);
    setSaved(false);
    setBusy({ kind: 'preparing' });
    try {
      await upload(await compressPhoto(file));
    } catch (caught) {
      setError(errorText(caught, copy));
      setBusy(null);
    }
  }

  function statusText(): string | undefined {
    if (busy?.kind === 'preparing') return copy.preparing;
    if (busy?.kind === 'uploading') return fill(copy.uploading, { percent: busy.percent });
    return undefined;
  }

  return {
    busy,
    error,
    localSrc,
    saved,
    pickFile,
    canRetry: Boolean(pending),
    retry: () => pending && void upload(pending),
    status: statusText(),
  };
}
