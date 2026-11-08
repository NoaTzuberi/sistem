import type { CoachStats } from '@sistem/types';
import { describeCoachNotification, formatTimeAgo, prCountLabel, sharedCopy, useCopy, useLanguage } from '@sistem/shared';
import { Avatar } from '../../../../components/common/Avatar/Avatar';
import { StateLine } from '../../../../components/common/StateLine/StateLine';
import { Tag } from '../../../../components/common/Tag/Tag';
import { WidgetCard } from '../../../../components/common/WidgetCard/WidgetCard';
import { overviewCopy } from '../../copy';
import { useRecentActivity } from '../../hooks/useRecentActivity';
import './ActivityFeed.css';

interface ActivityFeedProps {
  /** Which finished workouts set personal records (the pink PR tag). */
  recentPrs: CoachStats['recentPrs'] | undefined;
  /** The server's clock. */
  nowMs: number;
  onOpen: (traineeId: string) => void;
  className?: string;
}

const MAX_ROWS = 5;

/**
 * Recent activity = the coach's existing notifications, in their existing wording (new trainee,
 * workout finished). A finished workout that set personal records gets a pink tag.
 */
export function ActivityFeed({ recentPrs, nowMs, onOpen, className }: ActivityFeedProps) {
  const language = useLanguage();
  const shared = useCopy(sharedCopy);
  const copy = useCopy(overviewCopy);
  const { items, hasError, reload } = useRecentActivity();

  const rows = (items ?? [])
    .flatMap((notification) => {
      const described = describeCoachNotification(notification, language);
      if (!described) return [];
      const logId = notification.type === 'workout_completed' ? notification.data.logId : null;
      const name = 'traineeName' in notification.data ? notification.data.traineeName : '';
      return [{ notification, described, name, prCount: recentPrs?.find((entry) => entry.logId === logId)?.prCount ?? 0 }];
    })
    .slice(0, MAX_ROWS);

  return (
    <WidgetCard className={className} title={copy.activity.title} subtitle={copy.activity.subtitle} tourId="activity">
      {!items && !hasError && <StateLine />}
      {hasError && !items && <StateLine error={shared.coach.inbox.bellLoadError} onRetry={reload} />}
      {items && rows.length === 0 && <p className="activity-empty">{shared.coach.inbox.empty}</p>}

      <ul className="activity-list">
        {rows.map(({ notification, described, name, prCount }) => (
          <li key={notification.id}>
            <button className="activity-row" type="button" aria-haspopup="dialog" onClick={() => onOpen(described.traineeId)}>
              <Avatar name={name} seed={described.traineeId} />
              <span className="activity-body">
                <span className="activity-text">{described.text}</span>
                <span className="activity-time">{formatTimeAgo(notification.createdAt, nowMs, language)}</span>
              </span>
              {prCount > 0 && <Tag tone="accent">{prCountLabel(prCount, language)}</Tag>}
            </button>
          </li>
        ))}
      </ul>
    </WidgetCard>
  );
}
