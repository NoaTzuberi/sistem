import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { defaultChartRange, measurementDays, measurementPoints, pointsInRange, rangeChange } from '@sistem/shared';
import type { ChartPoint, ChartRange } from '@sistem/shared';
import { useMyBodyMetrics, useMyUnits } from './useMyBody';

/**
 * The measurements screen ("מידות"): which measurement is shown (from `?m=` when she tapped one on the
 * Profile, else the first one with data), its points in her unit, the range (3 months when she has
 * older data, else everything — reset when she switches measurement), the latest value, the change
 * over the range, the tapped point for the tooltip, and every day with measurements (newest first).
 */
export function useMeasurementTrend() {
  const body = useMyBodyMetrics();
  const { units, today } = useMyUnits();
  const [params, setParams] = useSearchParams();
  const [pickedRange, setPickedRange] = useState<ChartRange | null>(null);
  const [tapped, setTapped] = useState<number | null>(null);
  const list = body.list;

  const days = useMemo(() => (list ? measurementDays(list.items) : []), [list]);
  const ids = list?.measurementIds ?? [];
  const asked = params.get('m');
  const firstLogged = ids.find((id) => days.some((day) => day.measurements[id] !== undefined));
  const measurementId = (asked && ids.includes(asked) ? asked : null) ?? firstLogged ?? ids[0] ?? '';

  const points: ChartPoint[] = useMemo(
    () => (list && measurementId ? measurementPoints(list.items, measurementId, units.length) : []),
    [list, measurementId, units.length],
  );
  const range = pickedRange ?? defaultChartRange(points, today);
  const visible = useMemo(() => pointsInRange(points, range, today), [points, range, today]);
  const tappedIndex = tapped !== null && tapped < visible.length ? tapped : null;

  function selectMeasurement(id: string) {
    if (id === measurementId) return;
    // In the URL (replace: no extra back step), so a reload or back from an entry keeps it.
    const next = new URLSearchParams(params);
    next.set('m', id);
    setParams(next, { replace: true });
    setPickedRange(null);
    setTapped(null);
  }

  function selectRange(next: ChartRange) {
    setPickedRange(next);
    setTapped(null);
  }

  return {
    list,
    error: body.error,
    isLoading: body.isLoading,
    reload: body.reload,
    unit: units.length,
    ids,
    measurementId,
    selectMeasurement,
    /** Every point of this measurement (the "one more entry" line needs the total). */
    total: points.length,
    latest: points[points.length - 1] ?? null,
    range,
    selectRange,
    visible,
    /** The change over the visible range; null under 2 points. */
    change: rangeChange(visible),
    tappedIndex,
    tap: setTapped,
    days,
  };
}
