import { useLayoutEffect, useRef } from 'react';

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Drains a ring (an SVG circle's stroke) from the stored end time on every animation frame — like
 * CountdownBar and the rest sheet: React's slower tick never moves it, a paused run is drawn once
 * and frozen, a new phase starts full at once. Reduced motion: whole-second steps only.
 */
export function useCountdownRing(endsAt: number | null, pausedRemainingMs: number | null, durationMs: number, length: number) {
  const ringRef = useRef<SVGCircleElement>(null);

  useLayoutEffect(() => {
    const ring = ringRef.current;
    if (!ring) return;
    const reduced = prefersReducedMotion();
    let frame = 0;
    let last = -1;

    function draw(now: number) {
      let remaining = pausedRemainingMs ?? Math.max(0, (endsAt ?? now) - now);
      if (reduced) remaining = Math.ceil(remaining / 1000) * 1000;
      const left = durationMs > 0 ? Math.min(1, remaining / durationMs) : 0;
      const offset = length * (1 - left);
      if (ring && offset !== last) {
        last = offset;
        // Inline: the value changes every frame and only this loop knows it.
        ring.style.strokeDashoffset = String(offset);
      }
    }

    function loop() {
      draw(Date.now());
      frame = window.requestAnimationFrame(loop);
    }

    if (endsAt === null) {
      draw(Date.now());
      return;
    }
    loop();
    return () => window.cancelAnimationFrame(frame);
  }, [endsAt, pausedRemainingMs, durationMs, length]);

  return ringRef;
}
