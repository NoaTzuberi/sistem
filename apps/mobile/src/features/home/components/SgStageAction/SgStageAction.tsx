import { IconPlus } from '@tabler/icons-react';
import './SgStageAction.css';

interface SgStageActionProps {
  line: string;
  actionLabel: string;
  onAction: () => void;
}

/** The pink stage without a plan (self-guided, or a coach still building it): one line + ONE white action. */
export function SgStageAction({ line, actionLabel, onAction }: SgStageActionProps) {
  return (
    <div className="sg-stage">
      <p className="sg-stage-line display-title" dir="auto">
        {line}
      </p>
      <button type="button" className="sg-stage-action" onClick={onAction}>
        <IconPlus size={16} stroke={3} aria-hidden="true" />
        {actionLabel}
      </button>
    </div>
  );
}
