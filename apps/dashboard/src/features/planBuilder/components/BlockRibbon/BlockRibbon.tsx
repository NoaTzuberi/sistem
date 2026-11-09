import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { PlanBlockWeek } from '@sistem/types';
import { fill, formatNumber, formatWeekSpan, useCopy, useLanguage } from '@sistem/shared';
import { volumeShares, weekColorClass } from '../../data/blockWeeks';
import { planBuilderCopy } from '../../copy';
import './BlockRibbon.css';

/** A copy that just landed: the weeks after `fromWeek` fill one by one (`key` replays it). */
export interface RibbonFill {
  fromWeek: number;
  key: number;
}

interface BlockRibbonProps {
  weeks: PlanBlockWeek[];
  selectedWeek: number;
  fill: RibbonFill | null;
  onSelect: (week: PlanBlockWeek) => void;
}

const STAGGER_MS = 60;
const FILL_MS = 260;

/**
 * The block ribbon: one card per week in its color — name, dates, volume and a bar whose bottoms line
 * up, so the rise across the weeks and the light week's dip read at a glance. The selected week is
 * filled and lifted; the others show their tint; a week not filled yet is white.
 */
export function BlockRibbon({ weeks, selectedWeek, fill: landed, onSelect }: BlockRibbonProps) {
  const copy = useCopy(planBuilderCopy).block;
  const language = useLanguage();
  const shares = volumeShares(weeks);
  const listRef = useRef<HTMLDivElement>(null);
  // The weeks still filling after a copy (cleared when the last one is done).
  const [filling, setFilling] = useState<number | null>(null);

  useEffect(() => {
    if (!landed) return;
    setFilling(landed.fromWeek);
    const later = weeks.filter((entry) => entry.week > landed.fromWeek).length;
    const timer = window.setTimeout(() => setFilling(null), Math.max(0, later - 1) * STAGGER_MS + FILL_MS + 200);
    return () => window.clearTimeout(timer);
    // Replays only for a new copy.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landed?.key]);

  // The selected week stays in view (narrow screens, 5–8 weeks).
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [selectedWeek]);

  return (
    <div className="block-ribbon" role="tablist" aria-label={copy.ribbonLabel} ref={listRef}>
      {weeks.map((entry, index) => {
        const isSelected = entry.week === selectedWeek;
        const isEmpty = entry.workoutCount === 0;
        const isFilling = filling !== null && entry.week > filling;
        const classes = [
          'week-card',
          weekColorClass(entry.week),
          isSelected && 'week-card-selected',
          entry.isDeload && 'week-card-deload',
          isEmpty && 'week-card-empty',
          isFilling && 'week-card-filling',
        ].filter(Boolean);
        const style = {
          '--volume': shares[index].toFixed(3),
          '--fill-order': isFilling && filling !== null ? entry.week - filling - 1 : 0,
        } as CSSProperties;
        return (
          <button
            key={entry.planId}
            className={classes.join(' ')}
            type="button"
            role="tab"
            aria-selected={isSelected}
            tabIndex={isSelected ? 0 : -1}
            style={style}
            onClick={() => !isSelected && onSelect(entry)}
          >
            <span className="week-card-wash" aria-hidden="true" />
            <span className="week-card-text">
              <span className="week-card-name">{fill(copy.weekName, { n: entry.week })}</span>
              <span className="week-card-dates">{formatWeekSpan(entry.weekStartDate, language)}</span>
              {isEmpty ? (
                <span className="week-card-volume week-card-volume-empty">{copy.empty}</span>
              ) : (
                <span className="week-card-volume">
                  <bdi className="week-card-volume-number" dir="ltr">
                    {formatNumber(entry.volume.value, language)}
                  </bdi>{' '}
                  <span className="week-card-volume-unit">{entry.volume.unit === 'kg' ? copy.volumeKg : copy.volumeSets}</span>
                </span>
              )}
              {entry.isDeload && <span className="week-card-chip">{copy.deload}</span>}
            </span>
            <span className="week-card-bar" aria-hidden="true">
              <span className="week-card-bar-fill" />
            </span>
          </button>
        );
      })}
    </div>
  );
}
