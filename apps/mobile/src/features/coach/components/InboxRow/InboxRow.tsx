import type { ReactNode } from 'react';
import { IconCalendar, IconCheck, IconHeart, IconUser } from '@tabler/icons-react';
import type { CoachNotificationIcon } from '@sistem/shared';
import type { InboxRow as InboxRowData } from '../../hooks/useCoachInbox';
import './InboxRow.css';

const ICONS: Record<CoachNotificationIcon, ReactNode> = {
  person: <IconUser size={20} stroke={2} />,
  heart: <IconHeart size={20} stroke={2} />,
  calendar: <IconCalendar size={20} stroke={2} />,
  check: <IconCheck size={20} stroke={2.4} />,
};

interface InboxRowProps {
  row: InboxRowData;
  /** Read by screen readers after the title of an unread row (sighted users get the dot). */
  unreadLabel: string;
  onOpen: (row: InboxRowData) => void;
}

/** One notification, as in the dashboard bell: the type's icon on its soft tint, bold title, one sub line, time, pink dot. */
export function InboxRow({ row, unreadLabel, onOpen }: InboxRowProps) {
  return (
    <li>
      <button type="button" className={`inbox-row inbox-row-${row.view.tone}${row.isUnread ? ' inbox-row-unread' : ''}`} onClick={() => onOpen(row)}>
        <span className="inbox-row-icon" aria-hidden="true">
          {ICONS[row.view.icon]}
        </span>
        <span className="inbox-row-text">
          <span className="inbox-row-head">
            {/* Names inside the sentence are already isolated (their own direction). */}
            <span className="inbox-row-title">
              {row.view.text}
              {row.isUnread && <span className="inbox-row-sr">{unreadLabel}</span>}
            </span>
            <span className="inbox-row-time">{row.time}</span>
          </span>
          {row.sub && <span className="inbox-row-sub">{row.sub}</span>}
        </span>
        {row.isUnread && <span className="inbox-row-dot" aria-hidden="true" />}
      </button>
    </li>
  );
}
