import { useCallback, useMemo, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import type { BodyMetric, PrivatePhoto, ProgressPhotoPose, WorkoutLog } from '@sistem/types';
import { PROGRESS_PHOTO_POSES, todayInTimezone, useLoad } from '@sistem/shared';
import { listWorkoutLogs } from '../../../services/workoutLogs/workoutLogsService';

export type ProfilePhotoKind = 'starting' | 'pose' | 'pump';

export interface ProfilePhoto {
  key: string;
  /** 'YYYY-MM-DD' in her zone. */
  date: string;
  kind: ProfilePhotoKind;
  pose?: ProgressPhotoPose;
  photo: PrivatePhoto;
}

const KIND_ORDER: Record<ProfilePhotoKind, number> = { starting: 0, pose: 1, pump: 2 };
// The divider never reaches the frame's edge (its handle stays on screen).
const MIN_POSITION = 4;
const MAX_POSITION = 96;
const KEY_STEP = 5;

function clamp(value: number): number {
  return Math.min(MAX_POSITION, Math.max(MIN_POSITION, value));
}

/**
 * Every private photo she has, oldest first: the starting photo, the front / side / back progress
 * photos (GET /body-metrics) and her Daily Pump photos (GET /workout-logs). Only signed links — the
 * server checked that they are hers.
 */
export function collectPhotos(metrics: BodyMetric[], logs: WorkoutLog[], timezone: string): ProfilePhoto[] {
  const photos: ProfilePhoto[] = [];
  for (const metric of metrics) {
    if (metric.startingPhoto) photos.push({ key: `starting:${metric.date}`, date: metric.date, kind: 'starting', photo: metric.startingPhoto });
    for (const pose of PROGRESS_PHOTO_POSES) {
      const photo = metric.photos.find((item) => item.pose === pose);
      if (photo) photos.push({ key: `pose:${metric.date}:${pose}`, date: metric.date, kind: 'pose', pose, photo });
    }
  }
  for (const log of logs) {
    if (log.status !== 'completed' || !log.pumpPhoto) continue;
    const date = todayInTimezone(timezone, new Date(log.finishedAt ?? log.startedAt));
    photos.push({ key: `pump:${log.id}`, date, kind: 'pump', photo: log.pumpPhoto });
  }
  return photos.sort((a, b) => a.date.localeCompare(b.date) || KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
}

/**
 * Her photos for the Photos tab: the body days she already has (the Body tab's list) + her workout
 * logs' Daily Pump photos. The logs are optional: if they fail, the body photos still show.
 */
export function useProfilePhotos(metrics: BodyMetric[] | undefined, timezone: string, loadError: string) {
  const logs = useLoad(listWorkoutLogs, loadError);
  const photos = useMemo(() => (metrics ? collectPhotos(metrics, logs.data ?? [], timezone) : []), [metrics, logs.data, timezone]);
  return { photos, isReady: metrics !== undefined && (logs.data !== undefined || logs.error !== undefined), reloadLogs: logs.reload };
}

/**
 * The before / after compare: "before" = her first photo, "after" = the latest one or the one she
 * tapped in the grid. The divider is a percentage from the reading start (right in Hebrew), moved by
 * dragging anywhere on the frame or with the arrow keys on its handle (role=slider).
 */
export function usePhotoCompare(photos: ProfilePhoto[], rtl: boolean) {
  const [chosenKey, setChosenKey] = useState<string | null>(null);
  const [position, setPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const before = photos[0] ?? null;
  const latest = photos[photos.length - 1] ?? null;
  const after = useMemo(() => {
    const chosen = chosenKey ? photos.find((photo) => photo.key === chosenKey) : undefined;
    return chosen && chosen.key !== before?.key ? chosen : latest;
  }, [photos, chosenKey, before, latest]);

  const fromPointer = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const fraction = rtl ? (rect.right - event.clientX) / rect.width : (event.clientX - rect.left) / rect.width;
      setPosition(clamp(fraction * 100));
    },
    [rtl],
  );

  const frameHandlers = {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      setIsDragging(true);
      fromPointer(event);
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      if (isDragging) fromPointer(event);
    },
    onPointerUp: () => setIsDragging(false),
    onPointerCancel: () => setIsDragging(false),
  };

  // The arrows move the divider the way they point on screen (left in Hebrew = toward "today").
  function onHandleKeyDown(event: KeyboardEvent<HTMLElement>) {
    const toEnd = rtl ? 'ArrowLeft' : 'ArrowRight';
    const toStart = rtl ? 'ArrowRight' : 'ArrowLeft';
    let next: number | null = null;
    if (event.key === toEnd || event.key === 'ArrowUp') next = position + KEY_STEP;
    else if (event.key === toStart || event.key === 'ArrowDown') next = position - KEY_STEP;
    else if (event.key === 'Home') next = MIN_POSITION;
    else if (event.key === 'End') next = MAX_POSITION;
    if (next === null) return;
    event.preventDefault();
    setPosition(clamp(next));
  }

  return {
    before,
    after,
    isLatest: after?.key === latest?.key,
    canCompare: before !== null && after !== null && before.key !== after.key,
    choose: setChosenKey,
    position: Math.round(position * 10) / 10,
    isDragging,
    frameHandlers,
    onHandleKeyDown,
    limits: { min: MIN_POSITION, max: MAX_POSITION },
  };
}
