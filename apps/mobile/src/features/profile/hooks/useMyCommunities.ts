import { useCallback } from 'react';
import type { MyCommunity } from '@sistem/types';
import { useLoad } from '@sistem/shared';
import { listMyCommunities } from '../../../services/coachings/coachingsService';

/** Her communities for the Profile hero chips. Optional: a failed load just hides the block. */
export function useMyCommunities(): MyCommunity[] {
  const load = useCallback(() => listMyCommunities(), []);
  return useLoad(load, '').data ?? [];
}
