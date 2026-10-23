import { useMemo, useState } from 'react';
import { getActiveLanguage, todayInTimezone } from '@sistem/shared';
import type { ProgressPhotoPose } from '@sistem/types';
import { useAuth } from '../../../services/auth/AuthContext';
import { profileCopy } from '../copy';
import { groupByMonth, progressItems, startingOf } from '../data/progressTimeline';
import { memberWeek } from '../data/profileDisplay';
import { collectPhotos } from './usePhotoCompare';
import { useMyBodyMetrics, useMyUnits } from './useMyBody';
import { useProgressPhotoUpload } from './useProgressPhotoUpload';
import type { PhotoTarget } from './useProgressPhotoUpload';

/**
 * The progress photos screen: her starting photo, the progress photos (newest first, by month), the
 * photos the compare uses (starting + poses, oldest first), the add sheet and the viewer.
 */
export function useProgressPhotosScreen(onToast: (text: string) => void) {
  const { user } = useAuth();
  const { list, error, isLoading, reload, applyDay } = useMyBodyMetrics();
  const { today } = useMyUnits();
  const timezone = user?.timezone ?? 'UTC';
  const joinDate = user ? todayInTimezone(timezone, new Date(user.createdAt)) : null;
  const [sheet, setSheet] = useState<'starting' | 'pose' | null>(null);
  const [viewerKey, setViewerKey] = useState<string | null>(null);

  const metrics = useMemo(() => list?.items ?? [], [list]);
  const starting = useMemo(() => startingOf(metrics), [metrics]);
  const items = useMemo(() => progressItems(metrics), [metrics]);
  const groups = useMemo(() => groupByMonth(items), [items]);
  const comparePhotos = useMemo(() => collectPhotos(metrics, [], timezone), [metrics, timezone]);

  const photos = useProgressPhotoUpload(today, (date, metric) => {
    applyDay(date, metric);
    reload();
  });

  async function pick(file: File, target: PhotoTarget) {
    if (await photos.upload(file, target)) {
      setSheet(null);
      onToast(profileCopy[getActiveLanguage()].pp.saved);
    }
  }

  async function remove(date: string, pose: ProgressPhotoPose) {
    if (await photos.remove(date, pose)) {
      setViewerKey(null);
      onToast(profileCopy[getActiveLanguage()].pp.deleted);
    }
  }

  return {
    list,
    error,
    isLoading,
    reload,
    starting,
    items,
    groups,
    comparePhotos,
    weekOf: (date: string) => (joinDate ? memberWeek(joinDate, date) : 1),
    selfGuided: user?.coachingStatus == null,
    sheet,
    openSheet: (mode: 'starting' | 'pose') => {
      photos.clearError();
      setSheet(mode);
    },
    closeSheet: () => setSheet(null),
    viewerKey,
    setViewerKey,
    pick,
    remove,
    upload: photos,
  };
}
