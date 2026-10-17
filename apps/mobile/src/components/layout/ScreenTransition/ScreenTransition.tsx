import { type ReactNode, useLayoutEffect, useRef } from 'react';
import { type Location, useLocation } from 'react-router-dom';
import { useScreenTransition } from '../../../hooks/useScreenTransition';
import { AppDock } from '../AppDock/AppDock';
import { ScreenPhaseContext } from './screenPhase';
import './ScreenTransition.css';

interface ScreenTransitionProps {
  /** The app's routes for one location (the leaving screen keeps rendering its own). */
  renderScreen: (location: Location) => ReactNode;
}

/**
 * The app's screens + the one dock. Between tabs: a direction-aware depth transition (440 ms in,
 * 300 ms out; reduced motion = a 160 ms fade). Taps wait only while it runs.
 */
export function ScreenTransition({ renderScreen }: ScreenTransitionProps) {
  const location = useLocation();
  const { screens, direction, isTransitioning, frozenScroll } = useScreenTransition(location);
  const elements = useRef(new Map<number, HTMLDivElement>());

  // Frozen screens are clipped to the viewport: scroll each to where its content was.
  useLayoutEffect(() => {
    for (const screen of screens) {
      const element = elements.current.get(screen.key);
      if (element && screen.phase !== 'current') element.scrollTop = frozenScroll(screen);
    }
  }, [screens, frozenScroll]);

  return (
    <div className={`screen-stack screen-stack-${direction}` + (isTransitioning ? ' screen-stack-busy' : '')}>
      {screens.map((screen) => (
        <div
          key={screen.key}
          ref={(element) => {
            if (element) elements.current.set(screen.key, element);
            else elements.current.delete(screen.key);
          }}
          className={`screen screen-${screen.phase}`}
          inert={screen.phase === 'exit'}
        >
          <ScreenPhaseContext.Provider value={screen.phase}>{renderScreen(screen.location)}</ScreenPhaseContext.Provider>
        </div>
      ))}
      <AppDock busy={isTransitioning} />
    </div>
  );
}
