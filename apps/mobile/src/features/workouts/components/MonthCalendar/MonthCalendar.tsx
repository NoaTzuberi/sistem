import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { formatDateOnly, formatPlural, useCopy, useLanguage, weekdayName } from '@sistem/shared';
import { dayNumber, formatMonthTitle, type CalendarDay, type MonthKey } from '../../data/historyDisplay';
import { workoutCopy } from '../../copy';
import { DisplayText } from '../../../../components/common/DisplayText/DisplayText';
import './MonthCalendar.css';

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

interface MonthCalendarProps {
  month: MonthKey;
  days: CalendarDay[];
  /** The next-month button is off on the current month. */
  canGoNext: boolean;
  canGoPrevious: boolean;
  onPrevious: () => void;
  onNext: () => void;
  selectedDay: string | null;
  /** Tap a day with a workout to filter the log to it; tap it again to clear. */
  onSelectDay: (date: string) => void;
}

/** One month, Sunday first: a day with a workout is filled with its color (free = ink outline), today has a pink ring. */
export function MonthCalendar({ month, days, canGoNext, canGoPrevious, onPrevious, onNext, selectedDay, onSelectDay }: MonthCalendarProps) {
  const copy = useCopy(workoutCopy);
  const language = useLanguage();

  // The legend: the plan workouts (by letter) and free workouts seen this month.
  const legend = new Map<string, string>();
  let hasFree = false;
  for (const day of days) {
    if (!day.inMonth) continue;
    for (const item of day.logs) {
      if (item.isFree) hasFree = true;
      else if (item.letter && item.colorClass) legend.set(item.letter, item.colorClass);
    }
  }
  const legendItems = [...legend.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="month-calendar">
      <div className="month-calendar-head">
        <h3 className="month-calendar-title display-title" aria-live="polite">
          <DisplayText text={formatMonthTitle(month, language)} />
        </h3>
        <div className="month-calendar-nav">
          <button type="button" className="month-calendar-arrow" onClick={onPrevious} disabled={!canGoPrevious} aria-label={copy.history.previousMonth}>
            <IconChevronLeft className="flip-rtl" size={16} stroke={2.2} aria-hidden="true" />
          </button>
          <button type="button" className="month-calendar-arrow" onClick={onNext} disabled={!canGoNext} aria-label={copy.history.nextMonth}>
            <IconChevronRight className="flip-rtl" size={16} stroke={2.2} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="month-calendar-grid" role="grid" aria-label={formatMonthTitle(month, language)}>
        <div className="month-calendar-row" role="row">
          {WEEKDAYS.map((weekday) => (
            <span key={weekday} className="month-calendar-weekday" role="columnheader" aria-label={weekdayName(weekday, language)}>
              {weekdayName(weekday, language, 'narrow')}
            </span>
          ))}
        </div>
        {Array.from({ length: days.length / 7 }, (_, row) => (
          <div key={row} className="month-calendar-row" role="row">
            {days.slice(row * 7, row * 7 + 7).map((day) => {
              const latest = day.logs[0];
              const isFree = latest?.isFree ?? false;
              const classes = [
                'month-calendar-day',
                !day.inMonth && 'month-calendar-day-out',
                latest && (isFree ? 'month-calendar-day-free' : 'month-calendar-day-has'),
                latest && !isFree && (latest.colorClass ?? 'month-calendar-day-unplanned'),
                day.isToday && 'month-calendar-day-today',
                day.logs.length > 1 && 'month-calendar-day-multi',
              ]
                .filter(Boolean)
                .join(' ');
              const dateLabel = formatDateOnly(day.date, language);
              return (
                <span key={day.date} role="gridcell" className="month-calendar-cell">
                  {latest ? (
                    <button
                      type="button"
                      className={classes}
                      aria-pressed={selectedDay === day.date}
                      aria-label={formatPlural(language, copy.history.dayWorkouts, day.logs.length, { date: dateLabel })}
                      onClick={() => onSelectDay(day.date)}
                    >
                      {dayNumber(day.date)}
                    </button>
                  ) : (
                    <span className={classes}>
                      {dayNumber(day.date)}
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        ))}
      </div>

      {(legendItems.length > 0 || hasFree) && (
        <ul className="month-calendar-legend">
          {legendItems.map(([letter, colorClass]) => (
            <li key={letter} className={`month-calendar-legend-item ${colorClass}`}>
              <span className="month-calendar-swatch" aria-hidden="true" />
              {letter}
            </li>
          ))}
          {hasFree && (
            <li className="month-calendar-legend-item">
              <span className="month-calendar-swatch month-calendar-swatch-free" aria-hidden="true" />
              {copy.history.legendFree}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
