import type { CSSProperties } from 'react';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { IconDots, IconGripVertical, IconMinus, IconPlus, IconRepeat } from '@tabler/icons-react';
import type { CardioBlock, CardioRepeatSet } from '@sistem/types';
import { fill, useCopy } from '@sistem/shared';
import { BuilderBlockRow } from '../BuilderBlockRow/BuilderBlockRow';
import { MAX_REPEAT_BLOCKS, MAX_TIMES, MIN_TIMES } from '../../data/ownCardioDraft';
import { cardioCopy } from '../../copy';
import './BuilderRepeat.css';

interface BuilderRepeatProps {
  repeat: CardioRepeatSet;
  selectedId: string | null;
  onToggle: (blockId: string) => void;
  onChange: (blockId: string, patch: Partial<Omit<CardioBlock, 'type' | 'id'>>) => void;
  onTimes: (times: number) => void;
  onMore: (id: string) => void;
  onAdd: () => void;
}

/** A repeat set: one card with a purple side line, "חזרה × N" with its own stepper, its blocks (sortable inside), + a block. */
export function BuilderRepeat({ repeat, selectedId, onToggle, onChange, onTimes, onMore, onAdd }: BuilderRepeatProps) {
  const copy = useCopy(cardioCopy).builder;
  const sortable = useSortable({ id: repeat.id });
  // dnd-kit moves the card while dragging (a value only it knows, every frame).
  const style: CSSProperties = { transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition };
  const [timesBefore = '', timesAfter = ''] = copy.repeatTitle.split('{times}');

  return (
    <div ref={sortable.setNodeRef} style={style} className={sortable.isDragging ? 'cb-repeat cb-repeat-dragging' : 'cb-repeat'}>
      <div className="cb-repeat-head">
        <button type="button" className="cb-repeat-grip" aria-label={copy.drag} {...sortable.attributes} {...sortable.listeners}>
          <IconGripVertical size={18} aria-hidden="true" />
        </button>
        <span className="cb-repeat-title">
          <IconRepeat size={16} aria-hidden="true" />
          {timesBefore}
          <bdi dir="ltr">{repeat.times}</bdi>
          {timesAfter}
        </span>
        <span className="cb-repeat-stepper" role="group" aria-label={copy.times}>
          <button
            type="button"
            aria-label={fill(copy.decrease, { what: copy.times })}
            disabled={repeat.times <= MIN_TIMES}
            onClick={() => onTimes(repeat.times - 1)}
          >
            <IconMinus size={16} aria-hidden="true" />
          </button>
          <output dir="ltr" aria-live="polite">
            {repeat.times}
          </output>
          <button
            type="button"
            aria-label={fill(copy.increase, { what: copy.times })}
            disabled={repeat.times >= MAX_TIMES}
            onClick={() => onTimes(repeat.times + 1)}
          >
            <IconPlus size={16} aria-hidden="true" />
          </button>
        </span>
        <button type="button" className="cb-repeat-grip cb-repeat-more" aria-label={copy.more} onClick={() => onMore(repeat.id)}>
          <IconDots size={18} aria-hidden="true" />
        </button>
      </div>
      <SortableContext items={repeat.blocks.map((block) => block.id)} strategy={verticalListSortingStrategy}>
        <div className="cb-repeat-blocks">
          {repeat.blocks.map((block) => (
            <BuilderBlockRow
              key={block.id}
              nested
              block={block}
              isOpen={selectedId === block.id}
              onToggle={() => onToggle(block.id)}
              onChange={(patch) => onChange(block.id, patch)}
              onMore={() => onMore(block.id)}
            />
          ))}
        </div>
      </SortableContext>
      {repeat.blocks.length < MAX_REPEAT_BLOCKS && (
        <button type="button" className="cb-repeat-add" onClick={onAdd}>
          <IconPlus size={16} aria-hidden="true" />
          {copy.addToRepeat}
        </button>
      )}
    </div>
  );
}
