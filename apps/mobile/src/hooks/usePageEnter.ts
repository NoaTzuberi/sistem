import { useEffect, useRef } from 'react';
import gsap from 'gsap';

/** Subtle fade+rise on mount, applied once per page navigation. Respects reduced motion. */
export function usePageEnter<T extends HTMLElement>(enabled = true) {
  const ref = useRef<T>(null);
  // Decided at mount: the animation only ever plays once.
  const play = useRef(enabled);

  useEffect(() => {
    const element = ref.current;
    if (!element || !play.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const animation = gsap.fromTo(
      element,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out', clearProps: 'transform' },
    );

    return () => {
      animation.kill();
    };
  }, []);

  return ref;
}
