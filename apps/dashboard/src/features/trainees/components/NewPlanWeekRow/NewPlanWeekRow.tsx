import type { PlanWeekOption } from '@sistem/types';
import { fill, formatPlural, formatWeekSpan, sharedCopy, useCopy, useLanguage, weekConflictOf } from '@sistem/shared';
import { Icon } from '../../../../components/common/Icon/Icon';
import './NewPlanWeekRow.css';

interface NewPlanWeekRowProps {
  entry: PlanWeekOption;
  /** "שבוע הבא", or in a multi-week range "שבוע 2" / "שבוע 1 · שבוע הבא". */
  label: string;
  isSelected: boolean;
  /** A later week the chosen multi-week plan covers: the same selected look (it is not a choice of its own). */
  isInRange: boolean;
  /** The week that stops the multi-week plan: a Cherry outline. */
  isBlocking: boolean;
  onSelect: () => void;
}

/**
 * One week of step 1: when, and what is already there — no chip = free (an empty draft too), purple =
 * a draft with its workouts, Cherry = published ✓. ONE selected look: pink border, light pink tint, pink dot.
 */
export function NewPlanWeekRow({ entry, label, isSelected, isInRange, isBlocking, onSelect }: NewPlanWeekRowProps) {
  const language = useLanguage();
  const text = useCopy(sharedCopy).newPlanFlow;
  const { plan } = entry;
  const isFree = weekConflictOf(plan) === 'free';
  const classNames = ['new-plan-row', isInRange && 'new-plan-row-in-range', isBlocking && 'new-plan-row-blocking'].filter(Boolean).join(' ');

  return (
    <button
      className={classNames}
      type="button"
      role="radio"
      aria-checked={isSelected}
      aria-description={isBlocking ? text.blockingRow : undefined}
      tabIndex={isSelected ? 0 : -1}
      onClick={onSelect}
    >
      <span className="new-plan-row-dot" aria-hidden="true" />
      <span className="new-plan-row-text">
        <span className="new-plan-row-label">{label}</span>
        <span className="new-plan-row-dates">{formatWeekSpan(entry.weekStartDate, language)}</span>
      </span>
      {plan && !isFree && plan.status === 'published' && (
        <span className="new-plan-chip new-plan-chip-live">
          {text.publishedChip}
          <Icon name="check" size="sm" />
        </span>
      )}
      {plan && !isFree && plan.status === 'draft' && (
        <span className="new-plan-chip new-plan-chip-draft">{fill(text.draftChip, { workouts: formatPlural(language, text.workouts, plan.workoutCount) })}</span>
      )}
    </button>
  );
}
