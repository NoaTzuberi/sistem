import { useLayoutEffect, useRef, useState } from 'react';

/**
 * A text clamped by CSS (line-clamp): whether it is cut off (then "עוד" shows) and whether she opened
 * it. Measured again when the box resizes (rotation, font load, language switch).
 */
export function useLineClamp<T extends HTMLElement>(text: string) {
  const ref = useRef<T>(null);
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || expanded) return;
    const measure = () => setClamped(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [text, expanded]);

  return { ref, expanded, clamped, toggle: () => setExpanded((open) => !open) };
}
