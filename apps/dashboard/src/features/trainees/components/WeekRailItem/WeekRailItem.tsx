import { fill, formatNumber, formatWeekSpan, isolateLtr, sharedCopy, useCopy, useLanguage } from '@sistem/shared';
import { Icon } from '../../../../components/common/Icon/Icon';
import { workoutColorClass } from '../../../planBuilder/data/workoutColors';
import { weekColorClass } from '../../../planBuilder/data/blockWeeks';
import { traineesCopy } from '../../copy';
import type { ProgramWeek } from '../../hooks/useTraineeWeeks';
import './WeekRailItem.css';

interface WeekRailItemProps {
  week: ProgramWeek;
  isSelected: boolean;
  onSelect: () => void;
}

/** One week in the rail: its number and dates, a mini bar per workout (done / planned / skipped), and its state. */
export function WeekRailItem({ week, isSelected, onSelect }: WeekRailItemProps) {
  const language = useLanguage();
  const shared = useCopy(sharedCopy);
  const copy = useCopy(traineesCopy);
  const w = copy.weeks;
  const kind = week.status === 'empty' ? 'empty' : week.status === 'draft' ? 'draft' : week.time;

  let label;
  if (week.status === 'empty') {
    label = (
      <span className="pw-rail-state pw-rail-state-empty">
        {w.empty}
        <span className="pw-rail-plus" aria-hidden="true">
          <Icon name="plus" size="sm" />
        </span>
      </span>
    );
  } else if (week.status === 'draft') {
    label = <span className="pw-rail-state pw-rail-state-draft">{shared.coach.planStatus.draft}</span>;
  } else if (week.time === 'current') {
    label = <span className="pw-rail-state pw-rail-state-now">{copy.thisWeek}</span>;
  } else if (week.time === 'past') {
    label = (
      <span className="pw-rail-state">
        {week.completion === null ? '—' : isolateLtr(formatNumber(week.completion, language, { style: 'percent', maximumFractionDigits: 0 }))}
      </span>
    );
  } else {
    label = <span className="pw-rail-state">{shared.coach.planStatus.published}</span>;
  }

  return (
    <button
      className="pw-rail-item"
      type="button"
      role="tab"
      data-selects=""
      data-kind={kind}
      aria-selected={isSelected}
      tabIndex={isSelected ? 0 : -1}
      onClick={onSelect}
    >
      <span className="pw-rail-top">
        <b className="pw-rail-week">{fill(w.week, { number: week.number })}</b>
        {label}
      </span>
      <span className="pw-rail-dates">
        <bdi>{formatWeekSpan(week.weekStartDate, language)}</bdi>
      </span>
      {/* A week of a multi-week plan: "שבוע 2/4" in that week's color (the block reads as one run). */}
      {week.plan?.block && (
        <span className={`pw-rail-block ${weekColorClass(week.plan.block.week)}`}>
          {fill(copy.length.weekOf, { n: week.plan.block.week, total: week.plan.block.lengthWeeks })}
        </span>
      )}
      <span className="pw-rail-bars" aria-hidden="true">
        {week.plan?.workouts.map((workout, index) => (
          <span key={workout.id} className={`pw-rail-bar ${workoutColorClass(index)}`} data-state={week.progress?.statuses[workout.id] ?? 'planned'} />
        ))}
      </span>
    </button>
  );
}
