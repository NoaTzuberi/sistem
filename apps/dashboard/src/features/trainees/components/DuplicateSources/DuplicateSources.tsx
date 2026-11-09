import { useId } from 'react';
import type { PlanDuplicateSource } from '@sistem/types';
import { fill, formatPlural, formatWeekSpan, useCopy, useLanguage } from '@sistem/shared';
import { Icon } from '../../../../components/common/Icon/Icon';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import { useRadioGroupKeys } from '../../hooks/useRadioGroupKeys';
import { traineesCopy } from '../../copy';
import './DuplicateSources.css';

interface DuplicateSourcesProps {
  /** The trainee the plan is for: her own plans carry no name. */
  traineeId: string;
  sources: PlanDuplicateSource[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  /** The empty state's "build a new plan". */
  onBuildNew: () => void;
  disabled: boolean;
}

/**
 * "Duplicate from": the coach's PUBLISHED plans only (drafts never — copying an empty draft
 * looped), newest first. Nothing published yet = an empty state with the way forward.
 */
export function DuplicateSources({ traineeId, sources, selectedId, onSelect, onBuildNew, disabled }: DuplicateSourcesProps) {
  const language = useLanguage();
  const copy = useCopy(traineesCopy);
  const handleRadioKeys = useRadioGroupKeys();
  const labelId = useId();
  const d = copy.duplicate;

  if (sources.length === 0) {
    return (
      <div className="dup-empty">
        <span className="dup-empty-icon" aria-hidden="true">
          <Icon name="copy" />
        </span>
        <p className="dup-empty-title">{d.emptyTitle}</p>
        <p className="dup-empty-text">{d.emptyText}</p>
        <div className="dup-empty-actions">
          <PillButton variant="primary" disabled={disabled} onClick={onBuildNew}>
            {d.emptyBuild}
          </PillButton>
        </div>
      </div>
    );
  }

  return (
    <>
      <p className="dup-label" id={labelId}>
        {d.sourcesLabel}
      </p>
      <div className="dup-list" role="radiogroup" aria-labelledby={labelId} onKeyDown={handleRadioKeys}>
        {sources.map((source) => {
          const isSelected = source.id === selectedId;
          return (
            <button
              key={source.id}
              className="dup-row"
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onSelect(source.id)}
            >
              <span className="dup-row-week">
                <bdi>{formatWeekSpan(source.weekStartDate, language)}</bdi>
              </span>
              <span className="dup-row-meta">
                {formatPlural(language, copy.weeks.workoutsCount, source.workoutCount)}
                {source.traineeId !== traineeId && (
                  <>
                    {' · '}
                    <bdi>{fill(d.sourceOf, { name: source.traineeName })}</bdi>
                  </>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
