import { useCallback, useState } from 'react';
import { useCopy, useLoad } from '@sistem/shared';
import { createPersonalInvite, getInvites, regenerateInvite, revokeInvite } from '../../../services/invites/invitesService';
import { invitesCopy } from '../copy';

/** Her links: the permanent coaching link and the open personal ones; loads only while the sheet is open. */
export function useInvites(isOpen: boolean) {
  const copy = useCopy(invitesCopy);
  const load = useCallback(() => (isOpen ? getInvites() : Promise.resolve(null)), [isOpen]);
  const { data, error, isLoading, reload } = useLoad(load, copy.loadError);
  const [isBusy, setIsBusy] = useState(false);
  const [actionError, setActionError] = useState<string>();

  async function run<T>(action: () => Promise<T>): Promise<T | undefined> {
    setIsBusy(true);
    setActionError(undefined);
    try {
      const result = await action();
      reload();
      return result;
    } catch (failure) {
      setActionError((failure instanceof Error && failure.message) || copy.actionError);
      return undefined;
    } finally {
      setIsBusy(false);
    }
  }

  return {
    permanent: data?.permanent ?? null,
    personal: data?.personal ?? [],
    error,
    isLoading,
    reload,
    isBusy,
    actionError,
    createPersonal: (email: string) => run(() => createPersonalInvite(email.trim() || undefined)),
    regenerate: () => run(() => regenerateInvite('coaching')),
    revoke: (inviteId: string) => run(() => revokeInvite(inviteId)),
  };
}
