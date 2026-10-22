import { useMemo, useState } from 'react';
import type { SaveBodyMetricPayload, UnitPreferences } from '@sistem/types';
import { measurementPoints, pointsInRange, toCm, toKg, weighIns, weightPoints } from '@sistem/shared';
import type { ChartPoint } from '@sistem/shared';
import { saveBodyMetric } from '../../../services/bodyMetrics/bodyMetricsService';
import { celebrate } from '../../achievements/celebration';
import { changeSinceFirst } from '../data/profileDisplay';
import { useMyBodyMetrics } from './useMyBody';

export type WeightRange = 'month' | 'all';

export interface MeasurementRow {
  id: string;
  /** Oldest first, in her length unit. */
  points: ChartPoint[];
  current: number;
  /** Since her first entry of this measurement; null with one entry. */
  change: number | null;
}

/** What the measurement sheet sends: values in her units; measurements only the ones she changed. */
export interface MeasurementEntry {
  weight: number;
  measurements: Record<string, number>;
}

/**
 * Her body numbers for the Body tab (GET /body-metrics): weight over a range, each measurement since
 * its first entry, the last values (the sheet starts from them), and saving a new entry for today.
 * Values arrive in kg / cm and are shown in her units; a save is the same PUT the coach reads.
 */
export function useMeasurements(units: UnitPreferences, today: string) {
  const body = useMyBodyMetrics();
  const [range, setRange] = useState<WeightRange>('all');
  const items = body.list?.items;

  const weight = useMemo(() => {
    if (!items) return null;
    const all = weightPoints(items, units.weight);
    const visible = range === 'month' ? pointsInRange(all, '1M', today) : all;
    const latest = weighIns(items)[0];
    return {
      all,
      visible,
      change: changeSinceFirst(visible),
      latest: latest ? { date: latest.date, value: all[all.length - 1].value } : null,
      /** The first weigh-in's date: the chart's start label (W01 …). */
      firstDate: all[0]?.date ?? null,
    };
  }, [items, units.weight, range, today]);

  const measurements: MeasurementRow[] = useMemo(() => {
    if (!body.list) return [];
    const list = body.list;
    return list.measurementIds.flatMap((id) => {
      const points = measurementPoints(list.items, id, units.length);
      if (points.length === 0) return [];
      return [{ id, points, current: points[points.length - 1].value, change: changeSinceFirst(points) }];
    });
  }, [body.list, units.length]);

  /** The sheet's starting values (her units): the latest weight and each measurement's latest value. */
  const lastValues = useMemo(
    () => ({
      weight: weight?.latest?.value ?? null,
      measurements: Object.fromEntries(measurements.map((row) => [row.id, row.current])) as Record<string, number>,
    }),
    [weight, measurements],
  );

  async function saveEntry(entry: MeasurementEntry): Promise<void> {
    const payload: SaveBodyMetricPayload = { weight: toKg(entry.weight, units.weight) };
    const changed = Object.entries(entry.measurements);
    if (changed.length > 0) {
      payload.measurements = Object.fromEntries(changed.map(([id, value]) => [id, toCm(value, units.length)]));
    }
    const saved = await saveBodyMetric(today, payload);
    body.applyDay(today, saved.metric);
    celebrate(saved.achievementsUnlocked);
  }

  return {
    list: body.list,
    error: body.error,
    reload: body.reload,
    range,
    setRange,
    weight,
    measurements,
    measurementIds: body.list?.measurementIds ?? [],
    lastValues,
    saveEntry,
  };
}
