import { useCopy } from '@sistem/shared';
import { Icon } from '../../../../components/common/Icon/Icon';
import { cardioCopy } from '../../copy';
import type { AddKind } from '../../data/cardioPresets';
import './CardioAddBar.css';

const KINDS: AddKind[] = ['warmup', 'steady', 'repeat', 'cooldown'];

/** The dashed add buttons under the blocks. */
export function CardioAddBar({ onAdd }: { onAdd: (kind: AddKind) => void }) {
  const copy = useCopy(cardioCopy);
  return (
    <div className="cb-add">
      {KINDS.map((kind) => (
        <button key={kind} className="cb-add-button" type="button" onClick={() => onAdd(kind)}>
          <Icon name="plus" size="sm" />
          {copy.add[kind]}
        </button>
      ))}
    </div>
  );
}
