import { IconTrash } from '@tabler/icons-react';
import type { CardioBlock } from '@sistem/types';
import { cardioKindLabel, useCopy, useI18n } from '@sistem/shared';
import { SgStepper } from '../SgStepper/SgStepper';
import { cardioCopy } from '../../copy';
import { BLOCK_KINDS, MAX_BLOCK_SEC, MAX_INTENSITY, MIN_BLOCK_SEC, MIN_INTENSITY, clamp, formatDuration, stepDuration } from '../../data/ownCardioDraft';
import './OwnCardioBlockEditor.css';

interface OwnCardioBlockEditorProps {
  block: CardioBlock;
  onChange: (patch: Partial<Omit<CardioBlock, 'type' | 'id'>>) => void;
  onRemove: (() => void) | null;
}

/** One block: its kind (chips), length and effort (steppers), remove. */
export function OwnCardioBlockEditor({ block, onChange, onRemove }: OwnCardioBlockEditorProps) {
  const copy = useCopy(cardioCopy).builder;
  const { language } = useI18n();
  return (
    <div className="sg-block" data-zone-kind={block.kind}>
      <div className="sg-block-kinds" role="radiogroup" aria-label={copy.kind}>
        {BLOCK_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            role="radio"
            aria-checked={block.kind === kind}
            className="sg-block-kind"
            onClick={() => onChange({ kind })}
          >
            {cardioKindLabel(kind, language)}
          </button>
        ))}
      </div>
      <div className="sg-block-values">
        <SgStepper
          label={copy.duration}
          display={formatDuration(block.durationSec)}
          onDecrease={() => onChange({ durationSec: stepDuration(block.durationSec, -1) })}
          onIncrease={() => onChange({ durationSec: stepDuration(block.durationSec, 1) })}
          canDecrease={block.durationSec > MIN_BLOCK_SEC}
          canIncrease={block.durationSec < MAX_BLOCK_SEC}
        />
        <SgStepper
          label={copy.intensity}
          display={`${block.intensity}/10`}
          onDecrease={() => onChange({ intensity: clamp(block.intensity - 1, MIN_INTENSITY, MAX_INTENSITY) })}
          onIncrease={() => onChange({ intensity: clamp(block.intensity + 1, MIN_INTENSITY, MAX_INTENSITY) })}
          canDecrease={block.intensity > MIN_INTENSITY}
          canIncrease={block.intensity < MAX_INTENSITY}
        />
      </div>
      {onRemove && (
        <button type="button" className="sg-block-remove" onClick={onRemove}>
          <IconTrash size={16} aria-hidden="true" />
          {copy.removeBlock}
        </button>
      )}
    </div>
  );
}
