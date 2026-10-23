import type { BodyMetric, PrivatePhoto, ProgressPhotoPose } from '@sistem/types';
import { PROGRESS_PHOTO_POSES } from '@sistem/shared';

// The progress photos screen (pure): her starting photo, every front / side / back photo newest first,
// and the timeline grouped by month.

export interface ProgressItem {
  key: string;
  /** 'YYYY-MM-DD' in her zone. */
  date: string;
  pose: ProgressPhotoPose;
  photo: PrivatePhoto;
}

export interface StartingItem {
  date: string;
  photo: PrivatePhoto;
}

export function startingOf(metrics: BodyMetric[]): StartingItem | null {
  const metric = metrics.find((item) => item.startingPhoto);
  return metric?.startingPhoto ? { date: metric.date, photo: metric.startingPhoto } : null;
}

/** Newest day first; front / side / back within a day. */
export function progressItems(metrics: BodyMetric[]): ProgressItem[] {
  const items: ProgressItem[] = [];
  for (const metric of [...metrics].sort((a, b) => b.date.localeCompare(a.date))) {
    for (const pose of PROGRESS_PHOTO_POSES) {
      const photo = metric.photos.find((item) => item.pose === pose);
      if (photo) items.push({ key: `${metric.date}:${pose}`, date: metric.date, pose, photo });
    }
  }
  return items;
}

export interface MonthGroup {
  /** 'YYYY-MM'. */
  month: string;
  items: ProgressItem[];
}

export function groupByMonth(items: ProgressItem[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  for (const item of items) {
    const month = item.date.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last && last.month === month) last.items.push(item);
    else groups.push({ month, items: [item] });
  }
  return groups;
}

/** "10.2026" — the month's mono eyebrow (Latin, decorative). */
export function monthEyebrow(month: string): string {
  return `${month.slice(5, 7)}.${month.slice(0, 4)}`;
}

/** "W05" — the membership week chip. */
export function weekChip(week: number): string {
  return `W${String(week).padStart(2, '0')}`;
}
