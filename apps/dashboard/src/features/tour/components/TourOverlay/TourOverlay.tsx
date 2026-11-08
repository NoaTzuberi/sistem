import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { fill, useCopy, useI18n } from '@sistem/shared';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import { Toast } from '../../../../components/common/Toast/Toast';
import { useToast } from '../../../../hooks/useToast';
import { useDrawerTransition } from '../../../../hooks/useDrawerTransition';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { tourCopy } from '../../copy';
import { placeCard, spotWithPad } from '../../data/tourLayout';
import type { TourStep } from '../../data/tourSteps';
import { useSpotlight } from '../../hooks/useSpotlight';
import { useTour } from '../../hooks/useTour';
import { useTourKeyboard } from '../../hooks/useTourKeyboard';
import './TourOverlay.css';

// = the CSS closing fade (--transition-drawer-out).
const CLOSE_MS = 200;
const VIEWPORT_MARGIN = 16;

function readPx(name: string): number {
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0;
}

/**
 * The tour on screen: the page dimmed with a cutout around the step's real element, and a white card
 * beside it (Karantina title, 1–2 lines, dots, "Next" + "Skip"). No element on this page → no cutout,
 * the card centered. Clicks on the page are blocked while it is open.
 */
export function TourOverlay() {
  const tour = useTour();
  const copy = useCopy(tourCopy);
  const { direction } = useI18n();
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const isOpen = tour.step !== null;
  // "סיום" on the last step (not "skip"): closes it and says where the guide lives now.
  const { toastMessage, showToast } = useToast();
  const finish = () => {
    tour.end();
    showToast(copy.finishedToast);
  };
  const { isMounted, isShown } = useDrawerTransition(isOpen, CLOSE_MS);
  // The closing fade still shows the last step.
  const [shownStep, setShownStep] = useState<TourStep | null>(tour.step);
  useEffect(() => {
    if (tour.step) setShownStep(tour.step);
  }, [tour.step]);

  const spot = useSpotlight(tour.step, reducedMotion);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardSize, setCardSize] = useState({ width: 0, height: 0 });
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // The card's own size decides above / below.
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const observer = new ResizeObserver(() => setCardSize({ width: card.offsetWidth, height: card.offsetHeight }));
    observer.observe(card);
    return () => observer.disconnect();
  }, [isMounted]);

  useTourKeyboard(cardRef, tour.step?.id ?? null, {
    isActive: isOpen,
    isCardMounted: isMounted && shownStep !== null,
    isRtl: direction === 'rtl',
    onNext: () => (tour.index + 1 < tour.total ? tour.next() : finish()),
    onBack: tour.back,
    onSkip: tour.end,
  });

  // The toast outlives the tour, in the same place in the tree (its live region stays mounted).
  if (!isMounted || !shownStep) return <>{null}<Toast message={toastMessage} /></>;

  const cut = spot ? spotWithPad(spot, readPx('--space-tour-spot-pad')) : null;
  const position = placeCard(cut, cardSize, viewport, readPx('--space-tour-gap'), VIEWPORT_MARGIN);
  const isLast = tour.index + 1 === tour.total;
  const text = copy.steps[shownStep.id];

  const overlay = createPortal(
    <div className="tour" data-shown={isShown} data-centered={cut === null}>
      {/* Blocks the page; the cutout is only a window onto it. */}
      <div className="tour-blocker" aria-hidden="true" />
      <div
        className="tour-spot"
        aria-hidden="true"
        style={
          {
            // No element: a zero-size hole in the middle (the scrim covers everything).
            '--tour-spot-x': `${cut ? cut.left : viewport.width / 2}px`,
            '--tour-spot-y': `${cut ? cut.top : viewport.height / 2}px`,
            '--tour-spot-w': `${cut ? cut.width : 0}px`,
            '--tour-spot-h': `${cut ? cut.height : 0}px`,
          } as CSSProperties
        }
      />
      <div
        ref={cardRef}
        className="tour-card"
        role="dialog"
        aria-modal="true"
        aria-label={copy.dialogLabel}
        aria-describedby="tour-card-body"
        style={{ '--tour-card-x': `${position.x}px`, '--tour-card-y': `${position.y}px` } as CSSProperties}
      >
        <p className="tour-progress">{fill(copy.progress, { step: tour.index + 1, total: tour.total })}</p>
        <h2 className="tour-title">{text.title}</h2>
        <p className="tour-body" id="tour-card-body">
          {text.body}
        </p>
        <div className="tour-foot">
          <span className="tour-dots" aria-hidden="true">
            {Array.from({ length: tour.total }, (_, index) => (
              <i key={index} className="tour-dot" data-current={index === tour.index} />
            ))}
          </span>
          <button type="button" className="tour-skip" onClick={tour.end}>
            {copy.skip}
          </button>
          <PillButton variant="primary" size="sm" data-tour-primary onClick={isLast ? finish : tour.next}>
            {isLast ? copy.finish : copy.next}
          </PillButton>
        </div>
      </div>
    </div>,
    document.body,
  );
  return (
    <>
      {overlay}
      <Toast message={toastMessage} />
    </>
  );
}
