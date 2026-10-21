import type { BuilderSection } from '../../hooks/usePublishChecklist';
import { Icon } from '../../../../components/common/Icon/Icon';
import './StepNav.css';

export interface BuilderStep {
  section: BuilderSection;
  number: number;
  label: string;
  /** "1,980 kcal", "4 meals", "2 tips". */
  detail: string;
  done: boolean;
}

/** The three steps as pills: a check when done, else its number; the one in view is highlighted; a press scrolls to it. */
export function StepNav({ label, steps, active, onGo }: { label: string; steps: BuilderStep[]; active: BuilderSection; onGo: (section: BuilderSection) => void }) {
  return (
    <nav className="nb-steps" aria-label={label}>
      {steps.map((step) => (
        <button
          key={step.section}
          className="nb-step"
          type="button"
          data-done={step.done || undefined}
          aria-current={step.section === active ? 'step' : undefined}
          onClick={() => onGo(step.section)}
        >
          <span className="nb-step-mark" aria-hidden="true">
            {step.done ? <Icon name="check" size="sm" /> : step.number}
          </span>
          {step.label}
          <small className="nb-step-detail">
            <bdi>{step.detail}</bdi>
          </small>
        </button>
      ))}
    </nav>
  );
}
