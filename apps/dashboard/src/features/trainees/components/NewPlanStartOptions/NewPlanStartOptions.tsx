import { useState } from 'react';
import type { PlanStartMethod } from '@sistem/shared';
import { fill, formatPlural, formatWeekSpan, sharedCopy, useCopy, useLanguage } from '@sistem/shared';
import { Icon } from '../../../../components/common/Icon/Icon';
import type { IconName } from '../../../../components/common/Icon/iconPaths';
import { aiDraftCopy } from '../../../aiDraft/copy';
import { DuplicateSources } from '../DuplicateSources/DuplicateSources';
import type { NewPlanPopoverState } from '../../hooks/useNewPlanPopover';
import { useRadioGroupKeys } from '../../hooks/useRadioGroupKeys';
import './NewPlanStartOptions.css';

interface NewPlanStartOptionsProps {
  popover: NewPlanPopoverState;
  traineeId: string;
  /** How many workouts the AI draft that would be loaded has; undefined = no ready draft. */
  aiWorkoutCount: number | undefined;
  /** "חלוקת אימונים": the AI draft sheet (split cards, regenerate). */
  onOpenSplits: () => void;
  labelledBy: string;
}

/** Step 2, "איך להתחיל?": three option cards (the one selected look) and the training-split row. */
export function NewPlanStartOptions({ popover, traineeId, aiWorkoutCount, onOpenSplits, labelledBy }: NewPlanStartOptionsProps) {
  const language = useLanguage();
  const text = useCopy(sharedCopy).newPlanFlow;
  const aiStatus = useCopy(aiDraftCopy).status;
  const handleRadioKeys = useRadioGroupKeys();
  const [isPickingSource, setIsPickingSource] = useState(false);
  const { method, source } = popover;
  const options: { id: PlanStartMethod; icon: IconName; label: string; hint: string; disabled: boolean }[] = [
    { id: 'scratch', icon: 'pencil', label: text.scratch, hint: text.scratchHint, disabled: false },
    {
      id: 'duplicate',
      icon: 'copy',
      label: text.duplicate,
      hint: source
        ? fill(text.duplicateHint, { week: formatWeekSpan(source.weekStartDate, language), workouts: formatPlural(language, text.workouts, source.workoutCount) })
        : text.nothingToCopy,
      // Nothing published yet: "מאפס" is right above it.
      disabled: popover.sources !== null && !popover.hasSources,
    },
    {
      id: 'ai',
      icon: 'spark',
      label: text.ai,
      hint: popover.canUseAi && aiWorkoutCount !== undefined ? formatPlural(language, text.aiHint, aiWorkoutCount) : popover.canUseAi ? aiStatus.ready : text.aiNone,
      disabled: !popover.canUseAi,
    },
  ];

  return (
    <>
      <div className="new-plan-options" role="radiogroup" aria-labelledby={labelledBy} onKeyDown={handleRadioKeys}>
        {options.map((option) => {
          const isSelected = option.id === method;
          return (
            <div key={option.id} className="new-plan-option-wrap">
              <button
                className="new-plan-option"
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={option.disabled || popover.isCreating}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => popover.selectMethod(option.id)}
              >
                <span className="new-plan-option-icon" aria-hidden="true">
                  <Icon name={option.icon} />
                </span>
                <span className="new-plan-option-text">
                  <span className="new-plan-option-label">{option.label}</span>
                  <span className="new-plan-option-hint">
                    <bdi>{option.hint}</bdi>
                  </span>
                </span>
              </button>
              {/* A button never holds another button: "בחירת תוכנית אחרת" sits under the card. */}
              {option.id === 'duplicate' && isSelected && popover.hasSources && (
                <button className="new-plan-option-link" type="button" aria-expanded={isPickingSource} onClick={() => setIsPickingSource((open) => !open)}>
                  {text.pickOther}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {method === 'duplicate' && isPickingSource && popover.sources && (
        <DuplicateSources
          traineeId={traineeId}
          sources={popover.sources}
          selectedId={source?.id}
          onSelect={popover.selectSource}
          onBuildNew={() => popover.selectMethod('scratch')}
          disabled={popover.isCreating}
        />
      )}

      <button className="new-plan-split" type="button" onClick={onOpenSplits}>
        <span className="new-plan-option-text">
          <span className="new-plan-split-label">
            <bdi>{text.split}</bdi>
          </span>
          <span className="new-plan-option-hint">{text.splitHint}</span>
        </span>
        <Icon name="chevron" size="sm" flip className="new-plan-split-chevron" />
      </button>
    </>
  );
}
