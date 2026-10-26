import { useCopy } from '@sistem/shared';
import { coachCopy } from '../../copy';
import { COACH_LIST_FILTERS, type CoachListFilter } from '../../data/coachMode';
import './FilterChips.css';

interface FilterChipsProps {
  selected: CoachListFilter;
  counts: Record<CoachListFilter, number>;
  onSelect: (filter: CoachListFilter) => void;
}

/** הכול / מחכות / פעילות / תשומת לב, each with its count. */
export function FilterChips({ selected, counts, onSelect }: FilterChipsProps) {
  const copy = useCopy(coachCopy).list;
  return (
    <div className="filter-chips" role="group" aria-label={copy.filterLabel}>
      {COACH_LIST_FILTERS.map((id) => (
        <button key={id} type="button" className="filter-chip" aria-pressed={selected === id} onClick={() => onSelect(id)}>
          {copy.filters[id]}
          <span className="filter-chip-count">{counts[id]}</span>
        </button>
      ))}
    </div>
  );
}
