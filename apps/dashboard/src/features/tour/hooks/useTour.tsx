import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { completeTour, getTour } from '../../../services/coachProfile/coachTourService';
import { TOUR_STEPS } from '../data/tourSteps';
import type { TourStep } from '../data/tourSteps';

/** Lets the first page settle (lists, widgets) before the first spotlight measures it. */
const AUTO_START_DELAY_MS = 700;

interface TourValue {
  /** The open step, or null while the tour is closed. */
  step: TourStep | null;
  index: number;
  total: number;
  start: () => void;
  next: () => void;
  back: () => void;
  /** Skip or finish: closes it and marks it done on the server (it never opens by itself again). */
  end: () => void;
}

const TourContext = createContext<TourValue | undefined>(undefined);

/**
 * The coach's first-visit tour, once in the shell: opens by itself while CoachProfile.tourCompletedAt is
 * null; Settings replays it. A step with a `path` opens that page first.
 */
export function TourProvider({ children }: { children: ReactNode }) {
  const [index, setIndex] = useState<number | null>(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    getTour()
      .then(({ completedAt }) => {
        if (cancelled || completedAt) return;
        timer = window.setTimeout(() => setIndex((current) => current ?? 0), AUTO_START_DELAY_MS);
      })
      // Not loaded: no tour this time (it never blocks the dashboard).
      .catch(() => undefined);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  const step = index === null ? null : TOUR_STEPS[index];

  // Open the step's page once per step (she can't navigate while the tour covers the page).
  useEffect(() => {
    if (step?.path && step.path !== pathnameRef.current) navigate(step.path);
  }, [step, navigate]);

  const end = useCallback(() => {
    setIndex(null);
    completeTour().catch(() => undefined);
  }, []);

  const next = useCallback(() => {
    setIndex((current) => (current === null ? null : current + 1 < TOUR_STEPS.length ? current + 1 : current));
  }, []);

  const back = useCallback(() => setIndex((current) => (current === null || current === 0 ? current : current - 1)), []);
  const start = useCallback(() => setIndex(0), []);

  const value = useMemo<TourValue>(
    () => ({ step, index: index ?? 0, total: TOUR_STEPS.length, start, next, back, end }),
    [step, index, start, next, back, end],
  );
  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour(): TourValue {
  const value = useContext(TourContext);
  if (!value) throw new Error('useTour must be used inside TourProvider');
  return value;
}
