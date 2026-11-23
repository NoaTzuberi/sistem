import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { AdminUser } from '@sistem/types';
import { useCopy } from '@sistem/shared';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import { SideSheet } from '../../../../components/common/SideSheet/SideSheet';
import { adminCopy } from '../../copy';
import './ChangeEmailSheet.css';

interface ChangeEmailSheetProps {
  /** The test account being edited; null = closed. */
  user: AdminUser | null;
  onClose: () => void;
  /** Throws the server's message (taken, not a test account, invalid). */
  onSave: (user: AdminUser, email: string) => Promise<void>;
}

/** A test account's new email (the server refuses real addresses). */
export function ChangeEmailSheet({ user, onClose, onSave }: ChangeEmailSheetProps) {
  const copy = useCopy(adminCopy);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEmail('');
    setError(undefined);
  }, [user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setError(undefined);
    setIsSaving(true);
    try {
      await onSave(user, email.trim());
    } catch (saveError) {
      setError((saveError instanceof Error && saveError.message) || copy.changeEmailError);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SideSheet
      isOpen={user !== null}
      onClose={onClose}
      title={copy.changeEmailTitle}
      subtitle={copy.changeEmailText}
      footer={
        <PillButton variant="primary" type="submit" form="change-email-form" disabled={isSaving}>
          {isSaving ? copy.changeEmailSaving : copy.changeEmailSave}
        </PillButton>
      }
    >
      <form id="change-email-form" className="change-email" onSubmit={handleSubmit} noValidate>
        {user && (
          <bdi className="change-email-current" dir="ltr">
            {user.email}
          </bdi>
        )}
        <label className="change-email-field">
          <span className="change-email-label">{copy.changeEmailNew}</span>
          <input
            className="change-email-input"
            type="email"
            dir="ltr"
            autoComplete="off"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        {error && (
          <p className="change-email-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </SideSheet>
  );
}
