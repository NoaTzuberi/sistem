import { useCopy } from '@sistem/shared';
import type { HistoryFilter } from '../../data/historyDisplay';
import { workoutCopy } from '../../copy';
import './HistoryFilters.css';

interface HistoryFiltersProps {
  filters: HistoryFilter[];
  selected: HistoryFilter;
  onSelect: (filter: HistoryFilter) => void;
}

/** One-choice chips over the log: all / from the plan / free / with a PR. */
export function HistoryFilters({ filters, selected, onSelect }: HistoryFiltersProps) {
  const copy = useCopy(workoutCopy);
  const labels: Record<HistoryFilter, string> = {
    all: copy.history.filterAll,
    plan: copy.history.filterPlan,
    free: copy.history.filterFree,
    pr: copy.history.filterPr,
  };
  return (
    <div className="history-filters" role="group" aria-label={copy.history.filtersLabel}>
      {filters.map((filter) => (
        <button
          key={filter}
          type="button"
          className="history-filters-chip"
          aria-pressed={filter === selected}
          onClick={() => onSelect(filter)}
        >
          {labels[filter]}
        </button>
      ))}
    </div>
  );
}
