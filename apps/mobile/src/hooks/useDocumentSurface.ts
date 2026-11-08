import { useEffect } from 'react';

/**
 * The colors iOS Safari (and Android Chrome) paint OUTSIDE the page: the bars, the area under the floating
 * toolbar and the overscroll. Every screen names its edges here, so they always match what it draws:
 * - the bottom surface → <html data-surface="…"> (styles/surfaces.css + the screen-owned rules for auth /
 *   stage / interval-rest give html / body that color);
 * - the top surface → the theme-color meta.
 */
export type DocumentSurface =
  | 'page'
  | 'card'
  | 'soft'
  | 'ink'
  | 'pink'
  | 'stage'
  | 'auth'
  | 'interval-rest'
  // The onboarding deck: white on top, its pink gradient at the bottom.
  | 'onboarding'
  // The live cardio run takes its block's zone color.
  | 'zone-1'
  | 'zone-2'
  | 'zone-3'
  | 'zone-4'
  | 'zone-5';

/** The token each surface's TOP edge reads for theme-color. */
const TOP_COLOR_TOKEN: Record<DocumentSurface, string> = {
  page: '--color-bg',
  card: '--color-card',
  soft: '--color-subscreen-page',
  ink: '--color-coach-stage',
  pink: '--color-stage',
  stage: '--color-stage-full-top',
  auth: '--color-auth-stage-top',
  'interval-rest': '--color-it-rest',
  onboarding: '--color-onboarding-edge',
  'zone-1': '--color-zone-1-stage',
  'zone-2': '--color-zone-2-stage',
  'zone-3': '--color-zone-3-stage',
  'zone-4': '--color-zone-4-stage',
  'zone-5': '--color-zone-5-stage',
};

/** 'overlay' (the interval timer over its screen) beats every 'screen', even one mounted in the same render. */
export type SurfaceLayer = 'screen' | 'overlay';

interface Entry {
  id: number;
  bottom: DocumentSurface;
  top: DocumentSurface;
  layer: SurfaceLayer;
}

// A stack, not "put back the previous value": during a screen transition the leaving screen stays mounted
// until its animation ends, so it unmounts AFTER the new one registered. The newest entry wins (the new
// screen); an overlay beats any screen (React runs a child's effect before its screen's, so recency alone
// would let the screen win when both mount together, e.g. a reload in the middle of an interval run).
const entries: Entry[] = [];
let nextId = 0;
let meta: HTMLMetaElement | null = null;

function apply() {
  const root = document.documentElement;
  const overlays = entries.filter((entry) => entry.layer === 'overlay');
  const current = (overlays.length > 0 ? overlays : entries).at(-1);
  if (!current) {
    delete root.dataset.surface;
    meta?.remove();
    meta = null;
    return;
  }
  root.dataset.surface = current.bottom;
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = getComputedStyle(root).getPropertyValue(TOP_COLOR_TOKEN[current.top]).trim();
}

/**
 * While this screen (or overlay) is mounted, the document edges take its colors. `top` defaults to the
 * bottom surface (a screen of one color). A component inside a screen must not call it for the same
 * screen — the screen's own call (AppShell's edges, or the screen root) names both edges.
 */
export function useDocumentSurface(bottom: DocumentSurface, top: DocumentSurface = bottom, layer: SurfaceLayer = 'screen') {
  useEffect(() => {
    const entry: Entry = { id: nextId++, bottom, top, layer };
    entries.push(entry);
    apply();
    return () => {
      const index = entries.findIndex((item) => item.id === entry.id);
      if (index !== -1) entries.splice(index, 1);
      apply();
    };
  }, [bottom, top, layer]);
}
