import { useEffect, useRef } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import { fill, formatNumber, formatPortionCount, useCopy, useLanguage } from '@sistem/shared';
import { cellValue, filledCells, fuelCapsules, tapCell } from '../../data/portionCircles';
import { nutritionCopy } from '../../copy';
import './FuelBar.css';

interface FuelBarProps {
  groupLabel: string;
  planned: number;
  eaten: number;
  disabled: boolean;
  onChange: (value: number) => void;
}

/** A pointer that moved less than this is a tap (the cell's own click handles it). */
const DRAG_THRESHOLD_PX = 6;

interface DragState {
  pointerId: number;
  startX: number;
  active: boolean;
}

/**
 * One group's portions as a row of "fuel cells": a capsule per portion, two half-cells each (a planned
 * half = one half-cell). Tap a cell = fill up to it, tap the last filled one = empty it, drag along the
 * bar = fill / empty live. Each cell is a button, so Enter / Space do the same as a tap.
 */
export function FuelBar({ groupLabel, planned, eaten, disabled, onChange }: FuelBarProps) {
  const language = useLanguage();
  const copy = useCopy(nutritionCopy);
  const barRef = useRef<HTMLDivElement>(null);
  const drag = useRef<DragState | null>(null);
  // A drag ends with a click on the bar or a cell; that click must not count as a tap.
  const suppressClick = useRef(false);

  const capsules = fuelCapsules(planned);
  const filled = filledCells(planned, eaten);
  // The cells that changed fill one after the other, from the side that moved.
  const previous = useRef(filled);
  const from = previous.current;
  useEffect(() => {
    previous.current = filled;
  }, [filled]);

  function cellOrder(cell: number): number {
    if (filled > from && cell >= from && cell < filled) return cell - from;
    if (filled < from && cell >= filled && cell < from) return from - 1 - cell;
    return 0;
  }

  /** The value under the pointer: up to the cell it is on (or the nearest), 0 before the first. */
  function valueAt(clientX: number): number {
    const bar = barRef.current;
    if (!bar) return eaten;
    const cells = [...bar.querySelectorAll<HTMLElement>('[data-cell]')];
    if (cells.length === 0) return eaten;
    const rtl = getComputedStyle(bar).direction === 'rtl';
    const first = cells[0].getBoundingClientRect();
    if (rtl ? clientX > first.right : clientX < first.left) return 0;
    let nearest = 0;
    let nearestDistance = Infinity;
    cells.forEach((cell, index) => {
      const rect = cell.getBoundingClientRect();
      const distance = clientX < rect.left ? rect.left - clientX : clientX > rect.right ? clientX - rect.right : 0;
      if (distance < nearestDistance) {
        nearest = index;
        nearestDistance = distance;
      }
    });
    return cellValue(nearest);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (disabled || event.button !== 0) return;
    drag.current = { pointerId: event.pointerId, startX: event.clientX, active: false };
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    if (!state.active) {
      if (Math.abs(event.clientX - state.startX) < DRAG_THRESHOLD_PX) return;
      state.active = true;
      barRef.current?.setPointerCapture(event.pointerId);
    }
    const value = valueAt(event.clientX);
    // Over the goal, the bar is all filled: only a drag that actually empties a cell changes her count.
    if (value !== eaten && (eaten <= planned || value < planned)) onChange(value);
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    drag.current = null;
    if (!state.active) return;
    suppressClick.current = true;
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 0);
  }

  function handleCellClick(cell: number) {
    if (suppressClick.current) return;
    onChange(tapCell(cell, planned, eaten));
  }

  return (
    <div
      ref={barRef}
      className={'tn-fuel-bar' + (disabled ? ' tn-fuel-bar-disabled' : '')}
      role="group"
      aria-label={groupLabel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      {capsules.map((capsule) => {
        const half = capsule.cells.length === 1;
        const full = capsule.cells.every((cell) => cell < filled);
        return (
        <div key={capsule.portion} className={'tn-fuel-capsule' + (half ? ' tn-fuel-capsule-half' : '') + (full ? ' tn-fuel-capsule-full' : '')}>
          {/* A planned half portion is labeled ½, never with the next number. */}
          <span className="tn-fuel-number" aria-hidden="true">
            {half ? formatPortionCount(0.5) : formatNumber(capsule.portion, language)}
          </span>
          {capsule.cells.map((cell) => (
            <button
              key={cell}
              type="button"
              data-cell
              className="tn-fuel-cell"
              disabled={disabled}
              aria-pressed={cell < filled}
              aria-label={fill(copy.cellLabel, { group: groupLabel, amount: formatPortionCount(cellValue(cell)) })}
              onClick={() => handleCellClick(cell)}
            >
              <span
                className={'tn-fuel-fill' + (cell < filled ? ' tn-fuel-fill-on' : '')}
                style={{ '--cell-order': cellOrder(cell) } as CSSProperties}
                aria-hidden="true"
              />
              {cell === filled - 1 && <span className="tn-fuel-handle" aria-hidden="true" />}
            </button>
          ))}
        </div>
        );
      })}
    </div>
  );
}
