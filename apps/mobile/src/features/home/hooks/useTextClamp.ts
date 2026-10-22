import { useCallback, useLayoutEffect, useRef, useState } from 'react';

/**
 * A text cut after a few whole lines (CSS: max-height = N lines, no "…"), with a toggle shown only
 * when something is hidden. Measured again when the width changes (rotation, font load).
 */
export function useTextClamp<T extends HTMLElement>(text: string | null) {
  const ref = useRef<T | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);

  // A new text starts collapsed.
  useLayoutEffect(() => setIsExpanded(false), [text]);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || isExpanded) return;
    const measure = () => setCanExpand(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [text, isExpanded]);

  const toggle = useCallback(() => setIsExpanded((open) => !open), []);
  return { ref, isExpanded, canExpand, toggle };
}
