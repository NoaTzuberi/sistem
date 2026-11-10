import { useState } from 'react';
import type { ReactNode } from 'react';
import { IconCopy, IconPencil, IconSparkles } from '@tabler/icons-react';
import type { NewPlanFlowState, PlanStartMethod } from '@sistem/shared';
import { fill, formatPlural, formatWeekSpan, sharedCopy, useCopy, useLanguage } from '@sistem/shared';
import { coachCopy } from '../../copy';
import './NewPlanStartOptions.css';

interface NewPlanStartOptionsProps {
  flow: NewPlanFlowState;
  traineeId: string;
  /** The dashboard address is set: "מאפס" / "טיוטת AI" open there (the builder lives in the dashboard). */
  hasDashboard: boolean;
  labelledBy: string;
}

/**
 * Step 2, "איך להתחיל?", on the phone: the dashboard's three option cards. Duplicating is done here (copy +
 * publish); "מאפס" and "טיוטת AI" continue in the dashboard.
 */
export function NewPlanStartOptions({ flow, traineeId, hasDashboard, labelledBy }: NewPlanStartOptionsProps) {
  const language = useLanguage();
  const text = useCopy(sharedCopy).newPlanFlow;
  const copy = useCopy(coachCopy);
  const [isPickingSource, setIsPickingSource] = useState(false);
  const { method, source, sources } = flow;
  const hasSources = (sources?.length ?? 0) > 0;
  const options: { id: PlanStartMethod; icon: ReactNode; label: string; hint: string; disabled: boolean }[] = [
    { id: 'scratch', icon: <IconPencil size={22} />, label: text.scratch, hint: hasDashboard ? text.scratchHint : copy.plansOnDashboard, disabled: !hasDashboard },
    {
      id: 'duplicate',
      icon: <IconCopy size={22} />,
      label: text.duplicate,
      hint: source
        ? fill(text.duplicateHint, { week: formatWeekSpan(source.weekStartDate, language), workouts: formatPlural(language, text.workouts, source.workoutCount) })
        : text.nothingToCopy,
      disabled: sources !== null && !hasSources,
    },
    { id: 'ai', icon: <IconSparkles size={22} />, label: text.ai, hint: hasDashboard ? copy.detail.openInDashboard : copy.plansOnDashboard, disabled: !hasDashboard },
  ];

  return (
    <>
      <div className="new-plan-options" role="radiogroup" aria-labelledby={labelledBy}>
        {options.map((option) => (
          <div key={option.id} className="new-plan-option-wrap">
            <button
              className="new-plan-option"
              type="button"
              role="radio"
              aria-checked={option.id === method}
              disabled={option.disabled}
              onClick={() => flow.selectMethod(option.id)}
            >
              <span className="new-plan-option-icon" aria-hidden="true">
                {option.icon}
              </span>
              <span className="new-plan-option-text">
                <span className="new-plan-option-label">{option.label}</span>
                <span className="new-plan-option-hint">
                  <bdi>{option.hint}</bdi>
                </span>
              </span>
            </button>
            {option.id === 'duplicate' && method === 'duplicate' && hasSources && (
              <button className="new-plan-option-link" type="button" aria-expanded={isPickingSource} onClick={() => setIsPickingSource((open) => !open)}>
                {text.pickOther}
              </button>
            )}
          </div>
        ))}
      </div>

      {method === 'duplicate' && isPickingSource && sources && (
        <div className="new-plan-sources" role="radiogroup" aria-label={copy.newPlanSources.label}>
          {sources.map((entry) => {
            const week = formatWeekSpan(entry.weekStartDate, language);
            return (
              <button
                key={entry.id}
                className="new-plan-source"
                type="button"
                role="radio"
                aria-checked={entry.id === source?.id}
                onClick={() => flow.selectSource(entry.id)}
              >
                <span className="new-plan-source-week">
                  <bdi>{entry.traineeId === traineeId ? week : fill(copy.newPlanSources.of, { week, name: entry.traineeName })}</bdi>
                </span>
                <span className="new-plan-source-meta">{formatPlural(language, text.workouts, entry.workoutCount)}</span>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
