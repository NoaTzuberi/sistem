import type { FoodGroup, FoodItem, NutritionIssue } from '@sistem/types';
import { sharedCopy, useCopy, useI18n } from '@sistem/shared';
import { Icon } from '../../../../components/common/Icon/Icon';
import { nutritionCopy } from '../../copy';
import { insertAt, useBuilderUndo } from '../../hooks/useBuilderUndo';
import { neededGroup, newFoodLine, newTextLine } from '../../nutritionDraft';
import type { DraftLine, DraftMeal, DraftOption } from '../../nutritionDraft';
import { FoodPicker } from '../FoodPicker/FoodPicker';
import { IssueList } from '../IssueList/IssueList';
import { PortionStepper } from '../PortionStepper/PortionStepper';
import './OptionPanel.css';

const TEXT_GROUPS: (FoodGroup | '')[] = ['', 'vegetable', 'protein', 'carb', 'fat', 'snack'];

/** "Eggs (whole egg, cooked)" → the name in bold and the coach's note after it, muted. */
function splitName(name: string): { main: string; note: string | null } {
  const at = name.indexOf(' (');
  return at > 0 ? { main: name.slice(0, at), note: name.slice(at + 1) } : { main: name, note: null };
}

interface OptionPanelProps {
  meal: DraftMeal;
  option: DraftOption;
  canMoveUp: boolean;
  foods: FoodItem[];
  recentFoodIds: Partial<Record<FoodGroup, string[]>>;
  foodsById: Map<string, FoodItem>;
  issues: NutritionIssue[];
  onChange: (option: DraftOption) => void;
  onMoveUp: () => void;
  onRemove: () => void;
  /** "Duplicate option": a copy of this one as a new option. */
  onDuplicate: () => void;
}

/** The open option of a meal: what she eats — food items with their portions, free vegetables, text lines — and what to add. */
export function OptionPanel({ meal, option, canMoveUp, foods, recentFoodIds, foodsById, issues, onChange, onMoveUp, onRemove, onDuplicate }: OptionPanelProps) {
  const shared = useCopy(sharedCopy);
  const copy = useCopy(nutritionCopy);
  const { plural } = useI18n();
  const b = copy.builder;
  const setLine = (index: number, line: DraftLine) => onChange({ ...option, lines: option.lines.map((current, i) => (i === index ? line : current)) });
  const undo = useBuilderUndo();
  // A row goes at once; "Undo" puts it back in this option (found by key — the meal may have changed since).
  const removeLine = (index: number) => {
    const removed = option.lines[index];
    onChange({ ...option, lines: option.lines.filter((_, i) => i !== index) });
    if (!removed || !undo) return;
    undo.offer(b.lineRemoved, meal.key, (current) => ({
      ...current,
      options: current.options.map((candidate) =>
        candidate.key === option.key ? { ...candidate, lines: insertAt(candidate.lines, index, removed) } : candidate,
      ),
    }));
  };

  return (
    <div className="nb-option">
      <div className="nb-option-head">
        <input className="nb-inline-input nb-option-label" dir="auto" value={option.label} aria-label={copy.optionLabel} onChange={(event) => onChange({ ...option, label: event.target.value })} />
        <span className="nb-option-suffix">{b.optionFoods}</span>
        <span className="nb-option-count">{plural(b.itemCount, option.lines.length)}</span>
        <button className="nb-tool" type="button" onClick={onDuplicate} aria-label={b.duplicateOption} title={b.duplicateOption}>
          <Icon name="copy" size="sm" />
        </button>
        <button className="nb-tool" type="button" onClick={onMoveUp} disabled={!canMoveUp} aria-label={copy.moveUp}>
          <Icon name="arrowUp" size="sm" />
        </button>
        <button className="nb-tool nb-tool-delete" type="button" onClick={onRemove} aria-label={copy.removeOption}>
          <Icon name="trash" size="sm" />
        </button>
      </div>

      <ul className="nb-items">
        {option.lines.map((line, index) => {
          const food = line.foodItemId ? foodsById.get(line.foodItemId) : undefined;
          const counted = line.group !== null && line.group !== 'vegetable';
          const remove = (
            <button className="nb-item-remove" type="button" aria-label={copy.removeLine} onClick={() => removeLine(index)}>
              <Icon name="close" size="sm" />
            </button>
          );
          if (line.kind === 'text') {
            return (
              <li key={line.key} className="nb-item nb-item-text">
                <span className="nb-item-text-icon" aria-hidden="true">
                  <Icon name="list" size="sm" />
                </span>
                <div className="nb-item-main">
                  <input className="nb-inline-input" dir="auto" value={line.text} placeholder={copy.lineText} aria-label={copy.lineText} onChange={(event) => setLine(index, { ...line, text: event.target.value })} />
                  <select
                    className="nb-item-select"
                    aria-label={copy.lineGroup}
                    value={line.group ?? ''}
                    onChange={(event) => {
                      const group = (event.target.value || null) as FoodGroup | null;
                      const nowCounted = group !== null && group !== 'vegetable';
                      setLine(index, { ...line, group, portions: nowCounted ? (line.portions ?? 1) : null });
                    }}
                  >
                    {TEXT_GROUPS.map((group) => (
                      <option key={group} value={group}>
                        {group ? shared.nutrition.groups[group] : copy.lineGroupNone}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="nb-item-controls">
                  {counted && <PortionStepper label={copy.portions} value={line.portions ?? 1} min={0.5} onChange={(portions) => setLine(index, { ...line, portions })} />}
                  {remove}
                </div>
              </li>
            );
          }
          const name = food ? splitName(food.name) : null;
          return (
            <li key={line.key} className="nb-item">
              <span className="nb-item-tag" data-group={food?.group ?? line.group ?? undefined}>
                {food ? shared.nutrition.groups[food.group] : line.kind === 'recipe' ? copy.recipe : '—'}
              </span>
              <div className="nb-item-main">
                <span className="nb-item-name" dir="auto">
                  <b>{name?.main ?? (line.kind === 'recipe' ? copy.recipe : '—')}</b>
                  {name?.note && <span className="nb-item-note"> {name.note}</span>}
                </span>
                {food && (
                  <span className="nb-item-amount" dir="auto">
                    <bdi>{food.portion}</bdi>
                    {food.archivedAt && <span className="nb-item-archived"> · {copy.archived}</span>}
                  </span>
                )}
              </div>
              <div className="nb-item-controls">
                <PortionStepper label={copy.portions} value={line.portions ?? 1} min={0.5} onChange={(portions) => setLine(index, { ...line, portions })} />
                {remove}
              </div>
            </li>
          );
        })}
        {meal.vegetablesFree && (
          <li className="nb-item nb-item-vegetables">
            <span className="nb-item-tag" data-group="vegetable">
              {b.vegetablesTag}
            </span>
            <span className="nb-item-name">{b.vegetablesLine}</span>
          </li>
        )}
      </ul>

      <div className="nb-option-add">
        <FoodPicker foods={foods} recentFoodIds={recentFoodIds} initialGroup={neededGroup(meal, option)} onPick={(food) => onChange({ ...option, lines: [...option.lines, newFoodLine(food.id, food.group)] })} />
        <button className="nb-pill-button" type="button" onClick={() => onChange({ ...option, lines: [...option.lines, newTextLine()] })}>
          {copy.addText}
        </button>
      </div>
      <IssueList issues={issues} />
    </div>
  );
}
