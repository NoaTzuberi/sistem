import type { PlanWeekOption } from '@sistem/types';
import { fill, formatPlural, formatWeekSpan, sharedCopy, useCopy, useLanguage } from '@sistem/shared';
import { ActionMenu } from '../../../../components/common/ActionMenu/ActionMenu';
import { weekTileLabel } from '../../data/planWeeks';
import { canDeleteDraft } from '../../data/newPlanConflicts';
import { traineesCopy } from '../../copy';
import './NewPlanWeekCard.css';

interface NewPlanWeekCardProps {
  entry: PlanWeekOption;
  currentWeekStart: string;
  isSelected: boolean;
  /** A week the chosen multi-week plan covers: a light outline. */
  isInRange: boolean;
  onSelect: () => void;
  /** "מחיקת הטיוטה" — offered only on a standalone draft. */
  onDeleteDraft: (planId: string) => void;
}

/**
 * One week of the "new plan" popover: when, and what is already there ("טיוטה · 3 אימונים" /
 * "טיוטה ריקה"), so she knows before she decides. A draft gets a small ⋯ with "מחיקת הטיוטה";
 * the ⋯ sits beside the radio (a button never holds another button).
 */
export function NewPlanWeekCard({ entry, currentWeekStart, isSelected, isInRange, onSelect, onDeleteDraft }: NewPlanWeekCardProps) {
  const language = useLanguage();
  const shared = useCopy(sharedCopy);
  const copy = useCopy(traineesCopy);
  const { plan } = entry;
  const range = formatWeekSpan(entry.weekStartDate, language);
  const status = !plan
    ? copy.weekFree
    : plan.status === 'published'
      ? shared.coach.planStatus.published
      : plan.isEmpty
        ? copy.weekCard.draftEmpty
        : formatPlural(language, copy.weekCard.draftWorkouts, plan.workoutCount);
  const canDelete = canDeleteDraft(plan);

  return (
    <div className={`new-plan-week${isInRange ? ' new-plan-week-in-range' : ''}${canDelete ? ' new-plan-week-has-menu' : ''}`}>
      <button
        className="week-tile"
        type="button"
        role="radio"
        aria-checked={isSelected}
        aria-description={isInRange && !isSelected ? copy.weekCard.inRange : undefined}
        tabIndex={isSelected ? 0 : -1}
        onClick={onSelect}
      >
        <span className="week-tile-label">{weekTileLabel(entry, currentWeekStart, language)}</span>
        <span className="week-tile-dates">{range}</span>
        <span className={`week-tile-status week-tile-status-${plan?.status ?? 'free'}`}>{status}</span>
      </button>
      {canDelete && (
        <div className="new-plan-week-menu">
          <ActionMenu
            variant="ghost"
            label={fill(copy.weekCard.menu, { range })}
            items={[{ id: 'delete', label: copy.deleteDraft.action, danger: true, onSelect: () => onDeleteDraft(plan.id) }]}
          />
        </div>
      )}
    </div>
  );
}
