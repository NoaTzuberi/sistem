import { useCallback, useEffect, useState } from 'react';
import type { ChatMessage, CoachReaction } from '@sistem/types';
import { getMyThread, listMyReactions, markMyReactionsSeen } from '../../../services/messages/messagesService';

/**
 * Home's coach area, trainee side: her coach's newest message (the thread's newest page, one row) and
 * the newest reaction of the last two weeks. Both optional: a failed call just hides them. Refetched on
 * focus (no push yet). A new reaction is marked seen once Home showed it (its dot is drawn this time).
 */
export function useCoachConnect(enabled: boolean) {
  const [latestMessage, setLatestMessage] = useState<ChatMessage | null>(null);
  const [unread, setUnread] = useState(0);
  const [reaction, setReaction] = useState<CoachReaction | null>(null);

  const load = useCallback(async () => {
    const [thread, reactions] = await Promise.allSettled([getMyThread(null, 1), listMyReactions()]);
    if (thread.status === 'fulfilled') {
      setLatestMessage(thread.value.items.find((message) => message.sender === 'coach') ?? null);
      setUnread(thread.value.unread);
    }
    if (reactions.status === 'fulfilled') {
      const newest = reactions.value.items[0] ?? null;
      setReaction(newest);
      if (newest && !newest.seen) void markMyReactionsSeen().catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void load();
    window.addEventListener('focus', load);
    return () => window.removeEventListener('focus', load);
  }, [enabled, load]);

  return { latestMessage, unread, reaction };
}
