import type { CSSProperties } from 'react';
import type { PortionCounts } from '@sistem/types';
import { PORTION_GROUPS, formatPortionCountLtr, sharedCopy, useCopy } from '@sistem/shared';
import './PortionBars.css';

interface PortionBarsProps {
  planned: PortionCounts;
  eaten: PortionCounts;
}

/** One bar per planned group: marked / planned (neutral — no judgment, no calories). A snack row only when planned. */
export function PortionBars({ planned, eaten }: PortionBarsProps) {
  const shared = useCopy(sharedCopy);
  const groups = PORTION_GROUPS.filter((group) => planned[group] > 0);
  return (
    <dl className="portion-bars">
      {groups.map((group) => {
        const share = Math.min(100, (eaten[group] / planned[group]) * 100);
        return (
          <div key={group} className={`portion-bar portion-bar-${group}`}>
            <dt className="portion-bar-label">{shared.nutrition.groups[group]}</dt>
            <dd className="portion-bar-track" aria-hidden="true">
              <span className="portion-bar-fill" style={{ '--portion-share': `${share}%` } as CSSProperties} />
            </dd>
            <dd className="portion-bar-count">
              {formatPortionCountLtr(eaten[group])}/{formatPortionCountLtr(planned[group])}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
