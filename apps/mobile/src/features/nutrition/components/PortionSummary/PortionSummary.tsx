import type { CSSProperties } from 'react';
import type { PortionCounts } from '@sistem/types';
import { PORTION_GROUPS, useCopy } from '@sistem/shared';
import { Eyebrow } from '../../../../components/common/Eyebrow/Eyebrow';
import { appCopy } from '../../../../copy';
import type { PlanMode } from '../../data/nutritionDay';
import { sumPortions } from '../../data/nutritionDay';
import { PortionNumber } from '../PortionNumber/PortionNumber';
import { nutritionCopy } from '../../copy';
import '../../groupColors.css';
import './PortionSummary.css';

interface PortionSummaryProps {
  planned: PortionCounts;
  eaten: PortionCounts;
  mode: PlanMode;
}

/** The day at a glance: "eaten / total" portions, and the MIX bar of what she marked per group. */
export function PortionSummary({ planned, eaten, mode }: PortionSummaryProps) {
  const copy = useCopy(nutritionCopy);
  const eyebrow = useCopy(appCopy).eyebrow;
  const total = sumPortions(planned);

  return (
    <div className="tn-summary">
      <div className="tn-summary-main">
        <PortionNumber className="tn-summary-total" value={sumPortions(eaten)} goal={total} separator=" / " />
        <span className="tn-summary-line">
          {copy.summaryLabel} · {mode === 'menu' ? copy.summaryMenu : copy.summaryPortions}
        </span>
      </div>
      {/* The same numbers as the rows below, as a picture: hidden from screen readers. */}
      <div className="tn-summary-mix" aria-hidden="true">
        <Eyebrow keepInEnglish>{eyebrow.mix}</Eyebrow>
        <span className="tn-summary-mix-bar">
          {PORTION_GROUPS.map((group) => (
            <i
              key={group}
              className={`tn-group-${group}`}
              style={{ '--share': total > 0 ? Math.min(eaten[group], planned[group]) / total : 0 } as CSSProperties}
            />
          ))}
        </span>
      </div>
    </div>
  );
}
