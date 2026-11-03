import { buildLineChart } from '@sistem/shared';
import type { Language } from '@sistem/types';
import type { ChartGeometry, ChartPoint, ChartSize } from '@sistem/shared';

// The measurements screen's chart, on top of the shared chart math (buildLineChart: positions, clean
// y ticks, x labels). Here only the look: a smooth line that never overshoots the points, the area
// under it, and three y labels.

/** The shared geometry (its straight `path` unused here) + the smooth line and the area under it. */
export interface MeasChartGeometry extends ChartGeometry {
  line: string;
  area: string;
}

const f = (value: number) => value.toFixed(1);

/**
 * A monotone cubic curve (Fritsch–Carlson) through the points: smooth, and never higher or lower
 * than its neighbours between two dates — a 72 → 71 step can't dip to 70.6 on the way.
 */
export function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M${f(points[0].x)},${f(points[0].y)}`;
  const n = points.length;
  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    const dx = points[i + 1].x - points[i].x;
    slopes.push(dx === 0 ? 0 : (points[i + 1].y - points[i].y) / dx);
  }
  const tangents = points.map((_, i) => {
    if (i === 0) return slopes[0];
    if (i === n - 1) return slopes[n - 2];
    return slopes[i - 1] * slopes[i] <= 0 ? 0 : (slopes[i - 1] + slopes[i]) / 2;
  });
  for (let i = 0; i < n - 1; i += 1) {
    if (slopes[i] === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
      continue;
    }
    const a = tangents[i] / slopes[i];
    const b = tangents[i + 1] / slopes[i];
    const sum = a * a + b * b;
    if (sum > 9) {
      const t = 3 / Math.sqrt(sum);
      tangents[i] = t * a * slopes[i];
      tangents[i + 1] = t * b * slopes[i];
    }
  }
  let path = `M${f(points[0].x)},${f(points[0].y)}`;
  for (let i = 0; i < n - 1; i += 1) {
    const third = (points[i + 1].x - points[i].x) / 3;
    path += ` C${f(points[i].x + third)},${f(points[i].y + tangents[i] * third)} ${f(points[i + 1].x - third)},${f(points[i + 1].y - tangents[i + 1] * third)} ${f(points[i + 1].x)},${f(points[i + 1].y)}`;
  }
  return path;
}

/** Lowest, middle and highest tick only (the shared math gives up to 5). */
function threeTicks(ticks: ChartGeometry['yTicks']): ChartGeometry['yTicks'] {
  if (ticks.length <= 3) return ticks;
  return [ticks[0], ticks[Math.floor((ticks.length - 1) / 2)], ticks[ticks.length - 1]];
}

/** Null with fewer than 2 points (the screen shows a line of text instead). */
export function buildMeasChart(points: ChartPoint[], size: ChartSize, language: Language): MeasChartGeometry | null {
  const geometry = buildLineChart(points, size, language);
  if (!geometry) return null;
  const line = smoothPath(geometry.points);
  const first = geometry.points[0];
  const last = geometry.points[geometry.points.length - 1];
  const area = `${line} L${f(last.x)},${f(geometry.plot.bottom)} L${f(first.x)},${f(geometry.plot.bottom)} Z`;
  return { ...geometry, line, area, yTicks: threeTicks(geometry.yTicks) };
}
