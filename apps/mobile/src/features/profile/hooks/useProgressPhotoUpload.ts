import { useState } from 'react';
import axios from 'axios';
import type { BodyMetric, ProgressPhotoPose } from '@sistem/types';
import { fill, getActiveLanguage } from '@sistem/shared';
import { removeProgressPhoto, uploadProgressPhoto, uploadStartingPhoto } from '../../../services/bodyMetrics/bodyMetricsService';
import { PhotoReadError, PhotoTooLargeError, compressPhoto } from '../../privatePhotos/data/photoCompression';
import { bodyCopy } from '../../bodyTracking/copy';

export type PhotoTarget = { kind: 'starting' } | { kind: 'pose'; pose: ProgressPhotoPose };

function errorText(error: unknown): string {
  const copy = bodyCopy[getActiveLanguage()];
  if (error instanceof PhotoTooLargeError) return copy.tooLarge;
  if (error instanceof PhotoReadError) return copy.readError;
  if (axios.isAxiosError(error)) {
    if (!error.response) return copy.offline;
    if (error.response.status === 413) return copy.tooLarge;
    return copy.uploadError;
  }
  return copy.readError;
}

/**
 * Adds a photo for today (her zone): the starting photo, or a front / side / back progress photo
 * (the same pose again on the same day replaces it). Compressed on the phone first (EXIF / GPS
 * dropped), then a private upload. Delete removes one pose of one day.
 */
export function useProgressPhotoUpload(today: string, onSaved: (date: string, metric: BodyMetric | null) => void) {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function upload(file: File, target: PhotoTarget): Promise<boolean> {
    const copy = bodyCopy[getActiveLanguage()];
    setError(null);
    setIsBusy(true);
    setStatus(copy.preparing);
    try {
      const photo = await compressPhoto(file);
      const progress = (fraction: number) => setStatus(fill(copy.uploading, { percent: Math.round(fraction * 100) }));
      const response =
        target.kind === 'starting' ? await uploadStartingPhoto(today, photo, progress) : await uploadProgressPhoto(today, target.pose, photo, progress);
      onSaved(today, response.metric);
      return true;
    } catch (caught) {
      setError(errorText(caught));
      return false;
    } finally {
      setIsBusy(false);
      setStatus(null);
    }
  }

  async function remove(date: string, pose: ProgressPhotoPose): Promise<boolean> {
    setError(null);
    setIsBusy(true);
    try {
      onSaved(date, await removeProgressPhoto(date, pose));
      return true;
    } catch (caught) {
      setError(axios.isAxiosError(caught) && !caught.response ? bodyCopy[getActiveLanguage()].offline : bodyCopy[getActiveLanguage()].removeError);
      return false;
    } finally {
      setIsBusy(false);
    }
  }

  return { upload, remove, status, error, isBusy, clearError: () => setError(null) };
}
