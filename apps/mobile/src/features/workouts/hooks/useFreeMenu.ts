import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OWN_CARDIO_NEW, ROUTES } from '../../../app/config/routes';
import { useFreeWorkout } from './useFreeWorkout';

export type FreeMenuOption = 'strength' | 'timer' | 'run';

/** The strength sheet opens once the menu has slid away (its close is 200 ms), so the two never overlap. */
const SHEET_SWAP_MS = 240;
const SHEET_SWAP_REDUCED_MS = 50;

/**
 * The "+ free workout" menu on Workouts: free strength (the free-workout sheet), the interval timer
 * (its own screen) or a free run (her own cardio builder).
 */
export function useFreeMenu() {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isStrengthOpen, setIsStrengthOpen] = useState(false);
  const free = useFreeWorkout(isStrengthOpen);
  const swapTimer = useRef(0);

  useEffect(() => () => window.clearTimeout(swapTimer.current), []);

  function openStrength() {
    free.reset();
    setIsStrengthOpen(true);
  }

  function pick(option: FreeMenuOption) {
    setIsMenuOpen(false);
    if (option === 'timer') navigate(ROUTES.INTERVAL_TIMER);
    else if (option === 'run') navigate(OWN_CARDIO_NEW);
    else {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.clearTimeout(swapTimer.current);
      swapTimer.current = window.setTimeout(openStrength, reduced ? SHEET_SWAP_REDUCED_MS : SHEET_SWAP_MS);
    }
  }

  return {
    isMenuOpen,
    openMenu: () => setIsMenuOpen(true),
    closeMenu: () => setIsMenuOpen(false),
    pick,
    isStrengthOpen,
    openStrength,
    closeStrength: () => setIsStrengthOpen(false),
    free,
  };
}
