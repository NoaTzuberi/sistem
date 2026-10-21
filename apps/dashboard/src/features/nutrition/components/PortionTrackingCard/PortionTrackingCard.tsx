import { useState } from 'react';
import { dateFormat, fill, formatDateOnly, formatPortionCountLtr, formatWeekSpan, PORTION_GROUPS, sharedCopy, useCopy, useLanguage } from '@sistem/shared';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import { nutritionCopy } from '../../copy';
import { usePortionTracking } from '../../hooks/usePortionTracking';
import { DayPortionCard } from '../DayPortionCard/DayPortionCard';
import { DayPortionDetails } from '../DayPortionDetails/DayPortionDetails';
import { WeekNavigator } from '../WeekNavigator/WeekNavigator';
import { WeeklyPortionRing } from '../WeeklyPortionRing/WeeklyPortionRing';
import './PortionTrackingCard.css';

const parseDay = (date: string) => new Date(`${date}T00:00:00Z`);

/**
 * Her portion tracking (PRD §5.6, 13a+), one Sunday week, read-only: the week per group as rings,
 * each day as a card (opens to its meals and photos), and the daily goal per group.
 */
export function PortionTrackingCard({ traineeId }: { traineeId: string }) {
  const language = useLanguage();
  const shared = useCopy(sharedCopy);
  const copy = useCopy(nutritionCopy);
  const t = copy.tracking;
  const tracking = usePortionTracking(traineeId);
  const [openDate, setOpenDate] = useState<string | null>(null);
  const { data } = tracking;
  const open = tracking.days.find((entry) => entry.day.date === openDate && entry.hasDetails);

  return (
    <section className="nb-tracking" aria-labelledby="nb-tracking-title">
      <header className="nb-tracking-head">
        <div className="nb-tracking-heading">
          <h2 className="nb-tracking-title" id="nb-tracking-title">
            {copy.trackingTitle}
          </h2>
          <p className="nb-tracking-subtitle">{t.subtitle}</p>
        </div>
        {data && (
          <WeekNavigator
            range={formatWeekSpan(data.weekStart, language)}
            previousLabel={t.previousWeek}
            nextLabel={t.nextWeek}
            nextDisabled={tracking.isCurrentWeek}
            onPrevious={() => {
              setOpenDate(null);
              tracking.previous();
            }}
            onNext={() => {
              setOpenDate(null);
              tracking.next();
            }}
          />
        )}
      </header>

      {tracking.isLoading && !data && <p className="nb-tracking-note">{shared.common.loading}</p>}
      {!data && tracking.error && (
        <p className="nb-tracking-note" role="alert">
          {tracking.error}{' '}
          <PillButton size="sm" onClick={tracking.reload}>
            {shared.common.retry}
          </PillButton>
        </p>
      )}

      {data && (
        <>
          <div className="nb-tracking-rings">
            {PORTION_GROUPS.map((group) => {
              const eaten = data.totals.eaten[group];
              const planned = data.totals.planned[group];
              return (
                <WeeklyPortionRing
                  key={group}
                  group={group}
                  label={shared.nutrition.groups[group]}
                  eaten={eaten}
                  planned={planned}
                  description={fill(t.weekRing, { group: shared.nutrition.groups[group], eaten: formatPortionCountLtr(eaten), planned: formatPortionCountLtr(planned) })}
                />
              );
            })}
          </div>

          <div className="nb-tracking-days">
            {tracking.days.map((entry) => (
              <DayPortionCard
                key={entry.day.date}
                entry={entry}
                dayLetter={dateFormat(language, { weekday: 'short', timeZone: 'UTC' }).format(parseDay(entry.day.date))}
                date={dateFormat(language, { day: 'numeric', month: 'numeric', timeZone: 'UTC' }).format(parseDay(entry.day.date))}
                isOpen={openDate === entry.day.date}
                onOpen={() => setOpenDate((current) => (current === entry.day.date ? null : entry.day.date))}
              />
            ))}
          </div>

          {open && <DayPortionDetails day={open.day} title={formatDateOnly(open.day.date, language)} onClose={() => setOpenDate(null)} />}

          <ul className="nb-tracking-legend">
            {PORTION_GROUPS.filter((group) => (tracking.dailyGoal[group] ?? 0) > 0).map((group) => (
              <li key={group} className="nb-tracking-legend-item" data-group={group}>
                <span className="nb-tracking-legend-dot" aria-hidden="true" />
                {fill(t.perDay, { group: shared.nutrition.groups[group], count: formatPortionCountLtr(tracking.dailyGoal[group] ?? 0) })}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
