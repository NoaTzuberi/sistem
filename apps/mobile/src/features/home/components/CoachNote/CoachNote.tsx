import { IconUser } from '@tabler/icons-react';
import { formatTimeAgo, useCopy, useLanguage } from '@sistem/shared';
import { homeCopy } from '../../copy';
import { type QuickReply, QuickReplies } from '../QuickReplies/QuickReplies';
import './CoachNote.css';

interface CoachNoteProps {
  /** Her coach's latest text (plain, line breaks kept); null = only an update to show. */
  message: string | null;
  /** ISO of the newest of the two. */
  at: string;
  /** Server time (ms) — "an hour ago" never reads the device clock. */
  nowMs: number;
  replies: QuickReply[];
}

/**
 * The coach's note as plain text, not a bubble. Her name / photo are not sent to trainees yet,
 * so the avatar is an icon (see the report).
 */
export function CoachNote({ message, at, nowMs, replies }: CoachNoteProps) {
  const copy = useCopy(homeCopy);
  const language = useLanguage();
  return (
    <div className="coach-note">
      <span className="coach-note-avatar" aria-hidden="true">
        <IconUser size={20} stroke={2} />
      </span>
      <div className="coach-note-body">
        <p className="coach-note-head">
          <span className="coach-note-name">{copy.coach.title}</span>
          <time className="coach-note-time" dateTime={at}>
            {formatTimeAgo(at, nowMs, language)}
          </time>
        </p>
        {message && (
          <p className="coach-note-text" dir="auto">
            {message}
          </p>
        )}
        <QuickReplies replies={replies} />
      </div>
    </div>
  );
}
