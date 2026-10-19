import { OnboardingProgress } from '../OnboardingProgress/OnboardingProgress';
import './StepHeading.css';

interface StepHeadingProps {
  /** The step's place in the flow; left out when one step is edited on its own. */
  progress?: { current: number; total: number };
  title: string;
  titleId?: string;
  /** The step's small helper lines (e.g. "Choose all that apply."), from the copy. */
  hints?: string[];
}

/** "Q.03" — the number is padded to the width of the total (10 steps → two digits). */
function questionNumber(current: number, total: number): string {
  // A code-like label, the same in every language. i18n-ignore
  return `Q.${String(current).padStart(Math.max(2, String(total).length), '0')}`;
}

/** The top of every step: progress segments, the question number, the question and its hints. */
export function StepHeading({ progress, title, titleId, hints = [] }: StepHeadingProps) {
  return (
    <div className="step-heading">
      {progress && (
        <>
          <OnboardingProgress currentStep={progress.current} totalSteps={progress.total} />
          <span className="step-heading-number" aria-hidden="true" data-deck-rise>
            <bdi dir="ltr">{questionNumber(progress.current, progress.total)}</bdi>
          </span>
        </>
      )}
      <h1 id={titleId} className="step-heading-title display-title" data-deck-rise>
        {title}
      </h1>
      {hints.map((hint) => (
        <p key={hint} className="step-heading-hint" data-deck-rise>
          {hint}
        </p>
      ))}
    </div>
  );
}
