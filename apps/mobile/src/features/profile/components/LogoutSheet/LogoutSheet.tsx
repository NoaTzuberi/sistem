import { sharedCopy, useCopy } from '@sistem/shared';
import { BottomSheet } from '../../../../components/common/BottomSheet/BottomSheet';
import { profileCopy } from '../../copy';
import './LogoutSheet.css';

interface LogoutSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/** "להתנתק מהחשבון?" — log out (Cherry) or cancel. */
export function LogoutSheet({ isOpen, onClose, onConfirm }: LogoutSheetProps) {
  const copy = useCopy(profileCopy);
  const shared = useCopy(sharedCopy);
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} labelledBy="st-logout-title" className="st-logout-sheet">
      <h2 className="st-logout-title display-title" id="st-logout-title">
        {copy.logoutConfirm}
      </h2>
      <div className="st-logout-actions">
        <button type="button" className="st-logout-button st-logout-confirm" onClick={onConfirm}>
          {shared.common.logout}
        </button>
        <button type="button" className="st-logout-button" onClick={onClose}>
          {copy.cancel}
        </button>
      </div>
    </BottomSheet>
  );
}
