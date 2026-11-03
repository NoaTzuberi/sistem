import type { BodyMetric, LengthUnit } from '@sistem/types';
import { IconChevronRight } from '@tabler/icons-react';
import { formatDateOnly, formatNumber, measurementLabel, toDisplayLength, useCopy, useLanguage } from '@sistem/shared';
import { bodyCopy } from '../../../bodyTracking/copy';
import './MeasHistory.css';

interface MeasHistoryProps {
  days: BodyMetric[];
  ids: string[];
  unit: LengthUnit;
  selectedId: string;
  onOpen: (day: BodyMetric) => void;
}

/** "היסטוריה": a white card per day (newest first), its values as soft chips; the chart's measurement in ink. */
export function MeasHistory({ days, ids, unit, selectedId, onOpen }: MeasHistoryProps) {
  const language = useLanguage();
  const copy = useCopy(bodyCopy);
  if (days.length === 0) return null;

  return (
    <section className="meas-history" aria-labelledby="meas-history-title">
      <h2 className="meas-history-title display-title" id="meas-history-title">
        {copy.historyTitle}
      </h2>
      <ul className="meas-history-list">
        {days.map((day) => (
          <li key={day.date}>
            <button type="button" className="meas-row" onClick={() => onOpen(day)}>
              <span className="meas-row-text">
                <span className="meas-row-date">{formatDateOnly(day.date, language)}</span>
                <span className="meas-row-chips">
                  {ids
                    .filter((id) => day.measurements[id] !== undefined)
                    .map((id) => (
                      <span key={id} className={'meas-row-chip' + (id === selectedId ? ' meas-row-chip-selected' : '')}>
                        {measurementLabel(id, language)} <bdi dir="ltr">{formatNumber(toDisplayLength(day.measurements[id], unit), language)}</bdi>
                      </span>
                    ))}
                </span>
              </span>
              <IconChevronRight className="meas-row-chevron flip-rtl" size={18} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
