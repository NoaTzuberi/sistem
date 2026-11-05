import { useMemo, useState } from 'react';
import { defaultChartRange, pointsInRange, rangeChange } from '@sistem/shared';
import type { ChartPoint, ChartRange } from '@sistem/shared';

/**
 * One series on the coach's Body tab (her weight or one measurement): the same range / change / tapped point
 * rules as her own weight and measurements screens, kept in local state (coach mode has no URL for it).
 * A new `seriesKey` (another measurement) goes back to the default range and drops the tapped point.
 */
export function useTraineeBodyTrend(points: ChartPoint[], today: string, seriesKey = '') {
  const [picked, setPicked] = useState<{ key: string; range: ChartRange } | null>(null);
  const [tapped, setTapped] = useState<{ key: string; index: number } | null>(null);
  const range = picked?.key === seriesKey ? picked.range : defaultChartRange(points, today);
  const visible = useMemo(() => pointsInRange(points, range, today), [points, range, today]);
  const tappedIndex = tapped?.key === seriesKey && tapped.index < visible.length ? tapped.index : null;

  return {
    total: points.length,
    latest: points[points.length - 1] ?? null,
    range,
    selectRange: (next: ChartRange) => {
      setPicked({ key: seriesKey, range: next });
      setTapped(null);
    },
    visible,
    change: rangeChange(visible),
    tappedIndex,
    tap: (index: number | null) => setTapped(index === null ? null : { key: seriesKey, index }),
  };
}
