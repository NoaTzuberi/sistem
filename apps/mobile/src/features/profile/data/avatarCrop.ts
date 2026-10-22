// The profile photo crop (docs/design/trainee-profile.html, "התאמה"): pure math, no DOM.
// The photo always fills the circle — at zoom 1 its short side equals the circle — and the pan
// is clamped so no edge ever shows inside it. Pan is in screen pixels (x right, y down).

export const CROP_CIRCLE_PX = 236;
export const CROP_OUTPUT_PX = 400;
export const CROP_MIN_ZOOM = 1;
export const CROP_MAX_ZOOM = 3;
/** How far an arrow key moves the photo. */
export const CROP_KEY_STEP_PX = 8;
/** The picked file may be at most this big (the phone shrinks it to ~50 KB before upload). */
export const AVATAR_MAX_INPUT_BYTES = 10 * 1024 * 1024;
export const AVATAR_JPEG_QUALITY = 0.9;

export interface CropSize {
  width: number;
  height: number;
}

export interface Pan {
  x: number;
  y: number;
}

/** The photo's size on screen at zoom 1: its short side = the circle. */
export function baseSize(natural: CropSize, circle = CROP_CIRCLE_PX): CropSize {
  const scale = circle / Math.min(natural.width, natural.height);
  return { width: natural.width * scale, height: natural.height * scale };
}

export function clampZoom(zoom: number): number {
  return Math.min(CROP_MAX_ZOOM, Math.max(CROP_MIN_ZOOM, zoom));
}

/** Keeps the circle filled: the photo may move at most half of what sticks out on each axis. */
export function clampPan(pan: Pan, natural: CropSize, zoom: number, circle = CROP_CIRCLE_PX): Pan {
  const base = baseSize(natural, circle);
  const maxX = Math.max(0, (base.width * zoom - circle) / 2);
  const maxY = Math.max(0, (base.height * zoom - circle) / 2);
  return { x: Math.min(maxX, Math.max(-maxX, pan.x)), y: Math.min(maxY, Math.max(-maxY, pan.y)) };
}

/** Where to draw the photo on the square output canvas so it matches what the circle shows. */
export function outputRect(natural: CropSize, zoom: number, pan: Pan, circle = CROP_CIRCLE_PX, output = CROP_OUTPUT_PX) {
  const base = baseSize(natural, circle);
  const k = output / circle;
  const width = base.width * zoom * k;
  const height = base.height * zoom * k;
  return { x: output / 2 - width / 2 + pan.x * k, y: output / 2 - height / 2 + pan.y * k, width, height };
}

/** Why a picked file can't be used, or null. The server checks the type and size again. */
export function pickedFileProblem(file: { type: string; size: number }): 'notImage' | 'tooLarge' | null {
  if (!file.type.startsWith('image/')) return 'notImage';
  if (file.size > AVATAR_MAX_INPUT_BYTES) return 'tooLarge';
  return null;
}
