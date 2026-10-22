import { useCallback, useState } from 'react';
import type { AdminCoach, CoachPasswordLinkResponse } from '@sistem/types';
import { useCopy, useLoad } from '@sistem/shared';
import { createCoach, listCoaches, resendPasswordLink, setCoachStatus } from '../../../services/admin/adminService';
import { adminCopy } from '../copy';

/** The admin's coach list and its actions (create, new password link, pause / reactivate). */
export function useAdminCoaches() {
  const copy = useCopy(adminCopy);
  const load = useCallback(() => listCoaches(), []);
  const { data: coaches, error, isLoading, reload } = useLoad(load, copy.loadError);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string>();
  const [link, setLink] = useState<CoachPasswordLinkResponse | null>(null);
  const [toSuspend, setToSuspend] = useState<AdminCoach | null>(null);

  async function run(coachId: string, action: () => Promise<void>) {
    setBusyId(coachId);
    setActionError(undefined);
    try {
      await action();
      reload();
    } catch {
      setActionError(copy.actionError);
    } finally {
      setBusyId(null);
    }
  }

  async function create(name: string, email: string): Promise<CoachPasswordLinkResponse> {
    const result = await createCoach({ name, email });
    reload();
    return result;
  }

  const newLink = (coach: AdminCoach) => run(coach.id, async () => setLink(await resendPasswordLink(coach.id)));
  const reactivate = (coach: AdminCoach) => run(coach.id, async () => void (await setCoachStatus(coach.id, 'active')));
  const confirmSuspend = () => {
    if (!toSuspend) return;
    const coach = toSuspend;
    setToSuspend(null);
    void run(coach.id, async () => void (await setCoachStatus(coach.id, 'suspended')));
  };

  return {
    coaches: coaches ?? [],
    error,
    isLoading,
    reload,
    busyId,
    actionError,
    link,
    closeLink: () => setLink(null),
    create,
    newLink,
    reactivate,
    toSuspend,
    askSuspend: setToSuspend,
    confirmSuspend,
    cancelSuspend: () => setToSuspend(null),
  };
}
