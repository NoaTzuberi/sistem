import { useCopy } from '@sistem/shared';
import { useLineClamp } from '../../hooks/useLineClamp';
import { profileCopy } from '../../copy';
import './ClampText.css';

/** A free-text answer, as she wrote it: at most 4 lines, "עוד" opens the rest. */
export function ClampText({ label, text }: { label?: string; text: string }) {
  const copy = useCopy(profileCopy);
  const { ref, expanded, clamped, toggle } = useLineClamp<HTMLParagraphElement>(text);
  return (
    <div className="qn-text">
      {label && <span className="qn-text-label">{label}</span>}
      <p ref={ref} className={'qn-text-body' + (expanded ? ' qn-text-open' : '')} dir="auto">
        {text}
      </p>
      {(clamped || expanded) && (
        <button type="button" className="qn-text-more" aria-expanded={expanded} onClick={toggle}>
          {expanded ? copy.questionnaire.less : copy.questionnaire.more}
        </button>
      )}
    </div>
  );
}
