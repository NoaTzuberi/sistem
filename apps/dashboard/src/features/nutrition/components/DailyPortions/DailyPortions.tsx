import type { FoodGroup, FoodItem, PortionCounts, PortionGroup } from '@sistem/types';
import { fill, formatKcal, formatPortionCountLtr, PORTION_GROUPS, sharedCopy, useCopy, useLanguage } from '@sistem/shared';
import { Icon } from '../../../../components/common/Icon/Icon';
import { nutritionCopy } from '../../copy';
import { AppPreview } from '../AppPreview/AppPreview';
import { ProteinTarget } from '../ProteinTarget/ProteinTarget';
import { VegToggle } from '../VegToggle/VegToggle';
import './DailyPortions.css';

const STEP = 0.5;
/** = the server's MAX_DAILY_PORTIONS (one group over a day). */
const MAX = 30;

interface DailyPortionsProps {
  portions: PortionCounts;
  /** The day's recommended portions for the target (null while there is none). */
  recommended: PortionCounts | null;
  groupKcal: Record<FoodGroup, number>;
  vegetablesFree: boolean;
  foods: FoodItem[];
  onChange: (group: PortionGroup, value: number) => void;
  onVegetablesChange: (value: boolean) => void;
  /** The coach's daily protein goal in grams; null = none. */
  proteinGramsTarget: number | null;
  onProteinChange: (value: number | null) => void;
}

/**
 * Portions mode (owner, 2026-10-20): her portions per group per day, in ½ steps, each tile with its kcal and
 * the recommendation one press away; vegetables free; and what she will see in the app.
 */
export function DailyPortions({ portions, recommended, groupKcal, vegetablesFree, foods, onChange, onVegetablesChange, proteinGramsTarget, onProteinChange }: DailyPortionsProps) {
  const language = useLanguage();
  const shared = useCopy(sharedCopy);
  const copy = useCopy(nutritionCopy);
  const b = copy.builder;

  return (
    <div className="nm-daily">
      <h3 className="nm-daily-title">{b.dailyTitle}</h3>
      <div className="nm-daily-tiles">
        {PORTION_GROUPS.map((group) => {
          const value = portions[group];
          const label = shared.nutrition.groups[group];
          const target = recommended?.[group];
          return (
            <div key={group} className="nm-tile" data-group={group} role="group" aria-label={label}>
              <span className="nm-tile-label">{label}</span>
              <div className="nm-tile-row">
                <button
                  type="button"
                  className="nm-tile-step"
                  disabled={value <= 0}
                  aria-label={fill(b.removeLess, { group: label })}
                  onClick={() => onChange(group, Math.max(0, value - STEP))}
                >
                  <Icon name="minus" size="sm" />
                </button>
                <b className="nm-tile-value" aria-live="polite">
                  {formatPortionCountLtr(value)}
                </b>
                <button
                  type="button"
                  className="nm-tile-step"
                  disabled={value >= MAX}
                  aria-label={fill(b.addMore, { group: label })}
                  onClick={() => onChange(group, Math.min(MAX, value + STEP))}
                >
                  <Icon name="plus" size="sm" />
                </button>
              </div>
              <small className="nm-tile-kcal">{fill(b.dailyKcal, { kcal: formatKcal(value * groupKcal[group], language) })}</small>
              {target !== undefined &&
                (target === value ? (
                  <span className="nm-tile-chip">{b.byTarget}</span>
                ) : (
                  <button type="button" className="nm-tile-chip nm-tile-reset" onClick={() => onChange(group, target)}>
                    {fill(b.recommendedReset, { count: formatPortionCountLtr(target) })}
                  </button>
                ))}
            </div>
          );
        })}
      </div>

      <ProteinTarget value={proteinGramsTarget} onChange={onProteinChange} />

      <div className="nm-daily-veg">
        <VegToggle label={b.vegAllMeals} checked={vegetablesFree} onChange={onVegetablesChange} />
      </div>

      <AppPreview portions={portions} foods={foods} />
    </div>
  );
}
