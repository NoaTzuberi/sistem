import { type RefObject, useEffect, useState } from 'react';
import {
  createKettlebellScene,
  KETTLEBELL_LABEL_FONT,
  type KettlebellColors,
  type KettlebellScene,
} from '../data/kettlebellScene';

export type KettlebellStatus = 'loading' | 'ready' | 'unavailable';

const MAX_PIXEL_RATIO = 2;
/** Radians per pixel dragged. */
const DRAG_SPEED = 0.012;
/** Velocity kept per frame after letting go (the spin coasts to a stop). */
const INERTIA = 0.94;
const MIN_SPEED = 0.0005;
/** Wait for an idle moment after first paint, at most this long (slow devices: content first). */
const IDLE_TIMEOUT_MS = 1500;

function hasWebGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function readColors(element: HTMLElement): KettlebellColors {
  const styles = getComputedStyle(element);
  const token = (name: string) => styles.getPropertyValue(name).trim();
  return {
    label: token('--color-kettlebell-label'),
    iron: token('--color-kettlebell-iron'),
    grip: token('--color-kettlebell-grip'),
    shadow: token('--color-kettlebell-shadow'),
    bounce: token('--color-stage'),
    softbox: token('--color-on-stage'),
  };
}

/** After first paint, when the main thread is free. Returns a cancel function. */
function afterFirstPaint(callback: () => void): () => void {
  let idle = 0;
  let timer = 0;
  const frame = requestAnimationFrame(() => {
    // Safari has no requestIdleCallback.
    if (typeof window.requestIdleCallback === 'function') idle = window.requestIdleCallback(callback, { timeout: IDLE_TIMEOUT_MS });
    else timer = window.setTimeout(callback, 0);
  });
  return () => {
    cancelAnimationFrame(frame);
    if (idle) window.cancelIdleCallback(idle);
    if (timer) window.clearTimeout(timer);
  };
}

/**
 * The live kettlebell on the Home stage. three.js is imported only after first paint (its own chunk —
 * the scene code itself only imports three's types); until then — and without WebGL — the static render shows. Drag horizontally to turn it (inertia);
 * it floats and sways unless reduced motion is on (then it stays still but still turns by hand). The
 * loop runs only while the stage is on screen and the page is visible; everything is disposed on unmount.
 */
export function useKettlebellScene(containerRef: RefObject<HTMLDivElement | null>, labelText: string): KettlebellStatus {
  const [status, setStatus] = useState<KettlebellStatus>('loading');

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!hasWebGl()) {
      setStatus('unavailable');
      return;
    }

    let cancelled = false;
    let scene: KettlebellScene | null = null;
    let frame = 0;
    let isOnScreen = true;
    let isPageVisible = document.visibilityState === 'visible';
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let animate = !motionQuery.matches;
    const start = performance.now();
    // Drag state.
    let rotation = 0;
    let velocity = 0;
    let pointerId: number | null = null;
    let lastX = 0;

    const tick = (now: number) => {
      frame = 0;
      if (!scene || !isOnScreen || !isPageVisible) return;
      if (pointerId === null && animate) {
        velocity *= INERTIA;
        rotation += velocity;
      }
      scene.update((now - start) / 1000, rotation, animate);
      scene.render();
      const moving = Math.abs(velocity) > MIN_SPEED && animate;
      if (animate || moving || pointerId !== null) frame = requestAnimationFrame(tick);
    };
    const kick = () => {
      if (!frame && scene && isOnScreen && isPageVisible) frame = requestAnimationFrame(tick);
    };

    const onPointerDown = (event: PointerEvent) => {
      pointerId = event.pointerId;
      lastX = event.clientX;
      velocity = 0;
      try {
        container.setPointerCapture(event.pointerId);
      } catch {
        // The pointer is already gone: nothing to capture.
      }
      container.classList.add('kettlebell-grabbing');
      kick();
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      const delta = (event.clientX - lastX) * DRAG_SPEED;
      lastX = event.clientX;
      rotation += delta;
      velocity = delta;
      kick();
    };
    const onPointerEnd = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      pointerId = null;
      container.classList.remove('kettlebell-grabbing');
      // Reduced motion: no coasting — it stops where she let go.
      if (!animate) velocity = 0;
      kick();
    };
    const onVisibility = () => {
      isPageVisible = document.visibilityState === 'visible';
      kick();
    };
    const onMotionChange = () => {
      animate = !motionQuery.matches;
      kick();
    };
    const intersection = new IntersectionObserver(([entry]) => {
      isOnScreen = entry?.isIntersecting ?? true;
      kick();
    });
    const resize = new ResizeObserver(() => {
      if (!scene || container.clientWidth === 0 || container.clientHeight === 0) return;
      scene.setSize(container.clientWidth, container.clientHeight);
      kick();
    });

    const cancelStart = afterFirstPaint(() => {
      void import('three')
        .then((THREE) => {
          if (cancelled) return;
          scene = createKettlebellScene(THREE, {
            width: Math.max(1, container.clientWidth),
            height: Math.max(1, container.clientHeight),
            pixelRatio: Math.min(MAX_PIXEL_RATIO, window.devicePixelRatio || 1),
            labelText,
            colors: readColors(container),
          });
          scene.canvas.className = 'kettlebell-canvas';
          scene.canvas.setAttribute('aria-hidden', 'true');
          container.prepend(scene.canvas);
          container.addEventListener('pointerdown', onPointerDown);
          container.addEventListener('pointermove', onPointerMove);
          container.addEventListener('pointerup', onPointerEnd);
          container.addEventListener('pointercancel', onPointerEnd);
          document.addEventListener('visibilitychange', onVisibility);
          motionQuery.addEventListener('change', onMotionChange);
          intersection.observe(container);
          resize.observe(container);
          setStatus('ready');
          kick();
          // The print's face may not be loaded yet: redraw once it is.
          document.fonts
            ?.load(KETTLEBELL_LABEL_FONT)
            .then(() => {
              if (cancelled || !scene) return;
              scene.redrawLabel();
              kick();
            })
            .catch(() => undefined);
        })
        .catch(() => {
          if (!cancelled) setStatus('unavailable');
        });
    });

    return () => {
      cancelled = true;
      cancelStart();
      if (frame) cancelAnimationFrame(frame);
      intersection.disconnect();
      resize.disconnect();
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerEnd);
      container.removeEventListener('pointercancel', onPointerEnd);
      document.removeEventListener('visibilitychange', onVisibility);
      motionQuery.removeEventListener('change', onMotionChange);
      if (scene) {
        scene.canvas.remove();
        scene.dispose();
        scene = null;
      }
    };
  }, [containerRef, labelText]);

  return status;
}
