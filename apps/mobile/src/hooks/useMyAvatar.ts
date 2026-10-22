import { useRef } from 'react';
import { useAuth } from '../services/auth/AuthContext';
import { fetchAvatar } from '../services/users/usersService';

// A fresh link is fetched at most this often — a photo that keeps failing never loops.
const REFRESH_GAP_MS = 60_000;

/**
 * Her profile photo's signed link (from her account), and `refreshExpired` for when it stopped
 * working: it fetches a fresh link and updates the account, so every avatar follows.
 */
export function useMyAvatar() {
  const { user, updateUser } = useAuth();
  const lastRefresh = useRef(0);

  function refreshExpired() {
    if (!user?.avatar || Date.now() - lastRefresh.current < REFRESH_GAP_MS) return;
    lastRefresh.current = Date.now();
    fetchAvatar()
      .then((avatar) => updateUser({ avatar }))
      .catch(() => {
        // The initials stay; the next app start brings a fresh link.
      });
  }

  return { url: user?.avatar?.url ?? null, hasAvatar: Boolean(user?.avatar), refreshExpired };
}
