import type { PortionCounts } from '@sistem/types';
import { fill, formatNumber, formatPortionCount, PORTION_GROUPS, sharedCopy, useCopy, useLanguage } from '@sistem/shared';
import { GroupBadge } from '../GroupBadge/GroupBadge';
import { filledCells, fuelCapsules } from '../../data/portionCircles';
import '../../groupColors.css';
import './PortionCells.css';

interface PortionCellsProps {
  planned: PortionCounts;
  /** What she marked (the day's tracking). Missing = the plan itself: every planned cell is filled, the count is the plan. */
  eaten?: PortionCounts;
}

/**
 * The trainee screen's fuel cells (FuelBar), read-only — coach mode: a row per planned group with its badge, name and
 * count, a capsule per portion (two half-cells). Neutral — no calories, no judgment. Snack only when planned.
 */
export function PortionCells({ planned, eaten }: PortionCellsProps) {
  const shared = useCopy(sharedCopy);
  const language = useLanguage();
  const groups = PORTION_GROUPS.filter((group) => planned[group] > 0);

  return (
    <dl className="portion-cells">
      {groups.map((group) => {
        const goal = planned[group];
        const marked = eaten ? eaten[group] : goal;
        const filled = filledCells(goal, marked);
        let cell = 0;
        return (
          <div key={group} className={`portion-cells-group tn-group-${group}`}>
            <dt className="portion-cells-head">
              <GroupBadge group={group} className="portion-cells-badge" />
              <span className="portion-cells-name display-title">{shared.nutrition.groups[group]}</span>
            </dt>
            <dd className="portion-cells-count">
              {eaten ? (
                <span aria-label={fill(shared.nutrition.marked, { eaten: formatPortionCount(marked), planned: formatPortionCount(goal) })}>
                  <bdi dir="ltr">
                    {formatPortionCount(marked)}
                    <span className="portion-cells-goal">/{formatPortionCount(goal)}</span>
                  </bdi>
                </span>
              ) : (
                <bdi dir="ltr">{formatPortionCount(goal)}</bdi>
              )}
            </dd>
            <dd className="portion-cells-bar" aria-hidden="true">
              {fuelCapsules(goal).map((capsule) => {
                const half = capsule.cells.length === 1;
                const full = capsule.cells.every((index) => index < filled);
                return (
                  <span key={capsule.portion} className={'portion-cells-capsule' + (half ? ' portion-cells-capsule-half' : '') + (full ? ' portion-cells-capsule-full' : '')}>
                    <span className="portion-cells-number">{half ? formatPortionCount(0.5) : formatNumber(capsule.portion, language)}</span>
                    {capsule.cells.map(() => {
                      const on = cell < filled;
                      cell += 1;
                      return <span key={cell} className={'portion-cells-cell' + (on ? ' portion-cells-cell-on' : '')} />;
                    })}
                  </span>
                );
              })}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
