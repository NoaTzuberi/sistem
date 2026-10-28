import { sharedCopy, useCopy, useLoad } from '@sistem/shared';
import { listArchive } from '../../../services/coach/coachService';

/** Her ended coachings (the list's "archive" filter). Loaded with the list so the chip shows its count. */
export function useCoachArchive() {
  const copy = useCopy(sharedCopy).coach.archive;
  return useLoad(listArchive, copy.loadError);
}
