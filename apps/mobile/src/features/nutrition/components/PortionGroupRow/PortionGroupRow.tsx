import type { ReactNode } from 'react';
import type { PortionGroup } from '@sistem/types';
import { fill, sharedCopy, useCopy, useI18n } from '@sistem/shared';
import { IconCheck, IconChevronRight } from '@tabler/icons-react';
import { FuelBar } from '../FuelBar/FuelBar';
import { GroupBadge } from '../GroupBadge/GroupBadge';
import { PortionNumber, TextWithNumber } from '../PortionNumber/PortionNumber';
import { nutritionCopy } from '../../copy';
import '../../groupColors.css';
import './PortionGroupRow.css';

interface PortionGroupRowProps {
  group: PortionGroup;
  planned: number;
  eaten: number;
  editable: boolean;
  onChange: (value: number) => void;
  /** "What can I have?" (the food sheet); none without a food list (her own target). */
  onOpenFoods?: () => void;
  /** Bumped when she completes the group: the badge pops once per bump (0 = never). */
  popKey: number;
  /** A line under the row (the protein row: the coach's daily grams). */
  footer?: ReactNode;
}

/**
 * One group on the day (docs/design/trainee-nutrition.html): badge, name and "eaten/goal", the fuel bar,
 * then what is left (or done / over) and "what can I have?" (the food sheet on this group). No calories.
 */
export function PortionGroupRow({ group, planned, eaten, editable, onChange, onOpenFoods, popKey, footer }: PortionGroupRowProps) {
  const { plural } = useI18n();
  const shared = useCopy(sharedCopy);
  const copy = useCopy(nutritionCopy);
  const label = shared.nutrition.groups[group];
  const remaining = Math.max(0, planned - eaten);
  const over = Math.max(0, eaten - planned);

  return (
    <li className={`tn-group-row tn-group-${group}`}>
      <div className="tn-group-row-head">
        {/* Keyed by the pop count: a new completion mounts the badge again, so its pop plays again. */}
        <GroupBadge key={popKey} group={group} className={popKey > 0 ? 'tn-badge-pop' : undefined} />
        <h3 className="tn-group-row-name">{label}</h3>
        <PortionNumber className="tn-group-row-count" value={eaten} goal={planned} />
      </div>

      <FuelBar groupLabel={label} planned={planned} eaten={eaten} disabled={!editable} onChange={onChange} />

      <div className="tn-group-row-meta">
        {remaining > 0 ? (
          <span>
            <TextWithNumber
              text={plural(copy.remaining, remaining, { n: '{n}' })}
              number={<PortionNumber className="tn-group-row-left" value={remaining} />}
            />
          </span>
        ) : (
          <span className="tn-group-row-done">
            <IconCheck size={13} stroke={2.4} aria-hidden="true" />
            {copy.doneToday}
          </span>
        )}
        {over > 0 && (
          <span className="tn-group-row-over">
            <TextWithNumber text={copy.overGoal} number={<PortionNumber value={over} sign="+" />} />
          </span>
        )}
        {onOpenFoods && (
          <button type="button" className="tn-group-row-foods" onClick={onOpenFoods} aria-label={fill(copy.openSwaps, { label })}>
            {copy.whatCanI}
            <IconChevronRight className="flip-rtl" size={14} stroke={2.2} aria-hidden="true" />
          </button>
        )}
      </div>
      {footer}
    </li>
  );
}
