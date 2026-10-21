// Small display bits of the cardio editor.

export function stepsEyebrow(count: number): string {
  return `INTENSITY · ${count} STEPS`; // i18n-ignore: decorative mono eyebrow, aria-hidden
}

/** A bar's height: 18% + 8% per intensity point (the design's graph). */
export function barHeight(intensity: number): string {
  return `${18 + intensity * 8}%`;
}
