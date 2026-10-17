import { IconArrowRight, IconLoader2, IconPlayerPlayFilled } from '@tabler/icons-react';
import { useSlideToStart } from '../../hooks/useSlideToStart';
import './SlideToStart.css';

interface SlideToStartProps {
  /** On the track: "Slide to start workout" / "Resume workout · …". */
  label: string;
  /** The knob's name for screen readers (Enter / Space start it). */
  knobLabel: string;
  onComplete: () => void;
  busy: boolean;
}

export function SlideToStart({ label, knobLabel, onComplete, busy }: SlideToStartProps) {
  const { trackRef, state, knobHandlers, onSnapEnd } = useSlideToStart(onComplete, busy);

  return (
    <div className={`slide-to-start slide-to-start-${state}`} ref={trackRef} onTransitionEnd={onSnapEnd}>
      <span className="slide-to-start-fill" aria-hidden="true" />
      <span className="slide-to-start-label" aria-hidden="true">
        <span className="slide-to-start-text">{label}</span>
        <span className="slide-to-start-arrow">
          <IconArrowRight className="flip-rtl" size={16} stroke={2.4} />
        </span>
      </span>
      <button
        type="button"
        className="slide-to-start-knob"
        data-slide-knob
        aria-label={knobLabel}
        aria-busy={busy || undefined}
        {...knobHandlers}
      >
        {busy ? (
          <IconLoader2 className="slide-to-start-spinner" size={20} aria-hidden="true" />
        ) : (
          <IconPlayerPlayFilled size={18} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
