import { useState } from 'react';
import type { AdminUser, AdminUserResetLinkResponse } from '@sistem/types';
import { useCopy } from '@sistem/shared';
import { changeUserEmail, createUserResetLink, searchUsers } from '../../../services/admin/adminService';
import { adminCopy } from '../copy';

const MIN_QUERY_LENGTH = 2;

/**
 * The admin's account search and its actions: a one-time reset link (kept only in this state, gone when
 * the sheet closes) and a new email for a test account.
 */
export function useAdminUsers() {
  const copy = useCopy(adminCopy);
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string>();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string>();
  const [link, setLink] = useState<AdminUserResetLinkResponse | null>(null);
  const [toEdit, setToEdit] = useState<AdminUser | null>(null);

  async function search(query: string) {
    const text = query.trim();
    setActionError(undefined);
    if (text.length < MIN_QUERY_LENGTH) {
      setSearchError(copy.usersSearchShort);
      return;
    }
    setSearchError(undefined);
    setIsSearching(true);
    try {
      setUsers(await searchUsers(text));
    } catch {
      setSearchError(copy.usersLoadError);
    } finally {
      setIsSearching(false);
    }
  }

  async function resetLink(user: AdminUser) {
    setBusyId(user.id);
    setActionError(undefined);
    try {
      setLink(await createUserResetLink(user.id));
    } catch (error) {
      setActionError((error instanceof Error && error.message) || copy.actionError);
    } finally {
      setBusyId(null);
    }
  }

  /** Throws the server's message for the sheet to show. */
  async function saveEmail(user: AdminUser, email: string) {
    const updated = await changeUserEmail(user.id, email);
    setUsers((current) => current?.map((entry) => (entry.id === updated.id ? updated : entry)) ?? null);
    setToEdit(null);
  }

  return {
    users,
    isSearching,
    searchError,
    search,
    busyId,
    actionError,
    link,
    closeLink: () => setLink(null),
    resetLink,
    toEdit,
    editEmail: setToEdit,
    closeEdit: () => setToEdit(null),
    saveEmail,
  };
}
