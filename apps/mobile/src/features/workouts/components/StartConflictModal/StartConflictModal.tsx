import { fill, useCopy } from '@sistem/shared';
import type { ActiveWorkoutRef } from '@sistem/types';
import { IconBarbell } from '@tabler/icons-react';
import { ConfirmSheet } from '../../../../components/common/ConfirmSheet/ConfirmSheet';
import { workoutCopy } from '../../copy';

interface StartConflictModalProps {
  active: ActiveWorkoutRef | null;
  isBusy: boolean;
  onClose: () => void;
  onResume: () => void;
  onDiscardAndStart: () => void;
}

/** Only one workout can be open: resume the open one, or discard it and start this one. */
export function StartConflictModal({ active, isBusy, onClose, onResume, onDiscardAndStart }: StartConflictModalProps) {
  const copy = useCopy(workoutCopy);
  return (
    <ConfirmSheet
      isOpen={active !== null}
      icon={<IconBarbell size={22} />}
      title={copy.session.conflictTitle}
      message={active ? fill(copy.session.conflictText, { title: active.workoutTitle }) : undefined}
      confirmLabel={active ? fill(copy.session.conflictResume, { title: active.workoutTitle }) : ''}
      onConfirm={onResume}
      secondary={{ label: copy.session.conflictDiscardAndStart, onClick: onDiscardAndStart, tone: 'destructive' }}
      hideCancel
      isWorking={isBusy}
      onCancel={onClose}
    />
  );
}
