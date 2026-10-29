import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { FoodGroup, FoodItem } from '@sistem/types';
import { FOOD_GROUPS, searchByText, sharedCopy, useCopy } from '@sistem/shared';
import { Icon } from '../../../../components/common/Icon/Icon';
import { CategoryChips } from '../CategoryChips/CategoryChips';
import { matchesCategory } from '../../data/foodFilters';
import type { CategoryFilter } from '../../data/foodFilters';
import { GroupTabs } from '../GroupTabs/GroupTabs';
import { nutritionCopy } from '../../copy';
import './FoodPicker.css';

const RECENT_SHOWN = 8;

interface FoodPickerProps {
  foods: FoodItem[];
  /** Her recently used item ids per group (newest first). */
  recentFoodIds: Partial<Record<FoodGroup, string[]>>;
  /** The group it opens on (the one the option still needs). */
  initialGroup: FoodGroup;
  onPick: (food: FoodItem) => void;
}

/**
 * Adds a food line (13a+): opens on the group the option needs, group tabs to switch, category chips, a
 * typo-tolerant search inside the group / category, her recently used items on top. Keyboard: type to search,
 * ↑ / ↓ and Enter to add, Esc to close. Archived items never appear. Preference conflicts come back from the
 * server as warnings after the autosave.
 */
export function FoodPicker({ foods, recentFoodIds, initialGroup, onPick }: FoodPickerProps) {
  const shared = useCopy(sharedCopy);
  const copy = useCopy(nutritionCopy);
  const [isOpen, setIsOpen] = useState(false);
  const [group, setGroup] = useState<FoodGroup>(initialGroup);
  const [category, setCategory] = useState<CategoryFilter>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const activeFoods = useMemo(() => foods.filter((food) => !food.archivedAt), [foods]);
  const groups = FOOD_GROUPS.filter((candidate) => activeFoods.some((food) => food.group === candidate));
  const inGroup = useMemo(() => activeFoods.filter((food) => food.group === group), [activeFoods, group]);
  const results = useMemo(
    () => searchByText(inGroup.filter((food) => matchesCategory(food, category)), query, (food) => food.name),
    [inGroup, category, query],
  );
  const recent = useMemo(() => {
    const byId = new Map(inGroup.map((food) => [food.id, food]));
    return (recentFoodIds[group] ?? []).flatMap((id) => byId.get(id) ?? []).slice(0, RECENT_SHOWN);
  }, [inGroup, recentFoodIds, group]);

  function open() {
    setGroup(groups.includes(initialGroup) ? initialGroup : (groups[0] ?? initialGroup));
    setCategory(null);
    setQuery('');
    setActive(0);
    setIsOpen(true);
  }

  function pick(food: FoodItem) {
    onPick(food);
    setIsOpen(false);
  }

  useEffect(() => {
    if (isOpen) searchRef.current?.focus();
  }, [isOpen, group]);

  // A new filter starts at the top.
  useEffect(() => setActive(0), [group, category, query]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  // On the search box only: Enter on a chip or tab still presses that chip / tab.
  function handleSearchKeys(event: KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => Math.min(results.length - 1, index + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => Math.max(0, index - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (results[active]) pick(results[active]);
    }
  }

  function close() {
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  function handleEscape(event: KeyboardEvent) {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    close();
  }

  // A press outside closes it.
  useEffect(() => {
    if (!isOpen) return;
    function handlePointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener('pointerdown', handlePointer);
    return () => document.removeEventListener('pointerdown', handlePointer);
  }, [isOpen]);

  return (
    <div className="food-picker-anchor" ref={rootRef}>
      <button ref={triggerRef} className="food-picker-trigger" type="button" aria-expanded={isOpen} onClick={() => (isOpen ? setIsOpen(false) : open())}>
        {copy.builder.addFoodItem}
      </button>
      {isOpen && (
    <div className="food-picker" role="dialog" aria-label={copy.pickerTitle} onKeyDown={handleEscape}>
      <div className="food-picker-head">
        <GroupTabs groups={groups} value={group} onChange={(next) => { setGroup(next); setCategory(null); }} label={copy.pickerGroups} />
        <button className="food-picker-close" type="button" onClick={close} aria-label={copy.pickerClose}>
          <Icon name="close" size="sm" />
        </button>
      </div>
      <CategoryChips group={group} items={inGroup} value={category} onChange={setCategory} />
      <input
        ref={searchRef}
        className="food-picker-search"
        type="search"
        dir="auto"
        value={query}
        placeholder={copy.pickerSearch}
        aria-label={copy.pickerSearch}
        role="combobox"
        aria-expanded="true"
        aria-controls={listId}
        aria-activedescendant={results[active] ? `${listId}-${active}` : undefined}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={handleSearchKeys}
      />

      {recent.length > 0 && !query && category === null && (
        <div className="food-picker-recent" aria-label={copy.pickerRecent}>
          <span className="food-picker-label">{copy.pickerRecent}</span>
          {recent.map((food) => (
            <button key={food.id} type="button" className="food-picker-recent-item" dir="auto" onClick={() => pick(food)}>
              <bdi>{food.name}</bdi>
            </button>
          ))}
        </div>
      )}

      <ul ref={listRef} id={listId} className="food-picker-results" role="listbox" aria-label={copy.pickerResults}>
        {results.length === 0 && <li className="food-picker-empty">{activeFoods.length === 0 ? copy.pickerNoFoods : copy.pickerEmpty}</li>}
        {results.map((food, index) => (
          <li
            key={food.id}
            id={`${listId}-${index}`}
            data-index={index}
            role="option"
            aria-selected={index === active}
            className={'food-picker-result' + (index === active ? ' food-picker-result-active' : '')}
            onMouseEnter={() => setActive(index)}
            onClick={() => pick(food)}
          >
            <span className="food-picker-dot" data-group={food.group} aria-hidden="true" />
            <span className="food-picker-name" dir="auto">
              <bdi>{food.name}</bdi>
            </span>
            <span className="food-picker-portion" dir="auto">
              <bdi>{food.portion}</bdi>
            </span>
            {category === null && food.category && <span className="food-picker-category">{shared.nutrition.categories[food.category]}</span>}
          </li>
        ))}
      </ul>
      <p className="food-picker-hint">{copy.pickerHint}</p>
    </div>
      )}
    </div>
  );
}
