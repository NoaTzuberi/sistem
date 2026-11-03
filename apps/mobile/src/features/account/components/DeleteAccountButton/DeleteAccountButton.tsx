import { useState } from 'react';
import { useCopy } from '@sistem/shared';
import { DeleteAccountSheet } from '../DeleteAccountSheet/DeleteAccountSheet';
import { accountCopy } from '../../copy';
import './DeleteAccountButton.css';

/** "מחיקת חשבון" — cherry text at the bottom of Settings (trainee) and the coach Profile; opens the sheet. */
export function DeleteAccountButton() {
  const copy = useCopy(accountCopy);
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button type="button" className="delete-account-entry" onClick={() => setIsOpen(true)}>
        {copy.entry}
      </button>
      <DeleteAccountSheet isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
