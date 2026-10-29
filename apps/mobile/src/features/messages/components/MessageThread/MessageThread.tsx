import { useEffect, useRef } from 'react';
import type { ChatMessage, MessageSender } from '@sistem/types';
import { useCopy, useLanguage } from '@sistem/shared';
import { Button } from '../../../../components/common/Button/Button';
import { messagesCopy } from '../../copy';
import { messageTimeOf } from '../../data/messageTime';
import './MessageThread.css';

interface MessageThreadProps {
  messages: ChatMessage[];
  me: MessageSender;
  /** Zone for the times (the viewer's). */
  timezone: string;
  hasOlder: boolean;
  isLoadingOlder: boolean;
  onLoadOlder: () => void;
  /** Who the other side is (screen reader name of her bubbles). */
  otherName: string;
}

/** The bubbles, oldest at the top. Mine sit at the end side in ink; hers at the start side on white. */
export function MessageThread({ messages, me, timezone, hasOlder, isLoadingOlder, onLoadOlder, otherName }: MessageThreadProps) {
  const copy = useCopy(messagesCopy);
  const language = useLanguage();
  const endRef = useRef<HTMLDivElement>(null);
  const newestId = messages.at(-1)?.id;

  // A new newest message (sent or received) scrolls into view; older pages loading above don't.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [newestId]);

  const lastMine = [...messages].reverse().find((message) => message.sender === me);

  return (
    <div className="cm-thread">
      {hasOlder && (
        <Button variant="secondary" className="cm-thread-older" loading={isLoadingOlder} onClick={onLoadOlder}>
          {copy.older}
        </Button>
      )}
      {messages.length === 0 && <p className="cm-thread-empty">{copy.empty}</p>}
      <ol className="cm-thread-list" aria-label={copy.threadLabel}>
        {messages.map((message) => {
          const isMine = message.sender === me;
          return (
            <li key={message.id} className={'cm-bubble-row' + (isMine ? ' cm-bubble-row-mine' : '')}>
              <div className={'cm-bubble' + (isMine ? ' cm-bubble-mine' : '')}>
                <span className="cm-bubble-who">{isMine ? copy.mine : otherName}: </span>
                <p className="cm-bubble-text" dir="auto">
                  {message.text}
                </p>
                <time className="cm-bubble-time" dateTime={message.createdAt}>
                  {messageTimeOf(message.createdAt, timezone, language)}
                  {isMine && message.id === lastMine?.id && message.readAt && ` · ${copy.read}`}
                </time>
              </div>
            </li>
          );
        })}
      </ol>
      <div ref={endRef} />
    </div>
  );
}
