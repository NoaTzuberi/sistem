import { useState } from 'react';
import type { BodyMetric, ProgressPhotoPose } from '@sistem/types';
import { photoDatesForPose, photoForPose } from '@sistem/shared';

export type CompareMode = 'side' | 'slide';

interface Choice {
  before: string;
  after: string;
}

/** First and latest day of a pose: the default before / after. */
function defaultChoice(dates: string[]): Choice {
  return { before: dates[0] ?? '', after: dates[dates.length - 1] ?? '' };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Photo compare (logic unchanged): one pose on two days. Opens on the first and the latest day; each side can
 * pick any day that has a photo of that pose. Adds the view (side by side / slider) and the days between them.
 */
export function usePhotoComparison(metrics: BodyMetric[]) {
  const [pose, setPose] = useState<ProgressPhotoPose>('front');
  const [mode, setMode] = useState<CompareMode>('side');
  const dates = photoDatesForPose(metrics, pose);
  const [choice, setChoice] = useState<Choice>(() => defaultChoice(dates));
  // A pick that no longer has a photo (another pose, a removed photo) falls back to the default.
  const before = dates.includes(choice.before) ? choice.before : defaultChoice(dates).before;
  const after = dates.includes(choice.after) ? choice.after : defaultChoice(dates).after;
  const side = (date: string) => {
    const metric = metrics.find((item) => item.date === date);
    return { date, metric, photo: photoForPose(metric, pose) };
  };

  return {
    pose,
    changePose: (next: ProgressPhotoPose) => {
      setPose(next);
      setChoice(defaultChoice(photoDatesForPose(metrics, next)));
    },
    mode,
    setMode,
    dates,
    canCompare: dates.length >= 2,
    before: side(before),
    after: side(after),
    setBefore: (date: string) => setChoice({ before: date, after }),
    setAfter: (date: string) => setChoice({ before, after: date }),
    /** Whole days between the two dates (dates are 'YYYY-MM-DD'). */
    daysBetween: before && after ? Math.round(Math.abs(Date.parse(`${after}T00:00:00Z`) - Date.parse(`${before}T00:00:00Z`)) / DAY_MS) : 0,
  };
}
