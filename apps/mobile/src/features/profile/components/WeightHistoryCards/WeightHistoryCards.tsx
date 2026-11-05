import type { BodyMetric, WeightUnit } from '@sistem/types';
import { IconChevronRight } from '@tabler/icons-react';
import { formatDateOnly, formatNumber, roundOneDecimal, toDisplayWeight, unitLabel, useCopy, useLanguage, weighIns } from '@sistem/shared';
import { bodyCopy } from '../../../bodyTracking/copy';
import './WeightHistoryCards.css';

interface WeightHistoryCardsProps {
  metrics: BodyMetric[];
  unit: WeightUnit;
  /** Her own screen: tap a day to edit it. Coach mode passes nothing (read-only rows). */
  onEdit?: (metric: BodyMetric) => void;
}

/** "היסטוריה": a white card per weigh-in (newest first) with its change since the one before (cherry = down, grey = up). */
export function WeightHistoryCards({ metrics, unit, onEdit }: WeightHistoryCardsProps) {
  const language = useLanguage();
  const copy = useCopy(bodyCopy);
  const days = weighIns(metrics);
  const Row = onEdit ? 'button' : 'div';
  if (days.length === 0) return null;

  return (
    <section className="wt-history" aria-labelledby="wt-history-title">
      <h2 className="wt-history-title display-title" id="wt-history-title">
        {copy.historyTitle}
      </h2>
      <ul className="wt-history-list">
        {days.map((day, index) => {
          const value = toDisplayWeight(day.weight, unit);
          const previous = days[index + 1];
          const change = previous ? roundOneDecimal(value - toDisplayWeight(previous.weight, unit)) : null;
          return (
            <li key={day.date}>
              <Row className="wt-row" {...(onEdit ? { type: 'button' as const, onClick: () => onEdit(day) } : {})}>
                <span className="wt-row-date">{formatDateOnly(day.date, language)}</span>
                {change !== null && (
                  <span className={change < 0 ? 'wt-row-change wt-row-change-down' : 'wt-row-change'}>
                    <bdi dir="ltr">{change > 0 ? `+${formatNumber(change, language)}` : change < 0 ? `−${formatNumber(-change, language)}` : '0'}</bdi>
                  </span>
                )}
                <span className="wt-row-value">
                  <bdi dir="ltr">{formatNumber(value, language)}</bdi>
                  <small>{unitLabel(unit, language)}</small>
                </span>
                {onEdit && <IconChevronRight className="wt-row-chevron flip-rtl" size={18} aria-hidden="true" />}
              </Row>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
