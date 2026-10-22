import type { ChartPoint } from '@sistem/shared';

// Pure helpers of the Profile screen (docs/design/trainee-profile.html): initials, her membership
// week, the weight chart and the sparklines. No React, no copy.

const DAY_MS = 24 * 60 * 60 * 1000;

/** 'מאיה כהן' → 'מכ', 'שקד' → 'שק', 'Dev Trainee Two' → 'DT'. */
export function initialsOf(name: string | null | undefined): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const letters = words.length === 1 ? Array.from(words[0]).slice(0, 2) : [Array.from(words[0])[0], Array.from(words[1])[0]];
  return letters.join('').toUpperCase();
}

function dayNumber(date: string): number {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / DAY_MS);
}

/** The Sunday that starts a date's week (weeks start on Sunday — owner decision), as a day number. */
function sundayOf(date: string): number {
  const day = dayNumber(date);
  // Day 0 (1970-01-01) was a Thursday: +4 makes Sunday = 0.
  return day - ((day + 4) % 7);
}

/** Her week of membership on a date: the week she joined is 1 (never below 1). */
export function memberWeek(joinDate: string, date: string): number {
  return Math.max(1, Math.floor((sundayOf(date) - sundayOf(joinDate)) / 7) + 1);
}

/** '09.2026' — the month she joined (Latin eyebrow). */
export function monthCode(date: string): string {
  return `${date.slice(5, 7)}.${date.slice(0, 4)}`;
}

/** Two digits: 'W06'. */
export function padWeek(week: number): string {
  return String(week).padStart(2, '0');
}

export interface MiniChart {
  /** The SVG path of the line in a 0–width × 0–height box, time running toward the reading end. */
  line: string;
  /** The same, closed down to the bottom (the area under the line). */
  area: string;
  /** The last point, as a fraction of the box (0–1) — drawn as an HTML dot so it stays round. */
  last: { x: number; y: number };
}

/**
 * Lays out a small line chart over the points' own dates. Right-to-left puts the start on the right
 * and now on the left (the design's time axis); left-to-right mirrors it. null under 2 points.
 * `pad` = the value room kept above and below the line (in the points' unit).
 */
export function buildMiniChart(points: ChartPoint[], size: { width: number; height: number }, rtl: boolean, pad = 0): MiniChart | null {
  if (points.length < 2) return null;
  const first = dayNumber(points[0].date);
  const span = Math.max(dayNumber(points[points.length - 1].date) - first, 1);
  const values = points.map((point) => point.value);
  const low = Math.min(...values) - pad;
  const high = Math.max(...values) + pad;
  const range = high - low || 1;
  const flat = high === low;
  const plotted = points.map((point) => {
    const fraction = (dayNumber(point.date) - first) / span;
    const x = (rtl ? 1 - fraction : fraction) * size.width;
    const y = flat ? size.height / 2 : size.height - ((point.value - low) / range) * size.height;
    return { x, y };
  });
  const line = plotted.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  const start = plotted[0];
  const end = plotted[plotted.length - 1];
  const area = `${line} L${end.x.toFixed(1)} ${size.height} L${start.x.toFixed(1)} ${size.height} Z`;
  return { line, area, last: { x: end.x / size.width, y: end.y / size.height } };
}

/** Last minus first value (null under 2 points). */
export function changeSinceFirst(points: ChartPoint[]): number | null {
  return points.length < 2 ? null : points[points.length - 1].value - points[0].value;
}

/** Rounds to the stepper's step without float noise (62.400000001 → 62.4). */
export function roundToStep(value: number, step: number): number {
  return Math.round(Math.round(value / step) * step * 10) / 10;
}
