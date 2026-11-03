import { useId } from 'react';
import { useCopy } from '@sistem/shared';
import { SideSheet } from '../../../../components/common/SideSheet/SideSheet';
import type { useDeleteAccount } from '../../hooks/useDeleteAccount';
import { accountCopy } from '../../copy';
import './DeleteAccountSheet.css';

interface DeleteAccountSheetProps {
  form: ReturnType<typeof useDeleteAccount>;
}

/** What gets deleted, her password, then the final cherry button (SideSheet: 300 / 200 ms, reduced motion). */
export function DeleteAccountSheet({ form }: DeleteAccountSheetProps) {
  const copy = useCopy(accountCopy);
  const passwordId = useId();
  const formId = useId();

  return (
    <SideSheet
      isOpen={form.isOpen}
      onClose={form.close}
      title={copy.title}
      footer={
        <div className="delete-account-actions">
          <button type="button" className="delete-account-button" onClick={form.close} disabled={form.isDeleting}>
            {copy.cancel}
          </button>
          <button
            type="submit"
            form={formId}
            className="delete-account-button delete-account-confirm"
            disabled={!form.canSubmit}
            aria-busy={form.isDeleting}
          >
            {form.isDeleting ? copy.deleting : copy.confirm}
          </button>
        </div>
      }
    >
      <form id={formId} className="delete-account-form" onSubmit={form.submit} noValidate>
        <p className="delete-account-text">{copy.intro}</p>
        <ul className="delete-account-list">
          {copy.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="delete-account-text">{copy.traineesNote}</p>
        <label className="delete-account-label" htmlFor={passwordId}>
          {copy.passwordLabel}
        </label>
        <input
          id={passwordId}
          className="delete-account-input"
          type="password"
          value={form.password}
          onChange={(event) => form.setPassword(event.target.value)}
          autoComplete="current-password"
          disabled={form.isDeleting}
          data-autofocus
        />
        {form.error && (
          <p className="delete-account-error" role="alert">
            {form.error}
          </p>
        )}
      </form>
    </SideSheet>
  );
}
