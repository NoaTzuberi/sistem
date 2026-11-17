import { Link } from 'react-router-dom';
import type { CoachActivityItem } from '@sistem/types';
import { formatTimeAgo, useCopy, useLanguage } from '@sistem/shared';
import { ROUTES, coachTraineePath } from '../../../../app/config/routes';
import { coachCopy } from '../../copy';
import { describeActivity } from '../../data/activityDisplay';
import { CoachAvatar } from '../CoachAvatar/CoachAvatar';
import { NameInSentence } from '../NameInSentence/NameInSentence';
import { TodaySection } from '../TodaySection/TodaySection';
import './RecentActivity.css';

/** How many rows Today shows; the full feed (photos, reactions) is on "כל הפעילות". */
export const RECENT_ACTIVITY_ROWS = 4;

/** "פעילות אחרונה": one line per item — who did what, and when; a tap opens her screen. */
export function RecentActivity({ items, nowMs }: { items: CoachActivityItem[]; nowMs: number }) {
  const copy = useCopy(coachCopy);
  const language = useLanguage();
  return (
    <TodaySection title={copy.today.recentTitle} link={{ label: copy.today.allActivity, to: ROUTES.COACH_ACTIVITY }}>
      {items.slice(0, RECENT_ACTIVITY_ROWS).map((item) => {
        const view = describeActivity(item, copy, language);
        return (
          <li key={item.id}>
            <Link className="recent-row" to={coachTraineePath(item.trainee.id, view.tab)}>
              <CoachAvatar name={item.trainee.name} seed={item.trainee.id} photoUrl={item.trainee.avatar?.url} size="today" />
              <span className="recent-row-text">
                <NameInSentence sentence={view.sentence} name={item.trainee.name} />
              </span>
              <span className="recent-row-time">{formatTimeAgo(item.at, nowMs, language)}</span>
            </Link>
          </li>
        );
      })}
    </TodaySection>
  );
}
