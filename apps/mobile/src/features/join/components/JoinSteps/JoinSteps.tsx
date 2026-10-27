import { IconClipboardList, IconUserPlus, IconBarbell } from '@tabler/icons-react';
import { useCopy } from '@sistem/shared';
import { joinCopy } from '../../copy';
import './JoinSteps.css';

/** Sign up → questionnaire → her plan: three tiny steps, numbered 01 02 03. */
export function JoinSteps() {
  const copy = useCopy(joinCopy);
  const steps = [
    { icon: IconUserPlus, label: copy.steps.signUp },
    { icon: IconClipboardList, label: copy.steps.questionnaire },
    { icon: IconBarbell, label: copy.steps.plan },
  ];

  return (
    <ol className="join-steps">
      {steps.map(({ icon: Icon, label }, index) => (
        <li key={label} className="join-step">
          <span className="join-step-icon" aria-hidden="true">
            <Icon size={18} stroke={2} />
          </span>
          {/* i18n-ignore: a decorative step number, the same in every language */}
          <span className="join-step-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
          <span className="join-step-label">{label}</span>
        </li>
      ))}
    </ol>
  );
}
