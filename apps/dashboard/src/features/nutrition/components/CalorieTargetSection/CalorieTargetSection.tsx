import { useState } from 'react';
import type { CalorieSuggestion, NutritionGoal, PortionCounts } from '@sistem/types';
import { fill, sharedCopy, useCopy } from '@sistem/shared';
import { nutritionCopy } from '../../copy';
import { sectionId } from '../../data/scrollToSection';
import { NO_OVERRIDES } from '../../nutritionDraft';
import type { NutritionDraft } from '../../nutritionDraft';
import { CalcEquation } from '../CalcEquation/CalcEquation';
import { DailyTarget } from '../DailyTarget/DailyTarget';
import { StepNumber } from '../StepNumber/StepNumber';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import { GoalSegmented } from '../GoalSegmented/GoalSegmented';
import { HerDataFields } from '../HerDataFields/HerDataFields';
import './CalorieTargetSection.css';

interface CalorieTargetSectionProps {
  target: NutritionDraft['target'];
  onChange: (patch: Partial<NutritionDraft['target']>) => void;
  suggestion: CalorieSuggestion | null;
  requestError: string | null;
  floorKcal: number;
  goalAdjustments: Record<NutritionGoal, number>;
  /** The day's recommended portions for the target, and their kcal (null while unknown). */
  portions: PortionCounts | null;
  portionsKcal: number | null;
  /** Its checks are done: the number turns Cherry with a check, and the step can fold into one line. */
  isDone: boolean;
  /** "1,990 kcal · Muscle gain +10% · 6 / 5½ / 4½ portions" — the folded line. */
  summary: string;
  /** Opens folded (an existing plan whose target is set); a new plan opens expanded. */
  startCollapsed: boolean;
}

/** Step 1: her data and goal, the calculation as an equation, and the daily target. */
export function CalorieTargetSection(props: CalorieTargetSectionProps) {
  const { target, onChange, suggestion, requestError, floorKcal, goalAdjustments, portions, portionsKcal, isDone, summary, startCollapsed } = props;
  const shared = useCopy(sharedCopy);
  const copy = useCopy(nutritionCopy);
  const { overrides } = target;
  const [isCollapsed, setIsCollapsed] = useState(startCollapsed && isDone);
  const folded = isCollapsed && isDone;

  return (
    <section className="nb-card" id={sectionId('target')} aria-labelledby="nb-target-title">
      <header className={folded ? 'nb-card-head nb-card-head-folded' : 'nb-card-head'}>
        <StepNumber number={1} isDone={isDone} />
        <h2 className="nb-card-title" id="nb-target-title" tabIndex={-1}>
          {copy.builder.step1}
        </h2>
        {folded && (
          <p className="nb-card-summary">
            <bdi>{summary}</bdi>
          </p>
        )}
        {isDone && (
          <div className="nb-card-tools">
            <PillButton size="sm" aria-expanded={!folded} aria-controls="nb-target-body" onClick={() => setIsCollapsed(!folded)}>
              {folded ? copy.builder.editStep : copy.builder.collapseStep}
            </PillButton>
          </div>
        )}
      </header>

      <div id="nb-target-body" hidden={folded}>
        <HerDataFields
          inputs={suggestion?.inputs}
          overrides={overrides}
          formulaSex={target.formulaSex}
          onOverride={(key, value) => onChange({ overrides: { ...overrides, [key]: value ?? null } })}
          onFormulaSex={(formulaSex) => onChange({ formulaSex })}
          onReset={() => onChange({ overrides: { ...NO_OVERRIDES } })}
        />
        <GoalSegmented label={copy.builder.goalLabel} value={target.goal} adjustments={goalAdjustments} onChange={(goal) => onChange({ goal })} />

        {requestError && (
          <p className="nb-error" role="alert">
            {requestError}
          </p>
        )}
        {suggestion?.status === 'needs_formula' && <p className="nb-note">{copy.suggestionNeedsFormula}</p>}
        {suggestion?.status === 'missing_inputs' && (
          <p className="nb-note">{fill(copy.suggestionMissing, { fields: suggestion.missing.map((field) => copy.missing[field]).join(shared.common.listSeparator) })}</p>
        )}
        {suggestion?.status === 'ok' && suggestion.bmr !== null && suggestion.tdee !== null && <CalcEquation suggestion={suggestion} floorKcal={floorKcal} />}

        <DailyTarget target={target} suggestion={suggestion} floorKcal={floorKcal} portions={portions} portionsKcal={portionsKcal} onChange={onChange} />
      </div>
    </section>
  );
}
