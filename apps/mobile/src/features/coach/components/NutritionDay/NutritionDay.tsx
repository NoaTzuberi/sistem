import type { MealLogDay } from '@sistem/types';
import { fill, formatPortionCount, PORTION_GROUPS, sharedCopy, useCopy, useLanguage, weekdayName } from '@sistem/shared';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { PrivatePhoto } from '../../../../components/common/PrivatePhoto/PrivatePhoto';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { appCopy } from '../../../../copy';
import { nutritionCopy } from '../../../nutrition/copy';
import '../../../nutrition/groupColors.css';
import { coachCopy } from '../../copy';
import { dayMonthOf } from '../../data/coachMode';
import { useTraineeMealWeek } from '../../hooks/useTraineeMealWeek';
import { CoachCard } from '../CoachCard/CoachCard';
import { LockLine } from '../LockLine/LockLine';
import { PortionCells } from '../../../nutrition/components/PortionCells/PortionCells';
import './NutritionDay.css';

interface NutritionDayProps {
  traineeId: string;
  /** Overview: today's portions only (no day picker, no photos). */
  compact?: boolean;
}

const hasPlan = (day: MealLogDay) => Object.values(day.planned).some((count) => count > 0);

/**
 * Her portion tracking (read-only). Overview: today's fuel cells. Nutrition tab: a day picker over her Sunday
 * week (with week arrows) and a white card per day — portion chips per group and that day's meal photos
 * (unblurred here, with the lock line); the picked day's card also shows the fuel cells.
 */
export function NutritionDay({ traineeId, compact = false }: NutritionDayProps) {
  const copy = useCopy(coachCopy).detail;
  const nutrition = useCopy(nutritionCopy);
  const shared = useCopy(sharedCopy);
  const eyebrow = useCopy(appCopy).eyebrow;
  const language = useLanguage();
  const week = useTraineeMealWeek(traineeId, nutrition.trackingLoadError);
  const { data } = week;

  if (week.isLoading && !data) return <StateMessage>{shared.common.loading}</StateMessage>;
  if (!data) return <StateMessage onRetry={week.reload}>{week.error}</StateMessage>;

  const dayName = (date: string) => `${weekdayName(new Date(`${date}T00:00:00Z`).getUTCDay(), language, 'short')}, ${dayMonthOf(date)}`;

  if (compact) {
    const day = week.day;
    return (
      <CoachCard title={copy.todayPortions} eyebrow={eyebrow.today}>
        {day && hasPlan(day) ? <PortionCells planned={day.planned} eaten={day.eaten} /> : <p className="coach-card-text">{copy.noPortions}</p>}
      </CoachCard>
    );
  }

  return (
    <section className="nutrition-day" aria-label={nutrition.trackingTitle}>
      <h2 className="nutrition-day-title display-title">{nutrition.trackingTitle}</h2>
      <div className="nutrition-day-picker">
        <button type="button" className="nutrition-day-arrow" onClick={week.previousWeek} aria-label={nutrition.trackingPreviousWeek}>
          <IconChevronLeft className="flip-rtl" size={18} aria-hidden="true" />
        </button>
        <div className="nutrition-day-days" role="group" aria-label={copy.pickDay}>
          {data.days.map((entry, index) => (
            <button
              key={entry.date}
              type="button"
              className="nutrition-day-day"
              aria-pressed={entry.date === week.date}
              disabled={entry.date > data.today}
              onClick={() => week.pick(entry.date)}
            >
              <span className="nutrition-day-weekday">{weekdayName(index, language, 'narrow')}</span>
              <span className="nutrition-day-date">{Number(entry.date.slice(8))}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="nutrition-day-arrow"
          onClick={week.nextWeek}
          disabled={week.isCurrentWeek}
          aria-label={nutrition.trackingNextWeek}
        >
          <IconChevronRight className="flip-rtl" size={18} aria-hidden="true" />
        </button>
      </div>

      <ul className="nutrition-day-list">
        {week.pastDays.map((entry) => {
          const isPicked = entry.date === week.date;
          const title = entry.date === data.today ? copy.todayPortions : dayName(entry.date);
          return (
            <li key={entry.date} className={'nutrition-day-card' + (isPicked ? ' nutrition-day-card-picked' : '')}>
              <button type="button" className="nutrition-day-card-head" aria-pressed={isPicked} onClick={() => week.pick(entry.date)}>
                <span className="nutrition-day-card-title">{title}</span>
                {entry.date === data.today && <span className="nutrition-day-card-date">{dayName(entry.date)}</span>}
              </button>
              {!hasPlan(entry) ? (
                <p className="coach-card-text">{copy.noPortions}</p>
              ) : isPicked ? (
                <PortionCells planned={entry.planned} eaten={entry.eaten} />
              ) : (
                <ul className="nutrition-day-chips">
                  {PORTION_GROUPS.filter((group) => entry.planned[group] > 0).map((group) => (
                    <li key={group} className={`nutrition-day-chip tn-group-${group}`}>
                      {shared.nutrition.groups[group]}{' '}
                      <bdi dir="ltr">
                        {formatPortionCount(entry.eaten[group])}/{formatPortionCount(entry.planned[group])}
                      </bdi>
                    </li>
                  ))}
                </ul>
              )}
              {entry.photos.length > 0 && (
                <>
                  <div className="nutrition-day-photos">
                    {entry.photos.map((photo) => (
                      <PrivatePhoto
                        key={photo.id}
                        photo={photo}
                        alt={fill(nutrition.photoAlt, { meal: photo.mealName })}
                        openLabel={nutrition.photoOpen}
                        closeLabel={nutrition.photoClose}
                        onLinkExpired={week.reload}
                        thumbnail
                      />
                    ))}
                  </div>
                  <LockLine />
                </>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
