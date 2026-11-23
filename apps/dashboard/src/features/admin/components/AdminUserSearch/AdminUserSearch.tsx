import { useState } from 'react';
import type { FormEvent } from 'react';
import { useCopy } from '@sistem/shared';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import { SideSheet } from '../../../../components/common/SideSheet/SideSheet';
import { Tag } from '../../../../components/common/Tag/Tag';
import { adminCopy } from '../../copy';
import { useAdminUsers } from '../../hooks/useAdminUsers';
import { ChangeEmailSheet } from '../ChangeEmailSheet/ChangeEmailSheet';
import { PasswordLink } from '../PasswordLink/PasswordLink';
import './AdminUserSearch.css';

/**
 * Any account by name / email (identity only, never her data) → a one-time reset link to pass on when
 * email can't reach her, and — test accounts only — a new email (a real +alias, to test the email flow).
 */
export function AdminUserSearch() {
  const copy = useCopy(adminCopy);
  const admin = useAdminUsers();
  const [query, setQuery] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void admin.search(query);
  }

  return (
    <section className="admin-users" aria-labelledby="admin-users-title">
      <header className="admin-users-head">
        <h2 className="admin-users-title" id="admin-users-title">
          {copy.usersTitle}
        </h2>
        <p className="admin-users-text">{copy.usersText}</p>
      </header>

      <form className="admin-users-form" role="search" onSubmit={handleSubmit}>
        <input
          className="admin-users-input"
          type="search"
          dir="auto"
          autoComplete="off"
          aria-label={copy.usersSearch}
          placeholder={copy.usersSearch}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <PillButton variant="primary" type="submit" disabled={admin.isSearching}>
          {copy.usersSearchButton}
        </PillButton>
      </form>

      {admin.searchError && (
        <p className="admin-users-error" role="alert">
          {admin.searchError}
        </p>
      )}
      {admin.users?.length === 0 && <p className="admin-users-empty">{copy.usersNone}</p>}
      {admin.users && admin.users.length > 0 && (
        <ul className="admin-users-list">
          {admin.users.map((user) => {
            const isBusy = admin.busyId === user.id;
            return (
              <li key={user.id} className="admin-users-row">
                <div className="admin-users-who">
                  <bdi className="admin-users-name">{user.name}</bdi>
                  <bdi className="admin-users-email" dir="ltr">
                    {user.email}
                  </bdi>
                  <div className="admin-users-tags">
                    {user.roles.map((role) => (
                      <Tag key={role} tone="quiet">
                        {copy.roles[role]}
                      </Tag>
                    ))}
                    {user.isTestAccount && <Tag tone="accent">{copy.usersTestAccount}</Tag>}
                  </div>
                </div>
                <div className="admin-users-actions">
                  {!user.roles.includes('admin') && (
                    <PillButton size="sm" disabled={isBusy} onClick={() => admin.resetLink(user)}>
                      {copy.userResetButton}
                    </PillButton>
                  )}
                  {user.isTestAccount && (
                    <PillButton size="sm" disabled={isBusy} onClick={() => admin.editEmail(user)}>
                      {copy.changeEmail}
                    </PillButton>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {admin.actionError && (
        <p className="admin-users-error" role="alert">
          {admin.actionError}
        </p>
      )}

      <SideSheet
        isOpen={admin.link !== null}
        onClose={admin.closeLink}
        title={admin.link?.user.name ?? ''}
        footer={
          <PillButton variant="dark" onClick={admin.closeLink}>
            {copy.done}
          </PillButton>
        }
      >
        {admin.link && <PasswordLink result={admin.link} />}
      </SideSheet>

      <ChangeEmailSheet user={admin.toEdit} onClose={admin.closeEdit} onSave={admin.saveEmail} />
    </section>
  );
}
