import { useEffect, useState } from 'react';
import { sectionId } from '../data/scrollToSection';
import type { BuilderSection } from './usePublishChecklist';

const SECTIONS: BuilderSection[] = ['target', 'meals', 'message'];

/**
 * Scrollspy for the steps nav: the step whose section is at the reading line — just under the sticky header
 * and steps nav (the band from 160px down to the middle of the screen). The first step until one is.
 */
export function useActiveSection(): BuilderSection {
  const [active, setActive] = useState<BuilderSection>('target');

  useEffect(() => {
    const elements = SECTIONS.map((section) => document.getElementById(sectionId(section))).filter((element): element is HTMLElement => element !== null);
    if (elements.length === 0 || typeof IntersectionObserver === 'undefined') return;
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        // The first section (in page order) that crosses the band.
        const current = SECTIONS.find((section) => visible.has(sectionId(section)));
        if (current) setActive(current);
      },
      { rootMargin: '-160px 0px -50% 0px' },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return active;
}
