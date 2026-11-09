import type { PlanBlockInfo } from '@sistem/types';
import { fill, formatPlural, useCopy, useLanguage } from '@sistem/shared';
import { Icon } from '../../../../components/common/Icon/Icon';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import { Stepper } from '../../../../components/common/Stepper/Stepper';
import { Switch } from '../../../../components/common/Switch/Switch';
import { MAX_BLOCK_WEEKS, MIN_BLOCK_WEEKS } from '../../../trainees/data/newPlanStart';
import { laterWeeksRange } from '../../data/blockWeeks';
import { planBuilderCopy } from '../../copy';
import './BlockControls.css';

interface BlockControlsProps {
  block: PlanBlockInfo;
  /** A change is on its way (length, switch, copy): nothing else starts. */
  isBusy: boolean;
  onLengthChange: (weeks: number) => void;
  onDeloadChange: (deload: boolean) => void;
  onCopyForward: () => void;
}

/** A multi-week plan's controls: its length (drafts only), the light last week, and "copy to the next weeks". */
export function BlockControls({ block, isBusy, onLengthChange, onDeloadChange, onCopyForward }: BlockControlsProps) {
  const copy = useCopy(planBuilderCopy).block;
  const language = useLanguage();
  const later = laterWeeksRange(block.week, block.lengthWeeks);
  const isDraft = block.status === 'draft';
  const copyText = !later
    ? copy.copyTextLast
    : later.from === later.to
      ? fill(copy.copyTextOne, { n: block.week, target: later.from })
      : fill(copy.copyText, { n: block.week, range: `${later.from}–${later.to}` });

  return (
    <div className="block-controls">
      <div className="block-length">
        <span className="block-length-label">{copy.lengthLabel}</span>
        <Stepper
          label={copy.lengthLabel}
          value={block.lengthWeeks}
          min={MIN_BLOCK_WEEKS}
          max={MAX_BLOCK_WEEKS}
          valueText={formatPlural(language, copy.weeks, block.lengthWeeks)}
          lessLabel={copy.fewer}
          moreLabel={copy.more}
          disabled={!isDraft || isBusy}
          onChange={onLengthChange}
        />
        <span className="block-length-hint">{isDraft ? copy.lengthHint : copy.lengthLocked}</span>
      </div>

      <div className="block-copybar">
        <p className="block-copybar-text">{copyText}</p>
        <div className="block-copybar-actions">
          <Switch checked={block.deloadLastWeek} disabled={isBusy} onChange={onDeloadChange} label={copy.deloadSwitch} />
          <PillButton variant="primary" disabled={!later || isBusy} onClick={onCopyForward}>
            <Icon name="copy" size="sm" />
            {copy.copyButton}
          </PillButton>
        </div>
      </div>
    </div>
  );
}
