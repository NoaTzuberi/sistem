import { useEffect } from 'react';
import { fill, useCopy } from '@sistem/shared';
import { IconBulb } from '@tabler/icons-react';
import { nutritionCopy } from '../../copy';
import './CoachTip.css';

interface CoachTipProps {
  /** The coach's tip on this plan version ({name} already filled by the server). */
  text: string;
  /** null = unknown (coach mode, an older cached plan): a neutral title. */
  coachName: string | null;
  /** Called once when shown (a tip without a note marks the version as read). */
  onSeen?: () => void;
}

/** The coach's tip, under her note: a small soft card with a bulb, "Tip from <first name>". */
export function CoachTip({ text, coachName, onSeen }: CoachTipProps) {
  const copy = useCopy(nutritionCopy);
  const firstName = coachName?.trim().split(/\s+/)[0] || null;

  useEffect(() => {
    onSeen?.();
  }, [onSeen]);

  return (
    <aside className="tn-tip">
      <IconBulb className="tn-tip-icon" size={18} stroke={1.75} aria-hidden="true" />
      <span className="tn-tip-body">
        <b className="tn-tip-title" dir="auto">
          {firstName ? fill(copy.tipFrom, { name: firstName }) : copy.tipFromCoach}
        </b>
        <span className="tn-tip-text" dir="auto">
          {text}
        </span>
      </span>
    </aside>
  );
}
