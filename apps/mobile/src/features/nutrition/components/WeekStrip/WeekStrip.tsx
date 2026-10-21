import type { CSSProperties } from 'react';
import { dateFormat, formatDateOnly, formatNumber, useCopy, useLanguage } from '@sistem/shared';
import type { WeekDay } from '../../data/nutritionDay';
import { nutritionCopy } from '../../copy';
import './WeekStrip.css';

interface WeekStripProps {
  week: WeekDay[];
  selected: string;
  onSelect: (date: string) => void;
}

/**
 * Her current Sunday week: weekday letter, day number and a small bar of that day's portions. Past days
 * (her 7-day window) open their log; future days are disabled.
 */
export function WeekStrip({ week, selected, onSelect }: WeekStripProps) {
  const language = useLanguage();
  const copy = useCopy(nutritionCopy);
  const letter = dateFormat(language, { weekday: 'narrow', timeZone: 'UTC' });

  return (
    <div className="tn-week" role="tablist" aria-label={copy.daysLabel}>
      {week.map((day) => (
        <button
          key={day.date}
          type="button"
          role="tab"
          aria-selected={day.date === selected}
          aria-label={formatDateOnly(day.date, language)}
          disabled={!day.available}
          className={'tn-week-day' + (day.state === 'future' ? ' tn-week-day-future' : '')}
          onClick={() => onSelect(day.date)}
        >
          <small className="tn-week-letter" aria-hidden="true">
            {letter.format(new Date(`${day.date}T00:00:00Z`))}
          </small>
          <b className="tn-week-number" aria-hidden="true">
            {formatNumber(day.dayOfMonth, language)}
          </b>
          <span className="tn-week-bar" aria-hidden="true">
            <i style={{ '--progress': day.progress } as CSSProperties} />
          </span>
        </button>
      ))}
    </div>
  );
}
