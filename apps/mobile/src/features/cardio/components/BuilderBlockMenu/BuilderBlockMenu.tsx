import { IconCopy, IconTrash } from '@tabler/icons-react';
import { useCopy } from '@sistem/shared';
import { BottomSheet } from '../../../../components/common/BottomSheet/BottomSheet';
import { cardioCopy } from '../../copy';
import './BuilderBlockMenu.css';

interface BuilderBlockMenuProps {
  isOpen: boolean;
  title: string;
  canDelete: boolean;
  onClose: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

/** A block's ⋯ : duplicate or delete (the last block can't be deleted). */
export function BuilderBlockMenu({ isOpen, title, canDelete, onClose, onDuplicate, onDelete }: BuilderBlockMenuProps) {
  const copy = useCopy(cardioCopy).builder;
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} labelledBy="cb-menu-title" className="confirm-sheet">
      <h2 className="cb-menu-title display-title" id="cb-menu-title">
        {title}
      </h2>
      <div className="cb-menu-actions">
        <button type="button" className="cb-menu-button" onClick={onDuplicate}>
          <IconCopy size={18} aria-hidden="true" />
          {copy.duplicate}
        </button>
        {canDelete && (
          <button type="button" className="cb-menu-button cb-menu-delete" onClick={onDelete}>
            <IconTrash size={18} aria-hidden="true" />
            {copy.deleteBlock}
          </button>
        )}
      </div>
    </BottomSheet>
  );
}
