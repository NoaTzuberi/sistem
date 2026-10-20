import { createPortal } from 'react-dom';
import { useSlideToStart } from '../../../hooks/useSlideToStart';
import './SlideToStart.css';

interface SlideToStartProps {
  /** The track's text; also the knob's accessible name unless `knobLabel` is given. */
  label: string;
  /** The knob's accessible name ("Slide to start the workout"). */
  knobLabel?: string;
  /** Shown (and announced) once the slide completes. */
  completeLabel?: string;
  /** inline = in the page · floating = pinned above the bottom edge (portaled to <body>). */
  variant?: 'inline' | 'floating';
  onComplete: () => void;
  busy?: boolean;
  /** Go back to the start this long after completing. */
  resetAfterMs?: number;
  /** Placement only. */
  className?: string;
}

/**
 * THE slide-to-start (Home's workout, a cardio session): a white track, a pink → purple trail that
 * follows the knob, and the label repeated in white inside the trail. Logic in `useSlideToStart`.
 */
export function SlideToStart({ label, knobLabel, completeLabel, variant = 'inline', onComplete, busy, resetAfterMs, className }: SlideToStartProps) {
  const { rootRef, knobRef, state, knobHandlers, onSnapEnd } = useSlideToStart({ onComplete, busy, resetAfterMs });
  const text = state === 'done' && completeLabel ? completeLabel : label;

  const slide = (
    <div ref={rootRef} className={['sts', `sts-${variant}`, className].filter(Boolean).join(' ')} data-state={state}>
      <span className="sts-trail" aria-hidden="true" />
      <span className="sts-label" aria-hidden="true">
        <span className="sts-text">{text}</span>
        {/* i18n-ignore: a decorative mono mark, hidden from screen readers (like the eyebrows) */}
        <span className="sts-go">GO</span>
      </span>
      <span className="sts-label sts-label-on" aria-hidden="true">
        <span className="sts-text">{text}</span>
        {/* i18n-ignore: a decorative mono mark, hidden from screen readers (like the eyebrows) */}
        <span className="sts-go">GO</span>
      </span>
      <button
        ref={knobRef}
        className="sts-knob"
        type="button"
        aria-label={knobLabel ?? label}
        aria-disabled={busy || state === 'done' ? true : undefined}
        onTransitionEnd={(event) => event.propertyName === 'transform' && event.target === event.currentTarget && onSnapEnd()}
        {...knobHandlers}
      >
        <svg className="sts-icon sts-icon-play" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 5.5v13a1 1 0 0 0 1.5.9l10.4-6.5a1 1 0 0 0 0-1.8L9.5 4.6A1 1 0 0 0 8 5.5z" fill="currentColor" />
        </svg>
        <svg className="sts-icon sts-icon-check" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <span className="sts-status" role="status">
        {state === 'done' && completeLabel ? completeLabel : ''}
      </span>
    </div>
  );

  // Fixed elements must sit outside the page-enter transform on <main>, or it would pin them.
  return variant === 'floating' ? createPortal(slide, document.body) : slide;
}
