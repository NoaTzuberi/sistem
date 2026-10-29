import { useState } from 'react';
import type { FoodItem, FoodItemPayload } from '@sistem/types';
import { fill, useCopy } from '@sistem/shared';
import { StateLine } from '../../../../components/common/StateLine/StateLine';
import type { UndoOffer } from '../../../../hooks/useUndoToast';
import { CategoryChips } from '../../../nutrition/components/CategoryChips/CategoryChips';
import type { useFoods } from '../../hooks/useFoods';
import { GroupChips } from '../GroupChips/GroupChips';
import { SourceChips } from '../SourceChips/SourceChips';
import { FoodToolbar } from '../FoodToolbar/FoodToolbar';
import { FoodGroupSection } from '../FoodGroupSection/FoodGroupSection';
import { FoodSheet } from '../FoodSheet/FoodSheet';
import { nutritionLibraryCopy } from '../../copy';
import './FoodBankPanel.css';

interface FoodBankPanelProps {
  foods: ReturnType<typeof useFoods>;
  onToast: (message: string) => void;
  offerUndo: (offer: UndoOffer) => void;
}

/**
 * A food list with its filters, cards and edit sheet — the coach's library (the food bank merged with her
 * own items: source chips, hide, restore to original) and the admin's system bank (no source chips).
 */
export function FoodBankPanel({ foods, onToast, offerUndo }: FoodBankPanelProps) {
  const copy = useCopy(nutritionLibraryCopy);
  const [sheet, setSheet] = useState<{ isOpen: boolean; subject: FoodItem | null; key: number }>({ isOpen: false, subject: null, key: 0 });
  const isCoachLibrary = foods.setHiddenInLists !== undefined;

  const openSheet = (item: FoodItem | null) => setSheet((current) => ({ isOpen: true, subject: item, key: current.key + 1 }));
  const closeSheet = () => setSheet((current) => ({ ...current, isOpen: false }));

  async function save(payload: FoodItemPayload): Promise<boolean> {
    const result = await foods.save(sheet.subject, payload);
    onToast(result.message);
    return result.ok;
  }

  // No confirm: the card goes at once, "Undo" brings it back; the server call waits for the undo window.
  function remove(item: FoodItem) {
    foods.hide(item.id);
    offerUndo({
      message: fill(copy.removing, { name: item.name }),
      onUndo: () => foods.show(item.id),
      onCommit: () => void foods.remove(item).then((result) => onToast(result.message)),
    });
  }

  const run = (action: Promise<{ message: string }>) => void action.then((result) => onToast(result.message));
  const setHidden = foods.setHiddenInLists && ((item: FoodItem, hidden: boolean) => run(foods.setHiddenInLists!(item, hidden)));

  if (!foods.isReady) return <StateLine error={foods.error} onRetry={foods.reload} retryLabel={copy.foodsRetry} />;

  const editsSystemItem = isCoachLibrary && sheet.subject?.source === 'system';
  return (
    <>
      <div className="food-library-filters">
        {isCoachLibrary && <SourceChips value={foods.filter.source} counts={foods.sourceCounts} onChange={foods.setSourceFilter} />}
        <GroupChips value={foods.filter.group} counts={foods.counts} onChange={foods.setGroup} />
        {foods.filter.group && (
          <CategoryChips group={foods.filter.group} items={foods.groupItems} value={foods.filter.category} onChange={foods.setCategory} />
        )}
        <FoodToolbar
          query={foods.filter.query}
          onQueryChange={foods.setQuery}
          showArchived={foods.filter.showArchived}
          onShowArchivedChange={foods.setShowArchived}
          onAdd={() => openSheet(null)}
        />
      </div>
      {foods.isEmpty ? (
        <div className="food-library-empty" role="status">
          <strong className="food-library-empty-title">{copy.foodsEmpty}</strong>
        </div>
      ) : foods.sections.length === 0 ? (
        <div className="food-library-empty" role="status">
          {foods.filter.source === 'hidden' && !foods.filter.query.trim() ? (
            <strong className="food-library-empty-title">{copy.noHidden}</strong>
          ) : (
            <>
              <strong className="food-library-empty-title">{copy.noResultsTitle}</strong>
              <span className="food-library-empty-text">{copy.noResultsText}</span>
            </>
          )}
        </div>
      ) : (
        foods.sections.map((section) => (
          <FoodGroupSection
            key={section.group}
            section={section}
            onEdit={openSheet}
            onRemove={remove}
            onRestore={(item) => run(foods.restore(item))}
            onSetHidden={setHidden}
            onRevert={isCoachLibrary ? (item) => run(foods.revert(item)) : undefined}
          />
        ))
      )}
      {foods.caps && (
        <FoodSheet
          key={sheet.key}
          isOpen={sheet.isOpen}
          item={sheet.subject}
          note={editsSystemItem ? copy.systemEditNote : undefined}
          defaultGroup={foods.filter.group ?? 'protein'}
          caps={foods.caps}
          onClose={closeSheet}
          onSave={save}
        />
      )}
    </>
  );
}
