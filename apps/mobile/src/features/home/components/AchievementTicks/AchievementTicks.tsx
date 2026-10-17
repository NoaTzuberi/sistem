import type { TickState } from '../../data/homeDisplay';
import './AchievementTicks.css';

interface AchievementTicksProps {
  ticks: TickState[];
}

/** One tick per unit (or segment): done = ink, the next one pulses pink, the rest are soft grey. */
export function AchievementTicks({ ticks }: AchievementTicksProps) {
  return (
    <div className="achievement-ticks" aria-hidden="true">
      {ticks.map((state, index) => (
        <span key={index} className={`achievement-tick achievement-tick-${state}`} />
      ))}
    </div>
  );
}
