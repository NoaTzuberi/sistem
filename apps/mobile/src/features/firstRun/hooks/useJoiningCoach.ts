import { useEffect, useState } from 'react';
import { listMyCoachings } from '../../../services/coachings/coachingsService';
import { previewJoin } from '../../../services/invites/joinService';
import { getPendingInvite } from '../../../services/invites/pendingInvite';

/**
 * The coach she is joining, for the banner and the questionnaire's intro line: signed out → the code
 * she opened (kept on the device through the sign-up); signed in → her current coaching. null = none.
 */
export function useJoiningCoach(signedIn: boolean): string | null {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    const pending = signedIn ? null : getPendingInvite();
    const load = signedIn
      ? listMyCoachings().then((coachings) => coachings[0]?.coachName ?? null)
      : pending
        ? previewJoin(pending).then((preview) => (preview.type === 'coaching' ? preview.coachName : null))
        : Promise.resolve(null);
    load
      .then((loaded) => isCurrent && setName(loaded || null))
      .catch(() => isCurrent && setName(null));
    return () => {
      isCurrent = false;
    };
  }, [signedIn]);

  return name;
}
