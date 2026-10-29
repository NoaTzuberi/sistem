import { Link } from 'react-router-dom';
import type { CoachReaction } from '@sistem/types';
import { fill, formatTimeAgo, useCopy, useLanguage } from '@sistem/shared';
import { workoutLogPath } from '../../../../app/config/routes';
import { messagesCopy } from '../../copy';
import { REACTION_EMOJI } from '../../data/reactionEmoji';
import './CoachReactionNotice.css';

const ON: Record<CoachReaction['targetType'], 'workout' | 'pump' | 'meal' | 'progress'> = {
  workout_log: 'workout',
  cardio_log: 'workout',
  pump_photo: 'pump',
  meal_photos: 'meal',
  progress_photos: 'progress',
};

/** "שקד הגיבה 🔥 על Full Body B" — one small line in Home's coach area; a workout's opens its log. */
export function CoachReactionNotice({ reaction, nowMs }: { reaction: CoachReaction; nowMs: number }) {
  const copy = useCopy(messagesCopy);
  const language = useLanguage();
  const line = fill(copy.reactionOn[ON[reaction.targetType]], {
    coach: reaction.coachName,
    emoji: REACTION_EMOJI[reaction.reaction],
    title: reaction.workoutTitle ?? '',
  });
  const body = (
    <>
      <span className={'cr-notice-text' + (reaction.seen ? '' : ' cr-notice-new')} dir="auto">
        {line}
      </span>
      <time className="cr-notice-time" dateTime={reaction.at}>
        {formatTimeAgo(reaction.at, nowMs, language)}
      </time>
    </>
  );
  return reaction.logId ? (
    <Link className="cr-notice" to={workoutLogPath(reaction.logId)}>
      {body}
    </Link>
  ) : (
    <p className="cr-notice">{body}</p>
  );
}
