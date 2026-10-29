import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import type { FoodGroup, FoodItem, FoodItemPayload } from '@sistem/types';
import { FOOD_CATEGORIES, FOOD_GROUPS, fill, sharedCopy, useCopy } from '@sistem/shared';
import type { FoodCategory } from '@sistem/types';
import { SideSheet } from '../../../../components/common/SideSheet/SideSheet';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import { Select } from '../../../../components/common/Select/Select';
import { Switch } from '../../../../components/common/Switch/Switch';
import { useFoodForm } from '../../hooks/useFoodForm';
import { ContainsPicker } from '../ContainsPicker/ContainsPicker';
import { nutritionLibraryCopy } from '../../copy';
import './FoodSheet.css';

interface FoodSheetProps {
  isOpen: boolean;
  /** The item being edited; null = a new one. */
  item: FoodItem | null;
  /** A line above the form (e.g. a coach editing a food-bank item gets her own copy). */
  note?: string;
  /** A new item's group (the chosen group chip, else protein). */
  defaultGroup: FoodGroup;
  caps: Record<FoodGroup, number>;
  onClose: () => void;
  /** Resolves true when the server took it (the sheet then closes). */
  onSave: (payload: FoodItemPayload) => Promise<boolean>;
}

/**
 * Add or edit one food item in a side sheet (in 300 ms on the drawer curve, out in 200 ms; Esc and the
 * scrim close it; the focus stays inside and returns to what opened it). The kcal cap is checked
 * again by the server. Mount it with a new key for every opening — the form starts fresh.
 */
export function FoodSheet({ isOpen, item, note, defaultGroup, caps, onClose, onSave }: FoodSheetProps) {
  const shared = useCopy(sharedCopy);
  const copy = useCopy(nutritionLibraryCopy);
  const form = useFoodForm(item, defaultGroup, caps);
  const { values } = form;
  const [isBusy, setIsBusy] = useState(false);
  const formId = useId();
  const groupLabelId = useId();
  const containsLabelId = useId();
  const kcalHintId = useId();
  const categories = FOOD_CATEGORIES[values.group];

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.isComplete || isBusy) return;
    setIsBusy(true);
    const saved = await onSave(form.toPayload());
    setIsBusy(false);
    if (saved) onClose();
  }

  const footer = (
    <div className="food-sheet-footer">
      <PillButton variant="fill" onClick={onClose}>
        {copy.cancel}
      </PillButton>
      <PillButton
        className="food-sheet-submit"
        variant="primary"
        type="submit"
        form={formId}
        aria-disabled={!form.isComplete || isBusy}
      >
        {item ? copy.submitEdit : copy.submitNew}
      </PillButton>
    </div>
  );

  return (
    <SideSheet isOpen={isOpen} onClose={onClose} title={item ? copy.sheetEdit : copy.sheetNew} footer={footer} blurScrim>
      <form id={formId} className={`food-sheet food-group-${values.group}`} onSubmit={submit} noValidate>
        {note && <p className="food-sheet-note">{note}</p>}
        <p className="food-sheet-label" id={groupLabelId}>
          {copy.groupLabel}
        </p>
        <div className="food-sheet-groups" role="group" aria-labelledby={groupLabelId}>
          {FOOD_GROUPS.map((group) => (
            <button
              key={group}
              className={`food-sheet-group food-group-${group}`}
              type="button"
              aria-pressed={values.group === group}
              onClick={() => form.changeGroup(group)}
            >
              {shared.nutrition.groups[group]}
            </button>
          ))}
        </div>

        <div className="food-sheet-row">
          <label className="food-sheet-field">
            <span className="food-sheet-label">{copy.nameLabel}</span>
            <input
              className="food-sheet-input"
              dir="auto"
              value={values.name}
              maxLength={120}
              required
              data-autofocus
              onChange={(event) => form.setName(event.target.value)}
            />
          </label>
          {categories.length > 0 && (
            <label className="food-sheet-field">
              <span className="food-sheet-label">{copy.categoryLabel}</span>
              <Select
                className="food-sheet-select"
                value={values.category ?? ''}
                onChange={(event) => form.setCategory((event.target.value || null) as FoodCategory | null)}
              >
                <option value="">{copy.categoryNone}</option>
                {categories.map((id) => (
                  <option key={id} value={id}>
                    {shared.nutrition.categories[id]}
                  </option>
                ))}
              </Select>
            </label>
          )}
        </div>

        <label className="food-sheet-field">
          <span className="food-sheet-label">{copy.portionLabel}</span>
          <input
            className="food-sheet-input"
            dir="auto"
            value={values.portion}
            maxLength={120}
            required
            onChange={(event) => form.setPortion(event.target.value)}
          />
        </label>

        <div className="food-sheet-row">
          <label className="food-sheet-field">
            <span className="food-sheet-label">{copy.gramsLabel}</span>
            <span className="food-sheet-number">
              <input
                className="food-sheet-input"
                type="number"
                inputMode="decimal"
                dir="ltr"
                min={0}
                value={values.grams ?? ''}
                onChange={(event) => form.setGrams(readNumber(event.target.value))}
              />
              <span className="food-sheet-unit">{copy.grams}</span>
            </span>
          </label>
          <label className="food-sheet-field">
            <span className="food-sheet-label">{copy.kcalLabel}</span>
            <span className={form.isKcalOver ? 'food-sheet-number food-sheet-number-over' : 'food-sheet-number'}>
              <input
                className="food-sheet-input"
                type="number"
                inputMode="decimal"
                dir="ltr"
                min={0}
                disabled={form.isFree}
                aria-invalid={form.isKcalOver}
                aria-describedby={form.isKcalOver ? kcalHintId : undefined}
                value={values.kcal ?? ''}
                onChange={(event) => form.setKcal(readNumber(event.target.value))}
              />
              <span className="food-sheet-unit">{form.isFree ? copy.free : fill(copy.kcalOf, { cap: form.cap })}</span>
            </span>
          </label>
        </div>
        {form.isKcalOver && (
          <p className="food-sheet-warning" id={kcalHintId} role="status">
            {fill(copy.kcalOverHint, { cap: form.cap })}
          </p>
        )}

        <p className="food-sheet-label" id={containsLabelId}>
          {copy.containsLabel} <span className="food-sheet-hint">{copy.containsHint}</span>
        </p>
        <ContainsPicker value={values.dietTags} onToggle={form.toggleTag} labelledBy={containsLabelId} />

        <span className="food-sheet-new">
          <Switch label={copy.markNew} checked={values.isNew} onChange={form.setIsNew} />
        </span>
      </form>
    </SideSheet>
  );
}

function readNumber(raw: string): number | undefined {
  if (raw === '') return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}
