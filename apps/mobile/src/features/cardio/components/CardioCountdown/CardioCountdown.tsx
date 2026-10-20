import './CardioCountdown.css';

/** The 3-2-1 before the run: each number pops in (keyed, so the animation restarts). */
export function CardioCountdown({ value }: { value: number }) {
  return (
    <div className="cp-countdown" role="timer" aria-live="assertive">
      <span key={value} className="cp-countdown-number">
        {value}
      </span>
    </div>
  );
}
