import { useEffect, useState } from 'react';

const DEFAULT_DURATION_MS = 700;

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * `target` counting up from 0 with an ease-out cubic when the component mounts (700ms); the plain target
 * with reduced motion, and for any later change of the number. Mirrors the dashboard's stats/hooks/useCountUp.
 */
export function useCountUp(target: number, durationMs: number = DEFAULT_DURATION_MS): number {
  const [animate] = useState(() => !prefersReducedMotion());
  const [progress, setProgress] = useState(animate ? 0 : 1);

  useEffect(() => {
    if (!animate) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = Math.min(1, (now - start) / durationMs);
      setProgress(1 - (1 - elapsed) ** 3);
      if (elapsed < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [animate, durationMs]);

  return Math.round(target * progress);
}
