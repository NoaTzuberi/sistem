import type { SpotRect } from '../hooks/useSpotlight';

interface Size {
  width: number;
  height: number;
}

/** The cutout: the element plus `pad` on every side. */
export function spotWithPad(spot: SpotRect, pad: number): SpotRect {
  return { top: spot.top - pad, left: spot.left - pad, width: spot.width + pad * 2, height: spot.height + pad * 2 };
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

/**
 * Where the card goes (its top-left corner, in viewport px): under the cutout, else above it, else beside
 * it, always inside the viewport by `margin`. No cutout = centered.
 */
export function placeCard(cut: SpotRect | null, card: Size, viewport: Size, gap: number, margin: number): { x: number; y: number } {
  const maxX = viewport.width - card.width - margin;
  const maxY = viewport.height - card.height - margin;
  if (!cut) return { x: (viewport.width - card.width) / 2, y: (viewport.height - card.height) / 2 };

  const centeredX = clamp(cut.left + cut.width / 2 - card.width / 2, margin, maxX);
  const below = cut.top + cut.height + gap;
  if (below <= maxY) return { x: centeredX, y: below };
  const above = cut.top - gap - card.height;
  if (above >= margin) return { x: centeredX, y: above };

  // A tall element (the sidebar's lower links on a short screen): beside it, on the roomier side.
  const right = cut.left + cut.width + gap;
  const left = cut.left - gap - card.width;
  const x = viewport.width - right >= card.width + margin ? right : clamp(left, margin, maxX);
  return { x, y: clamp(cut.top, margin, maxY) };
}
