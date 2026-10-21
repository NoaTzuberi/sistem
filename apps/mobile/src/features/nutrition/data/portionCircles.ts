import type { PortionCounts, PortionGroup } from '@sistem/types';

// The day tracker's marks (Phase 13a+), as plain functions. Marks always fill from the start,
// so only the count matters — she never says which meal a portion was.

const STEP = 0.5;

export interface Circle {
  /** 1, or 0.5 for the planned half portion at the end. */
  size: number;
  /** How much of it is marked: 0, 0.5 or 1 (never more than its size). */
  filled: number;
}

/** One circle per planned portion; a planned half is a half-size circle (Home's read-only pips). */
export function circlesFor(planned: number, eaten: number): Circle[] {
  const circles: Circle[] = [];
  let left = eaten;
  for (let remaining = planned; remaining > 0; remaining -= 1) {
    const size = Math.min(1, remaining);
    const filled = Math.max(0, Math.min(size, left));
    circles.push({ size, filled });
    left -= filled;
  }
  return circles;
}

/** A portion on the Nutrition tab's fuel bar: its number (1, 2, …) and its half-cells' indexes. */
export interface FuelCapsule {
  portion: number;
  /** Two half-cells, or one for a planned half portion at the end. */
  cells: number[];
}

/** One half-cell per planned half portion, paired into capsules. */
export function fuelCapsules(planned: number): FuelCapsule[] {
  const total = Math.round(planned / STEP);
  const capsules: FuelCapsule[] = [];
  for (let cell = 0; cell < total; cell += 2) {
    capsules.push({ portion: cell / 2 + 1, cells: cell + 1 < total ? [cell, cell + 1] : [cell] });
  }
  return capsules;
}

/** How many half-cells are filled (all of them when she is over the goal). */
export function filledCells(planned: number, eaten: number): number {
  return Math.min(Math.round(planned / STEP), Math.round(eaten / STEP));
}

/** The value of filling up to (and including) a half-cell. */
export function cellValue(cell: number): number {
  return (cell + 1) * STEP;
}

/** Tap a cell = fill up to it; tap the last filled cell = empty it. */
export function tapCell(cell: number, planned: number, eaten: number): number {
  return cell === filledCells(planned, eaten) - 1 ? cell * STEP : cellValue(cell);
}

export function withGroup(eaten: PortionCounts, group: PortionGroup, value: number): PortionCounts {
  return { ...eaten, [group]: value };
}
