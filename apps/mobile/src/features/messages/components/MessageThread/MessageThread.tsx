import { Fragment, useEffect, useRef } from 'react';
import type { ChatMessage, MessageSender } from '@sistem/types';
import { useCopy, useLanguage } from '@sistem/shared';
import { Button } from '../../../../components/common/Button/Button';
import { CoachAvatar } from '../../../coach/components/CoachAvatar/CoachAvatar';
import { messagesCopy } from '../../copy';
import { messageClock, messageDayKey, messageDayLabel } from '../../data/messageTime';
import './MessageThread.css';

/** The other side of the conversation: her name and avatar next to her bubbles. */
export interface ThreadPerson {
  name: string;
  /** Her id: keeps her avatar color the same on every screen. */
  seed: string;
  avatarUrl?: string | null;
}

interface MessageThreadProps {
  messages: ChatMessage[];
  me: MessageSender;
  /** Zone for the times and the day separators (the viewer's). */
  timezone: string;
  hasOlder: boolean;
  isLoadingOlder: boolean;
  onLoadOlder: () => void;
  other: ThreadPerson;
}

/**
 * The bubbles, oldest at the top, under a pill for each day. Mine sit at the end side in deep pink; hers at the
 * start side on white, her avatar beside the last bubble of each run.
 */
export function MessageThread({ messages, me, timezone, hasOlder, isLoadingOlder, onLoadOlder, other }: MessageThreadProps) {
  const copy = useCopy(messagesCopy);
  const language = useLanguage();
  const endRef = useRef<HTMLDivElement>(null);
  const newestId = messages.at(-1)?.id;

  // A new newest message (sent or received) scrolls into view; older pages loading above don't.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [newestId]);

  if (messages.length === 0) {
    return (
      <div className="cm-thread-empty-state">
        {other.name && <CoachAvatar name={other.name} seed={other.seed} photoUrl={other.avatarUrl} size="xl" />}
        {other.name && (
          <p className="cm-empty-name display-title">
            <bdi>{other.name}</bdi>
          </p>
        )}
        <p className="cm-thread-empty">{copy.empty}</p>
      </div>
    );
  }

  const lastMine = [...messages].reverse().find((message) => message.sender === me);
  const dayOf = (message: ChatMessage) => messageDayKey(Date.parse(message.createdAt), timezone, language);

  return (
    <div className="cm-thread">
      {hasOlder && (
        <Button variant="secondary" className="cm-thread-older" loading={isLoadingOlder} onClick={onLoadOlder}>
          {copy.older}
        </Button>
      )}
      <ol className="cm-thread-list" aria-label={copy.threadLabel}>
        {messages.map((message, index) => {
          const isMine = message.sender === me;
          const previous = messages[index - 1];
          const following = messages[index + 1];
          const startsDay = !previous || dayOf(previous) !== dayOf(message);
          // Her avatar marks the end of a run of her bubbles (a new day starts a new run).
          const endsRun = !following || following.sender !== message.sender || dayOf(following) !== dayOf(message);
          return (
            <Fragment key={message.id}>
              {startsDay && (
                <li className="cm-day">
                  <span>{messageDayLabel(message.createdAt, timezone, language, copy)}</span>
                </li>
              )}
              <li className={'cm-bubble-row' + (isMine ? ' cm-bubble-row-mine' : '')}>
                {!isMine &&
                  (endsRun ? (
                    <CoachAvatar name={other.name} seed={other.seed} photoUrl={other.avatarUrl} />
                  ) : (
                    <span className="cm-bubble-avatar-space" aria-hidden="true" />
                  ))}
                <div className={'cm-bubble' + (isMine ? ' cm-bubble-mine' : '')}>
                  <span className="cm-bubble-who">{isMine ? copy.mine : other.name}: </span>
                  <p className="cm-bubble-text" dir="auto">
                    {message.text}
                  </p>
                  <time className="cm-bubble-time" dateTime={message.createdAt}>
                    {messageClock(message.createdAt, timezone, language)}
                    {isMine && message.id === lastMine?.id && message.readAt && ` · ${copy.read}`}
                  </time>
                </div>
              </li>
            </Fragment>
          );
        })}
      </ol>
      <div ref={endRef} />
    </div>
  );
}
