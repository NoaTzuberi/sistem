import type { FoodGroup, MealLogDay, PortionGroup, Language } from '@sistem/types';
import { describePortion, fill, formatDateOnly, PORTION_GROUPS, sharedCopy, useCopy, useLanguage, dateFormat } from '@sistem/shared';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { circlesFor, hasHalfMark, tapCircle, toggleHalf, withGroup } from '../../data/portionCircles';
import { nutritionCopy } from '../../copy';
import type { TrackerSync } from '../../hooks/useMealTracker';
import './PortionTracker.css';

interface PortionTrackerProps {
  days: MealLogDay[];
  date: string;
  today: string;
  onSelectDate: (date: string) => void;
  onChange: (date: string, eaten: MealLogDay['eaten']) => void;
  onOpenSwaps: (group: FoodGroup) => void;
  vegetablesFree: boolean;
  hasVegetableSwaps: boolean;
  sync: TrackerSync;
  offline: boolean;
}

/** The day's narrow weekday name in the language on screen (Intl). */
function weekdayOf(date: string, language: Language): string {
  return dateFormat(language, { weekday: 'narrow', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
}

/**
 * The day header and tracker (PRD §5.6, 13a+): per group the day's total (a button to its
 * swaps) and one circle per planned portion — tap = one portion, tap a marked one = undo,
 * "½" for half a portion. Never more than planned; no calories; nothing about what she ate.
 */
export function PortionTracker(props: PortionTrackerProps) {
  const language = useLanguage();
  const shared = useCopy(sharedCopy);
  const copy = useCopy(nutritionCopy);
  const { days, date, today, onSelectDate, onChange, onOpenSwaps, vegetablesFree, hasVegetableSwaps, sync, offline } = props;
  const index = days.findIndex((day) => day.date === date);
  const day = days[index];
  if (!day) return null;
  const hasPlan = day.planVersion !== null && PORTION_GROUPS.some((group) => day.planned[group] > 0);
  const canEdit = day.editable && hasPlan;

  function set(group: PortionGroup, value: number) {
    onChange(day.date, withGroup(day.eaten, group, value));
  }

  return (
    <section className="portion-tracker" aria-labelledby="portion-tracker-title">
      <div className="portion-tracker-nav">
        <button
          type="button"
          className="portion-tracker-arrow"
          onClick={() => onSelectDate(days[index - 1].date)}
          disabled={index <= 0}
          aria-label={copy.previousDay}
        >
          <IconChevronLeft className="flip-rtl" size={20} aria-hidden="true" />
        </button>
        <h2 className="portion-tracker-title display-title" id="portion-tracker-title">
          {date === today ? `${copy.today}, ${formatDateOnly(date, language)}` : formatDateOnly(date, language)}
        </h2>
        <button
          type="button"
          className="portion-tracker-arrow"
          onClick={() => onSelectDate(days[index + 1].date)}
          disabled={index >= days.length - 1}
          aria-label={copy.nextDay}
        >
          <IconChevronRight className="flip-rtl" size={20} aria-hidden="true" />
        </button>
      </div>

      <div className="portion-tracker-days" role="group" aria-label={copy.dayTitle}>
        {days.map((candidate) => (
          <button
            key={candidate.date}
            type="button"
            className={'portion-tracker-day' + (candidate.date === date ? ' portion-tracker-day-selected' : '')}
            aria-pressed={candidate.date === date}
            aria-label={formatDateOnly(candidate.date, language)}
            onClick={() => onSelectDate(candidate.date)}
          >
            {weekdayOf(candidate.date, language)}
            {candidate.logged && <span className="portion-tracker-day-dot" aria-hidden="true" />}
          </button>
        ))}
      </div>

      {!hasPlan ? (
        <p className="portion-tracker-note">{copy.trackerNoPlan}</p>
      ) : (
        <ul className="portion-tracker-groups">
          {PORTION_GROUPS.filter((group) => day.planned[group] > 0).map((group) => {
            const planned = day.planned[group];
            const eaten = day.eaten[group];
            const groupLabel = shared.nutrition.groups[group];
            const totalLabel = describePortion(group, planned, language);
            const half = hasHalfMark(eaten);
            return (
              <li key={group} className="portion-tracker-row">
                <button
                  type="button"
                  className="portion-tracker-total"
                  onClick={() => onOpenSwaps(group)}
                  aria-label={fill(copy.openSwaps, { label: totalLabel })}
                >
                  {totalLabel}
                </button>
                <div className="portion-tracker-circles">
                  {circlesFor(planned, eaten).map((circle, circleIndex) => (
                    <button
                      key={circleIndex}
                      type="button"
                      className={[
                        'portion-tracker-circle',
                        circle.size < 1 ? 'portion-tracker-circle-small' : '',
                        circle.filled >= circle.size ? 'portion-tracker-circle-full' : circle.filled > 0 ? 'portion-tracker-circle-half' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      disabled={!canEdit}
                      aria-label={fill(copy.circleLabel, {
                        group: groupLabel,
                        n: circleIndex + 1,
                        state: circle.filled > 0 ? copy.circleMarked : copy.circleUnmarked,
                      })}
                      onClick={() => set(group, tapCircle(circle, planned, eaten))}
                    >
                      <span className="portion-tracker-circle-mark" aria-hidden="true" />
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className={'portion-tracker-half' + (half ? ' portion-tracker-half-on' : '')}
                  disabled={!canEdit || (!half && eaten >= planned)}
                  aria-pressed={half}
                  aria-label={half ? fill(copy.halfRemove, { group: groupLabel.toLowerCase() }) : fill(copy.halfAdd, { group: groupLabel.toLowerCase() })}
                  onClick={() => set(group, toggleHalf(planned, eaten))}
                >
                  ½
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {vegetablesFree &&
        (hasVegetableSwaps ? (
          <button type="button" className="portion-tracker-vegetables portion-tracker-vegetables-button" onClick={() => onOpenSwaps('vegetable')}>
            {shared.nutrition.vegetablesFree}
          </button>
        ) : (
          <p className="portion-tracker-vegetables">{shared.nutrition.vegetablesFree}</p>
        ))}

      <p className="portion-tracker-note" role="status">
        {offline
          ? copy.trackerOffline
          : sync === 'pending'
            ? copy.trackerSavedLocally
            : sync === 'saving'
              ? copy.trackerSaving
              : !day.editable && hasPlan
                ? copy.trackerReadOnly
                : hasPlan
                  ? copy.trackerHint
                  : ''}
      </p>
    </section>
  );
}
