import { useMemo, useState } from 'react';
import { defaultChartRange, pointsInRange, rangeChange, weightPoints } from '@sistem/shared';
import type { ChartRange } from '@sistem/shared';
import { useMyBodyMetrics, useMyUnits } from './useMyBody';

/**
 * The weight screen (like useMeasurementTrend, one series): her weigh-ins in her unit, the range (3 months
 * when she has older data, else everything), the latest value, the change over the range, the tapped point.
 */
export function useWeightTrend() {
  const body = useMyBodyMetrics();
  const { units, today } = useMyUnits();
  const [pickedRange, setPickedRange] = useState<ChartRange | null>(null);
  const [tapped, setTapped] = useState<number | null>(null);
  const list = body.list;

  const points = useMemo(() => (list ? weightPoints(list.items, units.weight) : []), [list, units.weight]);
  const range = pickedRange ?? defaultChartRange(points, today);
  const visible = useMemo(() => pointsInRange(points, range, today), [points, range, today]);

  return {
    body,
    unit: units.weight,
    today,
    total: points.length,
    latest: points[points.length - 1] ?? null,
    range,
    selectRange: (next: ChartRange) => {
      setPickedRange(next);
      setTapped(null);
    },
    visible,
    change: rangeChange(visible),
    tappedIndex: tapped !== null && tapped < visible.length ? tapped : null,
    tap: setTapped,
  };
}
