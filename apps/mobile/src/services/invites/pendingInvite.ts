// The /join code she opened before signing up / in: kept on the device so it survives the trip
// through the sign-up or login screen. A convenience only — storage can be blocked (private mode).

const KEY = 'sistem.pendingInvite';

export function getPendingInvite(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setPendingInvite(code: string): void {
  try {
    localStorage.setItem(KEY, code);
  } catch {
    // Storage blocked: she can open the link again after signing up.
  }
}

export function clearPendingInvite(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing stored.
  }
}
