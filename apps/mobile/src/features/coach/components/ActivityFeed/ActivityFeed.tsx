import type { CoachActivityItem, CoachTraineeSummary } from '@sistem/types';
import { fill, formatDateOnly, formatTimeAgo, useCopy, useLanguage, weekdayName } from '@sistem/shared';
import { Button } from '../../../../components/common/Button/Button';
import { Eyebrow } from '../../../../components/common/Eyebrow/Eyebrow';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { appCopy } from '../../../../copy';
import { coachCopy } from '../../copy';
import { attentionSentence, describeActivity, groupByDay } from '../../data/activityDisplay';
import { dayMonthOf, localDateOf, timeOf } from '../../data/coachMode';
import { ActivityItem } from '../ActivityItem/ActivityItem';
import './ActivityFeed.css';

interface ActivityFeedProps {
  items: CoachActivityItem[];
  /** Trainees who need attention now: amber cards at the top of today. */
  attention: CoachTraineeSummary[];
  /** The coach's zone: days and times are hers. */
  timezone: string;
  /** Server time (ms). */
  nowMs: number;
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMoreError: boolean;
  onLoadMore: () => void;
}

/** The Today feed, grouped by day ("היום" / "אתמול" / a date), newest first. */
export function ActivityFeed(props: ActivityFeedProps) {
  const { items, attention, timezone, nowMs, hasMore, isLoadingMore, loadMoreError, onLoadMore } = props;
  const copy = useCopy(coachCopy);
  const eyebrow = useCopy(appCopy).eyebrow;
  const language = useLanguage();
  const today = localDateOf(nowMs, timezone);
  const yesterday = localDateOf(nowMs - 24 * 60 * 60 * 1000, timezone);

  const days = groupByDay(items, timezone);
  if (attention.length > 0 && days[0]?.date !== today) days.unshift({ date: today, items: [] });

  function dayLabel(date: string): { eyebrow: string; label: string } {
    if (date === today) return { eyebrow: eyebrow.today, label: copy.today.feedToday };
    if (date === yesterday) return { eyebrow: eyebrow.yesterday, label: copy.today.feedYesterday };
    return { eyebrow: dayMonthOf(date), label: formatDateOnly(date, language) };
  }

  return (
    <div className="activity-feed">
      {days.map((day) => {
        const head = dayLabel(day.date);
        return (
          <section key={day.date} className="activity-feed-day" aria-labelledby={`feed-day-${day.date}`}>
            <h2 className="activity-feed-day-title" id={`feed-day-${day.date}`}>
              <Eyebrow keepInEnglish={head.eyebrow === dayMonthOf(day.date)}>{head.eyebrow}</Eyebrow>
              {head.label}
            </h2>
            {day.date === today &&
              attention.map((trainee) => (
                <ActivityItem
                  key={`attention:${trainee.id}`}
                  trainee={trainee}
                  kind={null}
                  alert
                  sentence={attentionSentence(trainee, copy, language) ?? ''}
                  time={
                    trainee.lastCompletedAt
                      ? fill(copy.feed.lastWorkout, {
                          date: `${weekdayName(new Date(`${localDateOf(trainee.lastCompletedAt, timezone)}T00:00:00Z`).getUTCDay(), language, 'short')} ${dayMonthOf(localDateOf(trainee.lastCompletedAt, timezone))}`,
                        })
                      : ''
                  }
                  tab="overview"
                />
              ))}
            {day.items.map((item) => {
              const view = describeActivity(item, copy, language);
              return (
                <ActivityItem
                  key={item.id}
                  trainee={item.trainee}
                  kind={view.kind}
                  sentence={view.sentence}
                  at={item.at}
                  time={day.date === today ? formatTimeAgo(item.at, nowMs, language) : timeOf(item.at, timezone, language)}
                  chips={view.chips}
                  photos={view.photos}
                  tab={view.tab}
                  cta={view.questionnaireCta ? { label: copy.feed.viewQuestionnaire, tab: 'body' } : undefined}
                />
              );
            })}
          </section>
        );
      })}

      {loadMoreError && <StateMessage onRetry={onLoadMore}>{copy.today.loadMoreError}</StateMessage>}
      {hasMore && !loadMoreError && (
        <Button variant="secondary" className="activity-feed-more" loading={isLoadingMore} onClick={onLoadMore}>
          {copy.today.loadMore}
        </Button>
      )}
    </div>
  );
}
