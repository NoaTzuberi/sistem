import type { CardioBlockKind, CardioMetric, CardioRepeatSet as RepeatSet } from '@sistem/types';
import { fill, formatClock, repeatRoundSec, useCopy } from '@sistem/shared';
import { Icon } from '../../../../components/common/Icon/Icon';
import { cardioCopy } from '../../copy';
import { CardioBlockRow } from '../CardioBlockRow/CardioBlockRow';
import { CardioStepper } from '../CardioStepper/CardioStepper';
import './CardioRepeatSet.css';

interface CardioRepeatSetProps {
  step: RepeatSet;
  metric: CardioMetric;
  selectedId: string | null;
  onTimes: (direction: 1 | -1) => void;
  onRemove: () => void;
  blockHandlers: {
    onToggle: (id: string) => void;
    onKind: (id: string, kind: CardioBlockKind) => void;
    onDuration: (id: string, direction: 1 | -1) => void;
    onIntensity: (id: string, direction: 1 | -1) => void;
    onRemove: (id: string) => void;
  };
}

/** A repeat set: ×N, its round and total time, and its blocks. */
export function CardioRepeatSet({ step, metric, selectedId, onTimes, onRemove, blockHandlers }: CardioRepeatSetProps) {
  const copy = useCopy(cardioCopy);
  const round = repeatRoundSec(step.blocks);

  return (
    <div className="cb-repeat">
      <div className="cb-repeat-head">
        <Icon name="refresh" className="cb-repeat-icon" />
        <b className="cb-repeat-title">{copy.repeatTitle}</b>
        <CardioStepper tone="repeat" value={`× ${step.times}`} lessLabel={copy.lessRounds} moreLabel={copy.moreRounds} onLess={() => onTimes(-1)} onMore={() => onTimes(1)} />
        <small className="cb-repeat-time">{fill(copy.perRound, { round: formatClock(round), total: formatClock(round * step.times) })}</small>
        <button className="cb-repeat-delete" type="button" aria-label={copy.deleteRepeat} onClick={onRemove}>
          <Icon name="close" size="sm" />
        </button>
      </div>
      {step.blocks.map((block) => (
        <CardioBlockRow
          key={block.id}
          block={block}
          metric={metric}
          isOpen={selectedId === block.id}
          onToggle={() => blockHandlers.onToggle(block.id)}
          onKind={(kind) => blockHandlers.onKind(block.id, kind)}
          onDuration={(direction) => blockHandlers.onDuration(block.id, direction)}
          onIntensity={(direction) => blockHandlers.onIntensity(block.id, direction)}
          onRemove={() => blockHandlers.onRemove(block.id)}
        />
      ))}
    </div>
  );
}
