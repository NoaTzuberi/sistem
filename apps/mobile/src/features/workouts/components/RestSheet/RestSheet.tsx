import { fill, useCopy } from '@sistem/shared';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { REST_ADJUST_SEC } from '../../data/sessionConfig';
import { formatClock } from '../../data/workoutDisplay';
import type { RestState } from '../../hooks/useWorkoutSession';
import { workoutCopy } from '../../copy';
import { nameScript } from '../../data/weekPlanDisplay';
import { Eyebrow } from '../../../../components/common/Eyebrow/Eyebrow';
import { appCopy } from '../../../../copy';
import './RestSheet.css';

export interface RestNext {
  name: string;
  /** "Set 2 · 12 reps" */
  detail: string;
}

interface RestSheetProps {
  /** The running rest, or null (the sheet slides away). */
  rest: RestState | null;
  remainingMs: number | null;
  next: RestNext | null;
  onAdjust: (deltaSec: number) => void;
  onSkip: () => void;
}

const RING_RADIUS = 52;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * The rest, as a dark sheet over the bottom of the player (non-modal: the sets stay usable): the
 * countdown ring, what comes next, −15 / +15 / Skip. It stays mounted so it can slide in (300 ms) and
 * out (200 ms); while away it is inert. Portaled to <body>: the page-enter transform on <main> would
 * pin a fixed sheet to <main>.
 */
export function RestSheet({ rest, remainingMs, next, onAdjust, onSkip }: RestSheetProps) {
  const copy = useCopy(workoutCopy);
  const eyebrow = useCopy(appCopy).eyebrow;
  const isOpen = rest !== null;
  // While sliding away, the sheet keeps showing what it showed last.
  const shownRef = useRef<{ rest: RestState; next: RestNext | null; remainingMs: number } | null>(null);
  if (rest) shownRef.current = { rest, next, remainingMs: remainingMs ?? rest.totalSec * 1000 };
  const shown = shownRef.current;
  const ringRef = useRef<SVGCircleElement>(null);
  const sheetRef = useRef<HTMLElement>(null);

  // The ring drains from the stored end time on every frame (like CountdownBar): React's slower tick
  // never moves it. Reduced motion: whole seconds only.
  useLayoutEffect(() => {
    const ring = ringRef.current;
    if (!ring || !rest) return;
    const reduced = prefersReducedMotion();
    let frame = 0;
    let last = -1;
    function loop() {
      let remaining = Math.max(0, (rest?.endsAt ?? 0) - Date.now());
      if (reduced) remaining = Math.ceil(remaining / 1000) * 1000;
      const left = rest && rest.totalSec > 0 ? Math.min(1, remaining / (rest.totalSec * 1000)) : 0;
      const offset = RING_LENGTH * (1 - left);
      if (ring && offset !== last) {
        last = offset;
        // Inline: the value changes every frame and only this loop knows it.
        ring.style.strokeDashoffset = String(offset);
      }
      frame = window.requestAnimationFrame(loop);
    }
    loop();
    return () => window.cancelAnimationFrame(frame);
  }, [rest]);

  // The sheet is away: out of the tab order and the accessibility tree.
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    if (isOpen) sheet.removeAttribute('inert');
    else sheet.setAttribute('inert', '');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onSkip();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onSkip]);

  return createPortal(
    <section ref={sheetRef} className="wp-rest" data-open={isOpen || undefined} role="dialog" aria-modal="false" aria-labelledby="wp-rest-title">
      <div className="wp-rest-handle" aria-hidden="true" />
      <div className="wp-rest-head">
        <h2 className="wp-rest-title display-title" id="wp-rest-title">
          {copy.session.rest}
        </h2>
        <Eyebrow>{eyebrow.rest}</Eyebrow>
      </div>
      <div className="wp-rest-main">
        <div className="wp-rest-ring">
          <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
            <circle className="wp-rest-ring-track" cx="60" cy="60" r={RING_RADIUS} />
            <circle ref={ringRef} className="wp-rest-ring-value" cx="60" cy="60" r={RING_RADIUS} strokeDasharray={RING_LENGTH} />
          </svg>
          <span className="wp-rest-time" role="timer" aria-label={copy.player.restTimer} dir="ltr">
            {formatClock(Math.ceil((shown?.remainingMs ?? 0) / 1000))}
          </span>
        </div>
        {shown?.next && (
          <div className="wp-rest-next">
            <span>{copy.player.next}</span>
            <b className="display-name" {...nameScript(shown.next.name)}>
              {shown.next.name}
            </b>
            <p>{shown.next.detail}</p>
          </div>
        )}
      </div>
      <div className="wp-rest-actions">
        <button type="button" aria-label={fill(copy.player.restLessAria, { sec: REST_ADJUST_SEC })} onClick={() => onAdjust(-REST_ADJUST_SEC)}>
          <bdi dir="ltr">−{REST_ADJUST_SEC}</bdi>
        </button>
        <button type="button" aria-label={fill(copy.player.restMoreAria, { sec: REST_ADJUST_SEC })} onClick={() => onAdjust(REST_ADJUST_SEC)}>
          <bdi dir="ltr">+{REST_ADJUST_SEC}</bdi>
        </button>
        <button type="button" className="wp-rest-skip" onClick={onSkip}>
          {copy.session.restSkip}
        </button>
      </div>
    </section>,
    document.body,
  );
}
