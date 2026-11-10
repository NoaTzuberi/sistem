import { IconCheck } from '@tabler/icons-react';
import type { PlanWeekOption } from '@sistem/types';
import { fill, formatPlural, formatWeekSpan, sharedCopy, useCopy, useLanguage, weekConflictOf } from '@sistem/shared';
import './NewPlanWeekRow.css';

interface NewPlanWeekRowProps {
  entry: PlanWeekOption;
  /** "שבוע הבא", or in a multi-week range "שבוע 2" / "שבוע 1 · שבוע הבא". */
  label: string;
  isSelected: boolean;
  /** A later week the chosen multi-week plan covers: the same selected look. */
  isInRange: boolean;
  /** The week that stops the multi-week plan: a Cherry outline. */
  isBlocking: boolean;
  onSelect: () => void;
}

/** One week of step 1 (the dashboard's row, on the phone): when, and what is already there. */
export function NewPlanWeekRow({ entry, label, isSelected, isInRange, isBlocking, onSelect }: NewPlanWeekRowProps) {
  const language = useLanguage();
  const text = useCopy(sharedCopy).newPlanFlow;
  const { plan } = entry;
  const shown = plan && weekConflictOf(plan) !== 'free' ? plan : null;
  const classNames = ['new-plan-row', isInRange && 'new-plan-row-in-range', isBlocking && 'new-plan-row-blocking'].filter(Boolean).join(' ');

  return (
    <button
      className={classNames}
      type="button"
      role="radio"
      aria-checked={isSelected}
      aria-description={isBlocking ? text.blockingRow : undefined}
      onClick={onSelect}
    >
      <span className="new-plan-row-dot" aria-hidden="true" />
      <span className="new-plan-row-text">
        <span className="new-plan-row-label">{label}</span>
        <span className="new-plan-row-dates">{formatWeekSpan(entry.weekStartDate, language)}</span>
      </span>
      {shown?.status === 'published' && (
        <span className="new-plan-chip new-plan-chip-live">
          {text.publishedChip}
          <IconCheck size={14} stroke={2.6} aria-hidden="true" />
        </span>
      )}
      {shown?.status === 'draft' && (
        <span className="new-plan-chip new-plan-chip-draft">{fill(text.draftChip, { workouts: formatPlural(language, text.workouts, shown.workoutCount) })}</span>
      )}
    </button>
  );
}
