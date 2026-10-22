import { useId } from 'react';
import { IconUser } from '@tabler/icons-react';
import { formatTimeAgo, useCopy, useLanguage } from '@sistem/shared';
import { nameScript } from '../../../workouts/data/weekPlanDisplay';
import { initialsOf } from '../../data/homeDisplay';
import { useTextClamp } from '../../hooks/useTextClamp';
import { homeCopy } from '../../copy';
import { type QuickReply, QuickReplies } from '../QuickReplies/QuickReplies';
import './CoachNote.css';

interface CoachNoteProps {
  /** Her coach's name (initials + name); null = not known (an icon instead, no name). */
  coachName: string | null;
  /** Her coach's latest text (plain, line breaks kept); null = only an update to show. */
  message: string | null;
  /** ISO of the newest of the two. */
  at: string;
  /** Server time (ms) — "an hour ago" never reads the device clock. */
  nowMs: number;
  /** Something here she hasn't read yet: the pink dot on the avatar. */
  unread: boolean;
  replies: QuickReply[];
}

/**
 * The coach's note as plain text, not a bubble: ink avatar with her initials, her name + time,
 * the message (4 whole lines, then "more"), and the quick-reply chips. The section head ("COACH ·
 * From your coach") is Home's.
 */
export function CoachNote({ coachName, message, at, nowMs, unread, replies }: CoachNoteProps) {
  const copy = useCopy(homeCopy);
  const language = useLanguage();
  const textId = useId();
  const clamp = useTextClamp<HTMLParagraphElement>(message);
  const name = coachName?.trim() || null;

  return (
    <div className="coach-note">
      <span className={'coach-note-avatar' + (unread ? ' coach-note-avatar-unread' : '')} aria-hidden="true">
        {name ? <bdi>{initialsOf(name)}</bdi> : <IconUser size={20} stroke={2} />}
      </span>
      <div className="coach-note-body">
        <p className="coach-note-head">
          {name && (
            <bdi className="coach-note-name display-name" {...nameScript(name)}>
              {name}
            </bdi>
          )}
          <time className="coach-note-time" dateTime={at}>
            {formatTimeAgo(at, nowMs, language)}
          </time>
        </p>
        {message && (
          <>
            <p
              ref={clamp.ref}
              id={textId}
              className={'coach-note-text' + (clamp.isExpanded ? '' : ' coach-note-text-clamped')}
              dir="auto"
            >
              {message}
            </p>
            {(clamp.canExpand || clamp.isExpanded) && (
              <button type="button" className="coach-note-more" aria-expanded={clamp.isExpanded} aria-controls={textId} onClick={clamp.toggle}>
                {clamp.isExpanded ? copy.coach.less : copy.coach.more}
              </button>
            )}
          </>
        )}
        <QuickReplies replies={replies} />
      </div>
    </div>
  );
}
