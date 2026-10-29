import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatMessage, MessagePage, MessageSender } from '@sistem/types';
import { mergeMessages } from '../data/threadMessages';

const POLL_MS = 15_000;

export interface ThreadSource<TPage extends MessagePage> {
  /** A page, newest first (no `before` = the newest). */
  load: (before?: string | null) => Promise<TPage>;
  send: (text: string) => Promise<ChatMessage>;
  /** The other side's messages become read. */
  markRead: () => Promise<unknown>;
  /** Who "me" is in this thread. */
  me: MessageSender;
}

/**
 * One conversation: the newest page, older pages on demand, sending, and read marks. No push yet
 * (Phase 5b): it refetches the newest page every 15 s while the screen is visible and on focus.
 */
export function useThread<TPage extends MessagePage>(source: ThreadSource<TPage>) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [first, setFirst] = useState<TPage>();
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState(false);
  const sourceRef = useRef(source);
  sourceRef.current = source;
  const hasOlderLoaded = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const page = await sourceRef.current.load();
      setFirst(page);
      setMessages((current) => mergeMessages(current, page.items));
      // Older pages already loaded keep their own cursor.
      if (!hasOlderLoaded.current) setNextBefore(page.nextBefore);
      setLoadError(false);
      const me = sourceRef.current.me;
      if (page.items.some((message) => message.sender !== me && message.readAt === null)) {
        await sourceRef.current.markRead().catch(() => undefined);
      }
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, POLL_MS);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [refresh]);

  const loadOlder = useCallback(async () => {
    if (!nextBefore) return;
    setIsLoadingOlder(true);
    try {
      const page = await sourceRef.current.load(nextBefore);
      hasOlderLoaded.current = true;
      setMessages((current) => mergeMessages(current, page.items));
      setNextBefore(page.nextBefore);
    } catch {
      setLoadError(true);
    } finally {
      setIsLoadingOlder(false);
    }
  }, [nextBefore]);

  /** True when it was sent (the composer clears). */
  const send = useCallback(async (text: string): Promise<boolean> => {
    setIsSending(true);
    setSendError(false);
    try {
      const message = await sourceRef.current.send(text);
      setMessages((current) => mergeMessages(current, [message]));
      return true;
    } catch {
      setSendError(true);
      return false;
    } finally {
      setIsSending(false);
    }
  }, []);

  return { first, messages, isLoading, loadError, hasOlder: nextBefore !== null, isLoadingOlder, loadOlder, send, isSending, sendError, reload: refresh };
}
