import { useCopy } from '@sistem/shared';
import { GroupFilterChip } from '../../../nutrition/components/GroupFilterChip/GroupFilterChip';
import { SOURCE_FILTERS } from '../../data/foodLibrary';
import type { SourceFilter } from '../../data/foodLibrary';
import { nutritionLibraryCopy } from '../../copy';
import './SourceChips.css';

interface SourceChipsProps {
  value: SourceFilter;
  counts: Record<SourceFilter, number>;
  onChange: (source: SourceFilter) => void;
}

/** "All / Mine / Hidden" — the coach library's food-bank filter (soft chips, ink when chosen). */
export function SourceChips({ value, counts, onChange }: SourceChipsProps) {
  const copy = useCopy(nutritionLibraryCopy);
  const labels: Record<SourceFilter, string> = { all: copy.sourceAll, mine: copy.sourceMine, hidden: copy.sourceHidden };
  return (
    <div className="source-chips" role="group" aria-label={copy.sourcesLabel}>
      {SOURCE_FILTERS.map((source) => (
        <GroupFilterChip key={source} group={null} isSelected={value === source} onClick={() => onChange(source)}>
          {labels[source]}
          <span className="source-chip-count">{counts[source]}</span>
        </GroupFilterChip>
      ))}
    </div>
  );
}
