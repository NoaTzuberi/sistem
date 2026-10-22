import { fill, useCopy } from '@sistem/shared';
import { firstRunCopy } from '../../copy';
import './StepBar.css';

interface StepBarProps {
  /** Steps reached (1-based). */
  step: number;
  total?: number;
}

/** The first run's 4-segment progress: sign-up, choice, code, confirm. */
export function StepBar({ step, total = 4 }: StepBarProps) {
  const copy = useCopy(firstRunCopy);
  return (
    <div className="fr-steps" role="img" aria-label={fill(copy.stepsLabel, { step, total })}>
      {Array.from({ length: total }, (_, index) => (
        <span key={index} className="fr-step" data-on={index < step || undefined} />
      ))}
    </div>
  );
}
