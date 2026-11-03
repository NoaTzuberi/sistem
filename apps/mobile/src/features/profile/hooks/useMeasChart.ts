import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { nearestPointIndex, useLanguage } from '@sistem/shared';
import type { ChartPoint, ChartSize } from '@sistem/shared';
import { buildMeasChart } from '../data/measChart';

export const MEAS_CHART_HEIGHT = 180;
const PADDING: ChartSize['padding'] = { top: 16, right: 12, bottom: 26, left: 34 };

/**
 * The measurements chart's sizing and touch: measures its box, lays the chart out, and turns a tap
 * or a drag (or the arrow keys) into the nearest point's index. Time runs left → right in both
 * languages (owner, Phase 15), so x comes straight from the box's left edge.
 */
export function useMeasChart(points: ChartPoint[], tappedIndex: number | null, onTap: (index: number | null) => void) {
  const language = useLanguage();
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const box = boxRef.current;
    if (!box || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  const geometry = useMemo(
    () => (width > 0 ? buildMeasChart(points, { width, height: MEAS_CHART_HEIGHT, padding: PADDING }, language) : null),
    [points, width, language],
  );

  function selectAt(event: PointerEvent<SVGSVGElement>) {
    if (!geometry) return;
    const box = event.currentTarget.getBoundingClientRect();
    onTap(nearestPointIndex(geometry, event.clientX - box.left));
  }

  const handlers = {
    onPointerDown: selectAt,
    onPointerMove: (event: PointerEvent<SVGSVGElement>) => {
      // A finger drag scrubs; a mouse only while pressed.
      if (event.pointerType !== 'mouse' || event.buttons === 1) selectAt(event);
    },
    onKeyDown: (event: KeyboardEvent<SVGSVGElement>) => {
      const last = points.length - 1;
      const current = tappedIndex ?? last;
      if (event.key === 'ArrowLeft') onTap(Math.max(0, current - 1));
      else if (event.key === 'ArrowRight') onTap(Math.min(last, current + 1));
      else if (event.key === 'Escape') onTap(null);
      else return;
      event.preventDefault();
    },
  };

  const tapped = tappedIndex !== null ? (geometry?.points[tappedIndex] ?? null) : null;
  return { boxRef, width, geometry, tapped, handlers };
}
