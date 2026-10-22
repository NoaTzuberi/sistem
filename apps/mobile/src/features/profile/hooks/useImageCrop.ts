import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import {
  AVATAR_JPEG_QUALITY,
  CROP_KEY_STEP_PX,
  CROP_OUTPUT_PX,
  baseSize,
  clampPan,
  clampZoom,
  outputRect,
} from '../data/avatarCrop';
import type { CropSize, Pan } from '../data/avatarCrop';

const KEY_MOVES: Record<string, Pan> = {
  ArrowLeft: { x: -CROP_KEY_STEP_PX, y: 0 },
  ArrowRight: { x: CROP_KEY_STEP_PX, y: 0 },
  ArrowUp: { x: 0, y: -CROP_KEY_STEP_PX },
  ArrowDown: { x: 0, y: CROP_KEY_STEP_PX },
};

/**
 * The circular crop of a picked photo: load it, pan (pointer drag or arrow keys) and zoom (1–3×),
 * always clamped so the circle stays filled, then export a 400×400 JPEG. Drawing through a canvas
 * also drops the photo's metadata (EXIF / GPS). `onUnreadable` runs when the file can't be decoded.
 */
export function useImageCrop(file: Blob | null, onUnreadable: () => void) {
  const [source, setSource] = useState<{ url: string; natural: CropSize } | null>(null);
  const [zoom, setZoomState] = useState(1);
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement | null>(null);
  const drag = useRef<{ pointerId: number; startX: number; startY: number; from: Pan } | null>(null);
  const unreadable = useRef(onUnreadable);
  unreadable.current = onUnreadable;

  useEffect(() => {
    setSource(null);
    setZoomState(1);
    setPan({ x: 0, y: 0 });
    if (!file) return;
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.src = url;
    let isCurrent = true;
    image
      .decode()
      .then(() => {
        if (!isCurrent) return;
        imageRef.current = image;
        setSource({ url, natural: { width: image.naturalWidth, height: image.naturalHeight } });
      })
      .catch(() => {
        // e.g. a HEIC file on a browser that can't decode it.
        if (isCurrent) unreadable.current();
      });
    return () => {
      isCurrent = false;
      imageRef.current = null;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const natural = source?.natural ?? null;

  const setZoom = useCallback(
    (next: number) => {
      const zoomed = clampZoom(next);
      setZoomState(zoomed);
      if (natural) setPan((current) => clampPan(current, natural, zoomed));
    },
    [natural],
  );

  function moveBy(delta: Pan) {
    if (!natural) return;
    setPan((current) => clampPan({ x: current.x + delta.x, y: current.y + delta.y }, natural, zoom));
  }

  const frameProps = {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (!natural) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, from: pan };
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      const current = drag.current;
      if (!current || current.pointerId !== event.pointerId || !natural) return;
      setPan(clampPan({ x: current.from.x + event.clientX - current.startX, y: current.from.y + event.clientY - current.startY }, natural, zoom));
    },
    onPointerUp() {
      drag.current = null;
    },
    onPointerCancel() {
      drag.current = null;
    },
    onKeyDown(event: KeyboardEvent<HTMLElement>) {
      const move = KEY_MOVES[event.key];
      if (!move) return;
      event.preventDefault();
      moveBy(move);
    },
  };

  /** The circle's content as a square JPEG (the circle itself is drawn by CSS wherever it shows). */
  async function exportJpeg(): Promise<Blob> {
    const image = imageRef.current;
    if (!image || !natural) throw new Error('No photo to crop.');
    const canvas = document.createElement('canvas');
    canvas.width = CROP_OUTPUT_PX;
    canvas.height = CROP_OUTPUT_PX;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No canvas.');
    const rect = outputRect(natural, zoom, pan);
    context.drawImage(image, rect.x, rect.y, rect.width, rect.height);
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Crop failed.'))), 'image/jpeg', AVATAR_JPEG_QUALITY);
    });
  }

  return {
    /** The photo's object URL once it is decoded. */
    url: source?.url ?? null,
    /** Its size on screen at zoom 1. */
    size: natural ? baseSize(natural) : null,
    zoom,
    pan,
    setZoom,
    frameProps,
    exportJpeg,
  };
}
