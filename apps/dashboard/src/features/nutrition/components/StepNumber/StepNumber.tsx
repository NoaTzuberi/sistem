import { Icon } from '../../../../components/common/Icon/Icon';
import './StepNumber.css';

/**
 * A step's number at the head of its section: pink-soft while open, Cherry Rose with a check once its
 * checks are done (the same mark as the steps nav). Decorative — the title says which step it is.
 */
export function StepNumber({ number, isDone }: { number: number; isDone: boolean }) {
  return (
    <span className="nb-step-number" data-done={isDone || undefined} aria-hidden="true">
      {isDone ? <Icon name="check" size="sm" /> : number}
    </span>
  );
}
