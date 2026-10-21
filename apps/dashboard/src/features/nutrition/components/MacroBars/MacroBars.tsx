import type { CSSProperties } from 'react';
import { foodGroupLabel, formatNumber, formatPortionCountLtr, useCopy, useLanguage } from '@sistem/shared';
import type { GroupShare } from '../../data/nutritionSummary';
import { nutritionCopy } from '../../copy';
import './MacroBars.css';

/** One row per portion group: its dot, name, portions a day, share of the day's kcal and a bar. */
export function MacroBars({ shares }: { shares: GroupShare[] }) {
  const language = useLanguage();
  const copy = useCopy(nutritionCopy).tab;
  return (
    <ul className="macro-bars">
      {shares.map((share) => (
        <li key={share.group} className={`macro-bars-row nutrition-group-${share.group}`}>
          <div className="macro-bars-top">
            <span className="macro-bars-dot" aria-hidden="true" />
            <span className="macro-bars-name">{foodGroupLabel(share.group, language)}</span>
            <b className="macro-bars-portions">
              {formatPortionCountLtr(share.portions)} <small>{copy.portionsUnit}</small>
            </b>
            <span className="macro-bars-percent">
              <bdi>{formatNumber(share.share, language, { style: 'percent' })}</bdi>
            </span>
          </div>
          <span className="macro-bars-track" aria-hidden="true">
            {/* A computed value, not styling: the group's share of the day. */}
            <span className="macro-bars-fill" style={{ '--share': share.share } as CSSProperties} />
          </span>
        </li>
      ))}
    </ul>
  );
}
