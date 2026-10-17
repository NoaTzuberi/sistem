import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Location } from 'react-router-dom';
import { tabIndexOf } from '../app/config/tabs';

// Keep in step with --transition-screen-in / --transition-screen-fade in the tokens (+ a frame).
const ENTER_MS = 460;
const REDUCED_MS = 180;
/** How long a returning screen may take to load enough to scroll back to where she was. */
const RESTORE_WAIT_MS = 1500;

export type ScreenPhase = 'current' | 'enter' | 'exit';

export interface Screen {
  key: number;
  location: Location;
  phase: ScreenPhase;
}

interface TransitionState {
  screens: Screen[];
  /** forward = to a higher tab index. */
  direction: 'forward' | 'back';
  locationKey: string;
  nextKey: number;
}

function initial(location: Location): TransitionState {
  return { screens: [{ key: 0, location, phase: 'current' }], direction: 'forward', locationKey: location.key, nextKey: 1 };
}

/**
 * Tab-to-tab depth transition (app feel). Moving to another tab keeps the old screen on show (its own
 * routes, frozen at its location) while the new one comes in; any other navigation just updates the
 * current screen. Both screens are fixed and clipped during the transition, scrolled to where they
 * were; then the new screen goes back to normal window scrolling at its own remembered position —
 * every tab keeps its scroll (iOS tap-the-status-bar-to-top keeps working: the window still scrolls).
 */
export function useScreenTransition(location: Location) {
  const [state, setState] = useState(() => initial(location));
  const scrollByPath = useRef(new Map<string, number>());
  const currentPath = useRef(location.pathname);
  const isTransitioning = state.screens.some((screen) => screen.phase !== 'current');
  const transitioning = useRef(false);
  transitioning.current = isTransitioning;

  // A new location: decide during render (no flash of the new screen before the old one is kept).
  if (state.locationKey !== location.key) {
    const current = state.screens[state.screens.length - 1];
    const from = tabIndexOf(current.location.pathname);
    const to = tabIndexOf(location.pathname);
    if (from !== null && to !== null && from !== to) {
      setState({
        screens: [
          { ...current, phase: 'exit' },
          { key: state.nextKey, location, phase: 'enter' },
        ],
        direction: to > from ? 'forward' : 'back',
        locationKey: location.key,
        nextKey: state.nextKey + 1,
      });
    } else {
      setState({ ...state, screens: [{ ...current, location, phase: 'current' }], locationKey: location.key });
    }
  }

  // Remember each screen's scroll (window scroll), except while screens are swapping.
  useEffect(() => {
    const onScroll = () => {
      if (!transitioning.current) scrollByPath.current.set(currentPath.current, window.scrollY);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // End of the transition: the new screen becomes the only one.
  useEffect(() => {
    if (!isTransitioning) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(() => {
      setState((previous) => ({
        ...previous,
        screens: previous.screens.filter((screen) => screen.phase !== 'exit').map((screen) => ({ ...screen, phase: 'current' })),
      }));
    }, reduced ? REDUCED_MS : ENTER_MS);
    return () => window.clearTimeout(timer);
  }, [isTransitioning, state.locationKey]);

  // A transition just ended: the new screen is back in normal flow — restore its window scroll.
  // (Plain navigations inside a tab keep the browser's behavior.)
  const wasTransitioning = useRef(false);
  useLayoutEffect(() => {
    currentPath.current = location.pathname;
    const ended = wasTransitioning.current && !isTransitioning;
    wasTransitioning.current = isTransitioning;
    if (!ended) return;
    const target = scrollByPath.current.get(location.pathname) ?? 0;
    window.scrollTo(0, target);
    if (window.scrollY >= target - 1) return;
    // The screen was mounted fresh and is still loading (too short to scroll that far): keep
    // restoring as it grows, until it gets there, she touches it, or a moment passes.
    const stop = () => {
      resize.disconnect();
      window.clearTimeout(timer);
      window.removeEventListener('wheel', stop);
      window.removeEventListener('touchstart', stop);
    };
    const resize = new ResizeObserver(() => {
      window.scrollTo(0, target);
      if (window.scrollY >= target - 1) stop();
    });
    resize.observe(document.body);
    const timer = window.setTimeout(stop, RESTORE_WAIT_MS);
    window.addEventListener('wheel', stop, { passive: true });
    window.addEventListener('touchstart', stop, { passive: true });
    return stop;
  }, [isTransitioning, location.pathname]);

  /** Where a frozen screen should be scrolled to (its remembered window scroll). */
  function frozenScroll(screen: Screen): number {
    return scrollByPath.current.get(screen.location.pathname) ?? 0;
  }

  return { screens: state.screens, direction: state.direction, isTransitioning, frozenScroll };
}
