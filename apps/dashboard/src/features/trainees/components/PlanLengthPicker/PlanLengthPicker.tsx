import { formatPlural, useCopy, useLanguage } from '@sistem/shared';
import { SegmentedControl } from '../../../../components/common/SegmentedControl/SegmentedControl';
import { Stepper } from '../../../../components/common/Stepper/Stepper';
import type { PlanLength } from '../../data/newPlanStart';
import { MAX_BLOCK_WEEKS, MIN_BLOCK_WEEKS } from '../../data/newPlanStart';
import { traineesCopy } from '../../copy';
import './PlanLengthPicker.css';

interface PlanLengthPickerProps {
  length: PlanLength;
  weeks: number;
  onLengthChange: (length: PlanLength) => void;
  onWeeksChange: (weeks: number) => void;
  disabled?: boolean;
}

/** The first choice of "תוכנית חדשה": weekly, or a multi-week plan of 2–8 weeks. */
export function PlanLengthPicker({ length, weeks, onLengthChange, onWeeksChange, disabled }: PlanLengthPickerProps) {
  const copy = useCopy(traineesCopy).length;
  const language = useLanguage();
  const weeksText = formatPlural(language, copy.weeks, weeks);
  return (
    <div className="plan-length">
      <span className="plan-length-label">{copy.label}</span>
      <div className="plan-length-row">
        <SegmentedControl
          label={copy.label}
          value={length}
          disabled={disabled}
          onChange={onLengthChange}
          options={[
            { value: 'weekly', label: copy.weekly },
            { value: 'block', label: copy.block },
          ]}
        />
        {length === 'block' && (
          <>
            <Stepper
              label={copy.label}
              value={weeks}
              min={MIN_BLOCK_WEEKS}
              max={MAX_BLOCK_WEEKS}
              valueText={weeksText}
              lessLabel={copy.fewer}
              moreLabel={copy.more}
              disabled={disabled}
              onChange={onWeeksChange}
            />
            <span className="plan-length-hint">{copy.hint}</span>
          </>
        )}
      </div>
    </div>
  );
}
