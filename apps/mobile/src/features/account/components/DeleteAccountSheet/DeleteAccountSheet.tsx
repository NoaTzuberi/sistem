import { useCopy } from '@sistem/shared';
import { BottomSheet } from '../../../../components/common/BottomSheet/BottomSheet';
import { Input } from '../../../../components/common/Input/Input';
import { useAuth } from '../../../../services/auth/AuthContext';
import { useDeleteAccount } from '../../hooks/useDeleteAccount';
import { accountCopy } from '../../copy';
import './DeleteAccountSheet.css';

interface DeleteAccountSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

/** What gets deleted, her password, then the final cherry button. Logic in useDeleteAccount. */
export function DeleteAccountSheet({ isOpen, onClose }: DeleteAccountSheetProps) {
  const copy = useCopy(accountCopy);
  const { user } = useAuth();
  const form = useDeleteAccount(onClose);
  const isCoach = Boolean(user?.roles.includes('coach'));
  const isTrainee = Boolean(user?.roles.includes('trainee'));

  return (
    <BottomSheet isOpen={isOpen} onClose={form.close} labelledBy="delete-account-title" className="delete-account-sheet">
      <form className="delete-account-form" onSubmit={form.submit} noValidate>
        <h2 className="delete-account-title display-title" id="delete-account-title">
          {copy.title}
        </h2>
        <p className="delete-account-text">{copy.intro}</p>
        <ul className="delete-account-list">
          {copy.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        {isTrainee && <p className="delete-account-text">{copy.coachingNote}</p>}
        {isCoach && <p className="delete-account-text">{copy.coachNote}</p>}

        <Input
          type="password"
          label={copy.passwordLabel}
          placeholder={copy.passwordPlaceholder}
          value={form.password}
          onChange={(event) => form.setPassword(event.target.value)}
          autoComplete="current-password"
          disabled={form.isDeleting}
        />
        {form.error && (
          <p className="delete-account-error" role="alert">
            {form.error}
          </p>
        )}

        <div className="delete-account-actions">
          <button type="submit" className="delete-account-button delete-account-confirm" disabled={!form.canSubmit} aria-busy={form.isDeleting}>
            {form.isDeleting ? copy.deleting : copy.confirm}
          </button>
          <button type="button" className="delete-account-button" onClick={form.close} disabled={form.isDeleting}>
            {copy.cancel}
          </button>
        </div>
      </form>
    </BottomSheet>
  );
}
