import { useState } from 'react';
import type { FormEvent } from 'react';
import type { CoachPasswordLinkResponse } from '@sistem/types';
import { useCopy } from '@sistem/shared';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import { SideSheet } from '../../../../components/common/SideSheet/SideSheet';
import { adminCopy } from '../../copy';
import { PasswordLink } from '../PasswordLink/PasswordLink';
import './CreateCoachSheet.css';

interface CreateCoachSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, email: string) => Promise<CoachPasswordLinkResponse>;
}

/** "+ Coach": name + email → the account is made → its one-time set-password link, to copy. */
export function CreateCoachSheet({ isOpen, onClose, onCreate }: CreateCoachSheetProps) {
  const copy = useCopy(adminCopy);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<CoachPasswordLinkResponse | null>(null);

  function close() {
    setName('');
    setEmail('');
    setError(undefined);
    setResult(null);
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setIsSaving(true);
    try {
      setResult(await onCreate(name.trim(), email.trim()));
    } catch (createError) {
      setError((createError instanceof Error && createError.message) || copy.createError);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SideSheet
      isOpen={isOpen}
      onClose={close}
      title={copy.createTitle}
      subtitle={copy.createSubtitle}
      footer={
        result ? (
          <PillButton variant="dark" onClick={close}>
            {copy.done}
          </PillButton>
        ) : (
          <PillButton variant="primary" type="submit" form="create-coach-form" disabled={isSaving}>
            {isSaving ? copy.creating : copy.create}
          </PillButton>
        )
      }
    >
      {result ? (
        <PasswordLink result={result} />
      ) : (
        <form id="create-coach-form" className="create-coach" onSubmit={handleSubmit} noValidate>
          <label className="create-coach-field">
            <span className="create-coach-label">{copy.name}</span>
            <input className="create-coach-input" dir="auto" autoComplete="off" value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label className="create-coach-field">
            <span className="create-coach-label">{copy.email}</span>
            <input
              className="create-coach-input"
              type="email"
              dir="ltr"
              autoComplete="off"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          {error && (
            <p className="create-coach-error" role="alert">
              {error}
            </p>
          )}
        </form>
      )}
    </SideSheet>
  );
}
