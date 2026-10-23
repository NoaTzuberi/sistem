import { useCallback, useState } from 'react';
import { addDaysToDate, describeMarked, describeTrackingDay, fill, formatDateOnly, formatWeekRange, mealPortionList, sharedCopy, useCopy, useLanguage, useLoad } from '@sistem/shared';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { getTraineeMealLogs } from '../../../../services/coach/coachService';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { PrivatePhoto } from '../../../../components/common/PrivatePhoto/PrivatePhoto';
import { nutritionCopy } from '../../../nutrition/copy';
import './TraineeTracking.css';

/**
 * Coach mode, read-only (PRD §5.6, 13a+): her portion tracking for one Sunday week —
 * marked vs planned per group, and her meal photos. Neutral: no scores, no calories.
 */
export function TraineeTracking({ traineeId }: { traineeId: string }) {
  const language = useLanguage();
  const copy = useCopy(nutritionCopy);
  const shared = useCopy(sharedCopy);
  // null = her current week (the server knows her zone).
  const [weekStart, setWeekStart] = useState<string | null>(null);
  const load = useCallback(() => getTraineeMealLogs(traineeId, weekStart ?? undefined), [traineeId, weekStart]);
  const { data, error, isLoading, reload } = useLoad(load, copy.trackingLoadError);

  if (isLoading && !data) return <StateMessage>{shared.common.loading}</StateMessage>;
  if (!data) return <StateMessage onRetry={reload}>{error}</StateMessage>;

  const isCurrentWeek = data.today >= data.weekStart && data.today <= addDaysToDate(data.weekStart, 6);
  const weekTotals = mealPortionList(data.totals.planned);

  return (
    <div className="coach-tracking">
      <div className="coach-tracking-nav">
        <button
          type="button"
          className="coach-tracking-arrow"
          onClick={() => setWeekStart(addDaysToDate(data.weekStart, -7))}
          aria-label={copy.trackingPreviousWeek}
        >
          <IconChevronLeft className="flip-rtl" size={20} aria-hidden="true" />
        </button>
        <h2 className="coach-tracking-title">{fill(copy.trackingWeek, { range: formatWeekRange(data.weekStart, language) })}</h2>
        <button
          type="button"
          className="coach-tracking-arrow"
          onClick={() => setWeekStart(addDaysToDate(data.weekStart, 7))}
          disabled={isCurrentWeek}
          aria-label={copy.trackingNextWeek}
        >
          <IconChevronRight className="flip-rtl" size={20} aria-hidden="true" />
        </button>
      </div>

      {weekTotals.length > 0 && (
        <p className="coach-tracking-week">
          <strong>{copy.trackingWeekTotal}</strong>{' '}
          {weekTotals.map(({ group }) => `${shared.nutrition.groups[group]} ${describeMarked(data.totals.eaten[group], data.totals.planned[group], language)}`).join(' · ')}
        </p>
      )}

      <ul className="coach-tracking-days">
        {data.days.map((day) => {
          const view = describeTrackingDay(day, data.today, language);
          return (
            <li key={day.date} className="coach-tracking-day">
              <span className="coach-tracking-date">{formatDateOnly(day.date, language)}</span>
              {view.status === 'future' && <span className="coach-tracking-muted">{copy.trackingNotYet}</span>}
              {view.status === 'no_plan' && <span className="coach-tracking-muted">{copy.trackingNoPlan}</span>}
              {(view.status === 'marked' || view.status === 'not_marked') && (
                <span className={view.status === 'marked' ? 'coach-tracking-groups' : 'coach-tracking-muted'}>
                  {view.status === 'marked'
                    ? view.groups.map((group) => `${group.label} ${group.text}`).join(' · ')
                    : copy.trackingNotMarked}
                </span>
              )}
              {day.photos.length > 0 && (
                <div className="coach-tracking-photos">
                  {day.photos.map((photo) => (
                    <div key={photo.id} className="coach-tracking-photo">
                      <PrivatePhoto
                        photo={photo}
                        alt={fill(copy.photoAlt, { meal: photo.mealName })}
                        openLabel={copy.photoOpen}
                        closeLabel={copy.photoClose}
                        onLinkExpired={reload}
                        thumbnail
                      />
                      <span className="coach-tracking-photo-name" dir="auto">
                        {photo.mealName}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
