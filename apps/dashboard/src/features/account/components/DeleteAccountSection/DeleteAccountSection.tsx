import { useCopy } from '@sistem/shared';
import { useDeleteAccount } from '../../hooks/useDeleteAccount';
import { DeleteAccountSheet } from '../DeleteAccountSheet/DeleteAccountSheet';
import { accountCopy } from '../../copy';
import './DeleteAccountSection.css';

/** "מחיקת חשבון" — cherry text at the bottom of Settings; opens the side sheet. */
export function DeleteAccountSection() {
  const copy = useCopy(accountCopy);
  const form = useDeleteAccount();
  return (
    <div className="delete-account-section">
      <button type="button" className="delete-account-entry" onClick={form.open}>
        {copy.entry}
      </button>
      <DeleteAccountSheet form={form} />
    </div>
  );
}
