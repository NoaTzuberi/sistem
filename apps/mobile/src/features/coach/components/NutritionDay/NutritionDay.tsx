import { useCallback, useState } from 'react';
import { addDaysToDate, fill, sharedCopy, useCopy, useLanguage, useLoad, weekdayName } from '@sistem/shared';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { getTraineeMealLogs } from '../../../../services/coach/coachService';
import { PrivatePhoto } from '../../../../components/common/PrivatePhoto/PrivatePhoto';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { appCopy } from '../../../../copy';
import { nutritionCopy } from '../../../nutrition/copy';
import { coachCopy } from '../../copy';
import { dayMonthOf } from '../../data/coachMode';
import { CoachCard } from '../CoachCard/CoachCard';
import { LockLine } from '../LockLine/LockLine';
import { PortionBars } from '../PortionBars/PortionBars';
import './NutritionDay.css';

interface NutritionDayProps {
  traineeId: string;
  /** Overview: today's portions only (no day picker, no photos). */
  compact?: boolean;
}

/**
 * Her portion tracking for one day (read-only): marked / planned per group and, outside the overview, a day
 * picker over her Sunday week (with week arrows) and that day's meal photos — unblurred here, with the lock line.
 */
export function NutritionDay({ traineeId, compact = false }: NutritionDayProps) {
  const copy = useCopy(coachCopy).detail;
  const nutrition = useCopy(nutritionCopy);
  const shared = useCopy(sharedCopy);
  const eyebrow = useCopy(appCopy).eyebrow;
  const language = useLanguage();
  // null = her current week (the server knows her zone).
  const [weekStart, setWeekStart] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const load = useCallback(() => getTraineeMealLogs(traineeId, weekStart ?? undefined), [traineeId, weekStart]);
  const { data, error, isLoading, reload } = useLoad(load, nutrition.trackingLoadError);

  if (isLoading && !data) return <StateMessage>{shared.common.loading}</StateMessage>;
  if (!data) return <StateMessage onRetry={reload}>{error}</StateMessage>;

  const isCurrentWeek = data.today >= data.weekStart && data.today <= addDaysToDate(data.weekStart, 6);
  const date = picked && data.days.some((day) => day.date === picked) ? picked : isCurrentWeek ? data.today : data.days[data.days.length - 1]?.date;
  const day = data.days.find((entry) => entry.date === date);
  const isToday = date === data.today;
  const hasPlan = day && Object.values(day.planned).some((count) => count > 0);

  function moveWeek(days: number) {
    setPicked(null);
    setWeekStart(addDaysToDate(data!.weekStart, days));
  }

  return (
    <>
      <CoachCard title={isToday ? copy.todayPortions : copy.dayPortions} eyebrow={isToday ? eyebrow.today : date ? dayMonthOf(date) : undefined}>
        {!compact && (
          <div className="nutrition-day-picker">
            <button type="button" className="nutrition-day-arrow" onClick={() => moveWeek(-7)} aria-label={nutrition.trackingPreviousWeek}>
              <IconChevronLeft className="flip-rtl" size={18} aria-hidden="true" />
            </button>
            <div className="nutrition-day-days" role="group" aria-label={copy.pickDay}>
              {data.days.map((entry, index) => (
                <button
                  key={entry.date}
                  type="button"
                  className="nutrition-day-day"
                  aria-pressed={entry.date === date}
                  disabled={entry.date > data.today}
                  onClick={() => setPicked(entry.date)}
                >
                  <span className="nutrition-day-weekday">{weekdayName(index, language, 'narrow')}</span>
                  <span className="nutrition-day-date">{Number(entry.date.slice(8))}</span>
                </button>
              ))}
            </div>
            <button type="button" className="nutrition-day-arrow" onClick={() => moveWeek(7)} disabled={isCurrentWeek} aria-label={nutrition.trackingNextWeek}>
              <IconChevronRight className="flip-rtl" size={18} aria-hidden="true" />
            </button>
          </div>
        )}
        {day && hasPlan ? <PortionBars planned={day.planned} eaten={day.eaten} /> : <p className="coach-card-text">{copy.noPortions}</p>}
      </CoachCard>

      {!compact && day && (
        <CoachCard title={isToday ? copy.mealPhotosToday : `${copy.mealPhotos} · ${date ? dayMonthOf(date) : ''}`}>
          {day.photos.length > 0 ? (
            <div className="nutrition-day-photos">
              {day.photos.map((photo) => (
                <PrivatePhoto
                  key={photo.id}
                  photo={photo}
                  alt={fill(nutrition.photoAlt, { meal: photo.mealName })}
                  openLabel={nutrition.photoOpen}
                  closeLabel={nutrition.photoClose}
                  onLinkExpired={reload}
                  thumbnail
                />
              ))}
            </div>
          ) : (
            <p className="coach-card-text">{copy.noPhotos}</p>
          )}
          <LockLine />
        </CoachCard>
      )}
    </>
  );
}
