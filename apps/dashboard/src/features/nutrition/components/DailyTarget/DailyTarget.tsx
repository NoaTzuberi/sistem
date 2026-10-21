import type { CalorieSuggestion, PortionCounts } from '@sistem/types';
import { fill, formatKcal, formatNumber, formatPortionCountLtr, isolateLtr, sharedCopy, useCopy, useLanguage } from '@sistem/shared';
import { Icon } from '../../../../components/common/Icon/Icon';
import { Switch } from '../../../../components/common/Switch/Switch';
import { nutritionCopy } from '../../copy';
import type { NutritionDraft } from '../../nutritionDraft';
import './DailyTarget.css';

const STEP_KCAL = 50;
const GROUPS = ['protein', 'carb', 'fat'] as const;

interface DailyTargetProps {
  target: NutritionDraft['target'];
  suggestion: CalorieSuggestion | null;
  floorKcal: number;
  /** The day's recommended portions for the target, and what they add up to (null while unknown). */
  portions: PortionCounts | null;
  portionsKcal: number | null;
  onChange: (patch: Partial<NutritionDraft['target']>) => void;
}

/** The kcal she gets each day: typed or stepped by 50, the suggestion one press away, and the day's portions. */
export function DailyTarget({ target, suggestion, floorKcal, portions, portionsKcal, onChange }: DailyTargetProps) {
  const language = useLanguage();
  const shared = useCopy(sharedCopy);
  const copy = useCopy(nutritionCopy);
  const b = copy.builder;
  const suggested = suggestion?.kcal ?? null;
  const kcal = target.kcal;
  const belowFloor = kcal !== undefined && kcal < floorKcal;
  const useSuggestion = () => suggested !== null && onChange({ kcal: suggested, source: 'suggested', confirmBelowFloor: false });
  const setKcal = (next: number | undefined) => onChange({ kcal: next, source: next === undefined ? null : 'override', confirmBelowFloor: false });
  const diff = kcal !== undefined && suggested !== null ? kcal - suggested : 0;

  return (
    <div className="nb-target">
      <div className="nb-target-input">
        <label className="nb-target-label" htmlFor="nb-target-kcal">
          {b.dailyTarget}
        </label>
        <div className="nb-target-row">
          <button className="nb-target-step" type="button" aria-label={b.lessKcal} disabled={kcal === undefined} onClick={() => kcal !== undefined && setKcal(Math.max(0, kcal - STEP_KCAL))}>
            <Icon name="minus" size="sm" />
          </button>
          <input
            className="nb-target-number"
            id="nb-target-kcal"
            type="number"
            inputMode="numeric"
            step={10}
            value={kcal ?? ''}
            onChange={(event) => setKcal(event.target.value === '' ? undefined : Number(event.target.value))}
          />
          <button className="nb-target-step" type="button" aria-label={b.moreKcal} onClick={() => setKcal((kcal ?? suggested ?? floorKcal) + (kcal === undefined ? 0 : STEP_KCAL))}>
            <Icon name="plus" size="sm" />
          </button>
        </div>
        <span className="nb-target-unit">{shared.units.kcal}</span>
      </div>

      <div className="nb-target-side">
        {suggested !== null && kcal === undefined && (
          <button className="nb-target-use" type="button" onClick={useSuggestion}>
            {fill(b.useSuggestion, { kcal: formatNumber(suggested, language) })}
          </button>
        )}
        {suggested !== null && kcal !== undefined && diff !== 0 && (
          <p className="nb-target-note">
            <b className="nb-target-diff">{fill(b.fromSuggestion, { diff: isolateLtr(`${diff > 0 ? '+' : '−'}${formatNumber(Math.abs(diff), language)}`) })}</b>
            <button className="nb-text-button" type="button" onClick={useSuggestion}>
              {fill(b.backToSuggestion, { kcal: formatNumber(suggested, language) })}
            </button>
          </p>
        )}
        {suggested !== null && kcal !== undefined && diff === 0 && <p className="nb-target-note">{copy.usingSuggestion}</p>}

        {portions && (
          <div className="nb-target-portions">
            {GROUPS.map((group) => (
              <span key={group} className="nb-portion-chip" data-group={group}>
                <b>{formatPortionCountLtr(portions[group])}</b>
                {shared.nutrition.portionWords[group]}
              </span>
            ))}
            {portionsKcal !== null && (
              <small className="nb-target-portions-note">
                {fill(b.portionsApprox, { kcal: formatKcal(portionsKcal, language) })} · {copy.portionsPlaceholderNote}
              </small>
            )}
          </div>
        )}

        {belowFloor && (
          <div className="nb-target-floor" role="alert">
            <p>{fill(copy.belowFloor, { floor: formatNumber(floorKcal, language) })}</p>
            <Switch
              className="nb-target-confirm"
              label={copy.confirmBelowFloor}
              checked={target.confirmBelowFloor}
              onChange={(confirmBelowFloor) => onChange({ confirmBelowFloor })}
            />
          </div>
        )}
      </div>
    </div>
  );
}
