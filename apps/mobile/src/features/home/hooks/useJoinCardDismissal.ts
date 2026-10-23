import { useState } from 'react';

// "Have a coach? Enter a code" on a self-guided Home: once dismissed it stays away on this device
// (a per-viewer convenience — storage can be blocked; then it simply shows again next time).

const key = (userId: string) => `sistem.joinCoachCardDismissed.${userId}`;

function readDismissed(userId: string | undefined): boolean {
  if (!userId) return false;
  try {
    return localStorage.getItem(key(userId)) === 'true';
  } catch {
    return false;
  }
}

export function useJoinCardDismissal(userId: string | undefined) {
  const [dismissedFor, setDismissedFor] = useState<string | undefined>(() => (readDismissed(userId) ? userId : undefined));
  const isDismissed = userId !== undefined && (dismissedFor === userId || readDismissed(userId));

  function dismiss() {
    if (!userId) return;
    try {
      localStorage.setItem(key(userId), 'true');
    } catch {
      // Dismissed for this visit only.
    }
    setDismissedFor(userId);
  }

  return { isDismissed, dismiss };
}
