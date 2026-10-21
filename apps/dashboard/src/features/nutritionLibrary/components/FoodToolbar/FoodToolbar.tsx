import { useCopy } from '@sistem/shared';
import { Icon } from '../../../../components/common/Icon/Icon';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import { Switch } from '../../../../components/common/Switch/Switch';
import { nutritionLibraryCopy } from '../../copy';
import './FoodToolbar.css';

interface FoodToolbarProps {
  query: string;
  onQueryChange: (query: string) => void;
  showArchived: boolean;
  onShowArchivedChange: (show: boolean) => void;
  onAdd: () => void;
}

/** Search (name / category), the archive switch, and "+ Food item" (opens the sheet). */
export function FoodToolbar({ query, onQueryChange, showArchived, onShowArchivedChange, onAdd }: FoodToolbarProps) {
  const copy = useCopy(nutritionLibraryCopy);
  return (
    <div className="food-toolbar">
      <label className="food-toolbar-search">
        <Icon name="search" size="sm" />
        <span className="visually-hidden">{copy.searchLabel}</span>
        <input
          className="food-toolbar-input"
          type="search"
          data-search-shortcut
          aria-keyshortcuts="/"
          dir="auto"
          value={query}
          placeholder={copy.searchPlaceholder}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>
      <span className="food-toolbar-archive">
        <Switch label={copy.showArchived} checked={showArchived} onChange={onShowArchivedChange} />
      </span>
      <PillButton variant="primary" onClick={onAdd}>
        <Icon name="plus" size="sm" />
        {copy.addFood}
      </PillButton>
    </div>
  );
}
