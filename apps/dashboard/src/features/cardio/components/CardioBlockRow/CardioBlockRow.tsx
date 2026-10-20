import { useId } from 'react';
import type { CardioBlock, CardioBlockKind, CardioMetric } from '@sistem/types';
import { cardioKindLabel, describeCardioTarget, formatClock, intensityZone, useCopy, useLanguage } from '@sistem/shared';
import { Icon } from '../../../../components/common/Icon/Icon';
import { cardioCopy } from '../../copy';
import { CARDIO_KINDS } from '../../data/cardioPresets';
import { CardioStepper } from '../CardioStepper/CardioStepper';
import './CardioBlockRow.css';

interface CardioBlockRowProps {
  block: CardioBlock;
  metric: CardioMetric;
  isOpen: boolean;
  onToggle: () => void;
  onKind: (kind: CardioBlockKind) => void;
  onDuration: (direction: 1 | -1) => void;
  onIntensity: (direction: 1 | -1) => void;
  onRemove: () => void;
}

/** One block: its zone bar, its kind (opens the kind chips), time and intensity steppers, delete. */
export function CardioBlockRow({ block, metric, isOpen, onToggle, onKind, onDuration, onIntensity, onRemove }: CardioBlockRowProps) {
  const copy = useCopy(cardioCopy);
  const language = useLanguage();
  const kindsId = useId();
  const target = describeCardioTarget(block.intensity, metric, language);

  return (
    <div className="cb-block cb-zone" data-zone={intensityZone(block.intensity)} data-open={isOpen ? '' : undefined} data-block-id={block.id}>
      <span className="cb-block-bar" aria-hidden="true" />
      <div className="cb-block-kind">
        <button className="cb-block-name" type="button" aria-expanded={isOpen} aria-controls={kindsId} onClick={onToggle}>
          {cardioKindLabel(block.kind, language)}
          <Icon name="chevronDown" size="sm" className="cb-block-chevron" />
        </button>
        {isOpen && (
          <div className="cb-block-kinds" id={kindsId} role="radiogroup" aria-label={copy.kindLabel}>
            {CARDIO_KINDS.map((kind) => (
              <button key={kind} className="cb-block-kind-chip" type="button" role="radio" aria-checked={kind === block.kind} onClick={() => onKind(kind)}>
                {cardioKindLabel(kind, language)}
              </button>
            ))}
          </div>
        )}
      </div>
      <CardioStepper
        value={formatClock(block.durationSec)}
        unit={copy.minutes}
        lessLabel={copy.lessTime}
        moreLabel={copy.moreTime}
        onLess={() => onDuration(-1)}
        onMore={() => onDuration(1)}
      />
      <CardioStepper
        tone="zone"
        value={target.value}
        unit={target.label}
        lessLabel={copy.lessIntensity}
        moreLabel={copy.moreIntensity}
        onLess={() => onIntensity(-1)}
        onMore={() => onIntensity(1)}
      />
      <button className="cb-block-delete" type="button" aria-label={copy.deleteBlock} onClick={onRemove}>
        <Icon name="close" size="sm" />
      </button>
    </div>
  );
}
