import { IconLogout } from '@tabler/icons-react';
import { sharedCopy, useCopy } from '@sistem/shared';
import { ConfirmSheet } from '../../../../components/common/ConfirmSheet/ConfirmSheet';
import { profileCopy } from '../../copy';

interface LogoutSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/** "להתנתק מהחשבון?" — log out (Cherry) or cancel, in the app's confirm sheet. */
export function LogoutSheet({ isOpen, onClose, onConfirm }: LogoutSheetProps) {
  const copy = useCopy(profileCopy);
  const shared = useCopy(sharedCopy);
  return (
    <ConfirmSheet
      isOpen={isOpen}
      tone="destructive"
      icon={<IconLogout className="flip-rtl" size={22} />}
      title={copy.logoutConfirm}
      confirmLabel={shared.common.logout}
      cancelLabel={copy.cancel}
      onConfirm={onConfirm}
      onCancel={onClose}
    />
  );
}
