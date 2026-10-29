import type { ReactNode } from 'react';
import { sharedCopy, useCopy } from '@sistem/shared';
import { Modal } from '../../../../components/common/Modal/Modal';
import { Button } from '../../../../components/common/Button/Button';
import './ConfirmSheet.css';

interface ConfirmSheetProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  /** The action is running: the sheet stays open and cannot be dismissed. */
  isWorking: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Extra fields between the message and the buttons (the publish sheet's message + tip). */
  children?: ReactNode;
}

/** "Are you sure?" as a bottom sheet — for actions the trainee sees right away. */
export function ConfirmSheet({ isOpen, title, message, confirmLabel, isWorking, onConfirm, onCancel, children }: ConfirmSheetProps) {
  const shared = useCopy(sharedCopy);
  return (
    <Modal isOpen={isOpen} title={title} onClose={isWorking ? () => undefined : onCancel}>
      <p className="confirm-sheet-message">{message}</p>
      {children}
      <div className="confirm-sheet-actions">
        <Button loading={isWorking} onClick={onConfirm}>
          {confirmLabel}
        </Button>
        <Button variant="secondary" disabled={isWorking} onClick={onCancel}>
          {shared.common.cancel}
        </Button>
      </div>
    </Modal>
  );
}
