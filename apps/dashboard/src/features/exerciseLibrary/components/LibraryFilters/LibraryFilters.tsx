import type { PatternId } from '@sistem/types';
import { useCopy } from '@sistem/shared';
import { Icon } from '../../../../components/common/Icon/Icon';
import type { ReviewStatus } from '../../data/familyReview';
import { exerciseLibraryCopy } from '../../copy';
import { PatternChips } from '../PatternChips/PatternChips';
import { StatusSegmented } from '../StatusSegmented/StatusSegmented';
import './LibraryFilters.css';

interface LibraryFiltersProps {
  search: string;
  onSearch: (text: string) => void;
  status: ReviewStatus;
  statusCounts: Partial<Record<ReviewStatus, number>>;
  onStatus: (status: ReviewStatus) => void;
  pattern: PatternId | '';
  onPattern: (pattern: PatternId | '') => void;
  /** A search or a pattern narrows the list: "clear filters" is offered. */
  hasNarrowing: boolean;
  onClear: () => void;
}

/** Search, the review status and the movement pattern, on a translucent panel. */
export function LibraryFilters({ search, onSearch, status, statusCounts, onStatus, pattern, onPattern, hasNarrowing, onClear }: LibraryFiltersProps) {
  const copy = useCopy(exerciseLibraryCopy);
  return (
    <div className="exlib-filters">
      <label className="exlib-filters-search">
        <Icon name="search" size="sm" />
        <input
          className="exlib-filters-input"
          type="search"
          data-search-shortcut
          aria-keyshortcuts="/"
          dir="auto"
          placeholder={copy.search}
          aria-label={copy.search}
          value={search}
          onChange={(event) => onSearch(event.target.value)}
        />
      </label>
      <StatusSegmented value={status} counts={statusCounts} onChange={onStatus} />
      <PatternChips value={pattern} onChange={onPattern} />
      {hasNarrowing && (
        <button className="exlib-filters-clear" type="button" onClick={onClear}>
          {copy.clearFilters}
        </button>
      )}
    </div>
  );
}
