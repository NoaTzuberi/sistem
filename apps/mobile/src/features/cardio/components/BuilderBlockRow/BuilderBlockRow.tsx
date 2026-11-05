import type { CSSProperties } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { IconDots, IconGripVertical } from '@tabler/icons-react';
import type { CardioBlock } from '@sistem/types';
import { cardioKindLabel, intensityZone, useCopy, useI18n } from '@sistem/shared';
import { OwnCardioBlockEditor } from '../OwnCardioBlockEditor/OwnCardioBlockEditor';
import { formatDuration } from '../../data/ownCardioDraft';
import { cardioCopy } from '../../copy';
import './BuilderBlockRow.css';

interface BuilderBlockRowProps {
  block: CardioBlock;
  isOpen: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<Omit<CardioBlock, 'type' | 'id'>>) => void;
  /** Opens the ⋯ sheet (duplicate / delete). */
  onMore: () => void;
  /** Inside a repeat set: a softer row. */
  nested?: boolean;
}

/** One block of the timeline: a collapsed row (stripe, kind, time, effort · zone, drag, ⋯) that opens into the editor. */
export function BuilderBlockRow({ block, isOpen, onToggle, onChange, onMore, nested = false }: BuilderBlockRowProps) {
  const copy = useCopy(cardioCopy).builder;
  const { language } = useI18n();
  const sortable = useSortable({ id: block.id });
  const zone = intensityZone(block.intensity);
  // dnd-kit moves the row while dragging (a value only it knows, every frame).
  const style: CSSProperties = { transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition };
  const editorId = `cb-editor-${block.id}`;

  return (
    <div
      ref={sortable.setNodeRef}
      id={`cb-row-${block.id}`}
      style={style}
      className={['cb-row cp-zone', nested && 'cb-row-nested', isOpen && 'cb-row-open', sortable.isDragging && 'cb-row-dragging'].filter(Boolean).join(' ')}
      data-zone={zone}
    >
      <div className="cb-row-head">
        <button type="button" className="cb-row-icon cb-row-grip" aria-label={copy.drag} {...sortable.attributes} {...sortable.listeners}>
          <IconGripVertical size={18} aria-hidden="true" />
        </button>
        <button type="button" className="cb-row-main" aria-expanded={isOpen} aria-controls={editorId} onClick={onToggle}>
          <span className="cb-row-kind">{cardioKindLabel(block.kind, language)}</span>
          <bdi className="cb-row-time" dir="ltr">
            {formatDuration(block.durationSec)}
          </bdi>
          <span className="cb-row-effort">
            <bdi dir="ltr">{block.intensity}/10</bdi> · <bdi dir="ltr">Z{zone}</bdi>
          </span>
        </button>
        <button type="button" className="cb-row-icon" aria-label={copy.more} onClick={onMore}>
          <IconDots size={18} aria-hidden="true" />
        </button>
      </div>
      {/* 0fr → 1fr: the height animates without measuring; closed = out of the tab order. */}
      <div className="cb-row-body" id={editorId} inert={!isOpen}>
        <div className="cb-row-body-inner">
          <OwnCardioBlockEditor block={block} onChange={onChange} onRemove={null} />
        </div>
      </div>
    </div>
  );
}
