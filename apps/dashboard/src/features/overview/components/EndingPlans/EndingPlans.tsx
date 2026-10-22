import type { CoachStats, CoachTraineeSummary } from '@sistem/types';
import { fill, formatWeekSpan, splitLabel, useCopy, useI18n } from '@sistem/shared';
import { NEW_PLAN_STATE, planPath, traineePath } from '../../../../app/config/routes';
import { Avatar } from '../../../../components/common/Avatar/Avatar';
import { Icon } from '../../../../components/common/Icon/Icon';
import { RoundButton } from '../../../../components/common/RoundButton/RoundButton';
import { Tag } from '../../../../components/common/Tag/Tag';
import { WidgetCard } from '../../../../components/common/WidgetCard/WidgetCard';
import { overviewCopy } from '../../copy';
import { formatShare } from '../../data/overviewFormat';
import './EndingPlans.css';

interface EndingPlansProps {
  stats: CoachStats;
  trainees: CoachTraineeSummary[];
  className?: string;
}

const MAX_CARDS = 6;
/** This close to the week's end the tag turns pink. */
const SOON_DAYS = 3;

/**
 * Plans are weekly, so every running plan ends this week; the ones shown are those whose
 * trainee has no PUBLISHED plan for next week yet — "time to build next week". The arrow opens
 * her next-week draft in the plan builder, or the week picker for a new plan.
 */
export function EndingPlans({ stats, trainees, className }: EndingPlansProps) {
  const { language, plural } = useI18n();
  const copy = useCopy(overviewCopy);

  const cards = stats.trainees
    .flatMap((week) => {
      const trainee = trainees.find((item) => item.id === week.traineeId);
      const plan = week.currentPlan;
      return trainee && plan && week.nextWeekPlan?.status !== 'published' ? [{ trainee, plan, draft: week.nextWeekPlan }] : [];
    })
    .sort((a, b) => a.plan.daysLeft - b.plan.daysLeft)
    .slice(0, MAX_CARDS);

  if (cards.length === 0) return null;

  return (
    <WidgetCard className={className} variant="bare" title={copy.ending.title} subtitle={copy.ending.subtitle}>
      <ul className="ending-list">
        {cards.map(({ trainee, plan, draft }) => {
          const share = plan.planned > 0 ? plan.completed / plan.planned : 0;
          return (
            <li key={trainee.id} className="ending-card">
              <div className="ending-top">
                <Avatar name={trainee.name} seed={trainee.id} photoUrl={trainee.avatar?.url} />
                <b className="ending-name">
                  <bdi>{trainee.name}</bdi>
                </b>
                <Tag tone={plan.daysLeft <= SOON_DAYS ? 'accent' : 'neutral'}>
                  {plan.daysLeft <= 0 ? copy.ending.endsToday : plural(copy.ending.daysLeft, plan.daysLeft)}
                </Tag>
              </div>
              <div className="ending-progress">
                <span>
                  {[formatWeekSpan(plan.weekStartDate, language), plan.splitId ? splitLabel(plan.splitId, language) : null]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
                <bdi className="ending-share">{formatShare(plan.completed, plan.planned, language)}</bdi>
              </div>
              <div className="ending-track">
                {/* A computed value: the bar's width is the data. */}
                <span className="ending-track-fill" style={{ inlineSize: `${share * 100}%` }} />
              </div>
              <div className="ending-foot">
                <span className="ending-count">{fill(copy.ending.workouts, { done: plan.completed, planned: plan.planned })}</span>
                <RoundButton
                  variant="outline"
                  label={copy.ending.buildNext}
                  to={draft ? planPath(trainee.id, draft.id) : traineePath(trainee.id, 'plans')}
                  state={draft ? undefined : NEW_PLAN_STATE}
                >
                  <Icon name="arrowOut" size="sm" flip />
                </RoundButton>
              </div>
            </li>
          );
        })}
      </ul>
    </WidgetCard>
  );
}
