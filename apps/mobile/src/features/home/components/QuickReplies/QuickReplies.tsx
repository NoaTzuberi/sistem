import type { ReactNode } from 'react';
import './QuickReplies.css';

export interface QuickReply {
  id: string;
  label: string;
  icon?: ReactNode;
  /** The pink-soft chip (an update to open), else neutral. */
  accent?: boolean;
  /** Sending / already sent: shown, not pressable. */
  disabled?: boolean;
  onSelect: () => void;
}

interface QuickRepliesProps {
  replies: QuickReply[];
}

/** Chips under the coach's note. Only replies whose action exists are passed in. */
export function QuickReplies({ replies }: QuickRepliesProps) {
  if (replies.length === 0) return null;
  return (
    <div className="quick-replies">
      {replies.map((reply) => (
        <button
          key={reply.id}
          type="button"
          className={'quick-reply' + (reply.accent ? ' quick-reply-accent' : '')}
          disabled={reply.disabled}
          onClick={reply.onSelect}
        >
          {reply.icon}
          <bdi aria-live="polite">{reply.label}</bdi>
        </button>
      ))}
    </div>
  );
}
