import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { CoachTraineeSummary } from '@sistem/types';
import {
  fill,
  formatTimeAgo,
  formatTimeLeft,
  formatWeekSpan,
  labelList,
  matchesFilter,
  matchesSearch,
  sharedCopy,
  splitLabel,
  statusFilters,
  useCopy,
  useLanguage,
} from '@sistem/shared';
import type { TraineeFilter } from '@sistem/shared';
import { TRAINEE_FILTER_PARAM } from '../../../../app/config/routes';
import { Skeleton } from '../../../../components/common/Skeleton/Skeleton';
import { Avatar } from '../../../../components/common/Avatar/Avatar';
import { Icon } from '../../../../components/common/Icon/Icon';
import { PageHeader } from '../../../../components/common/PageHeader/PageHeader';
import { StateLine } from '../../../../components/common/StateLine/StateLine';
import { Tag } from '../../../../components/common/Tag/Tag';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import { InviteSheet } from '../../../invites/components/InviteSheet/InviteSheet';
import { invitesCopy } from '../../../invites/copy';
import { useCoachData } from '../../../../services/coach/CoachDataContext';
import { WeekSquares } from '../../components/WeekSquares/WeekSquares';
import { traineesCopy } from '../../copy';
import { describeDaysPerWeek, statusTagTone } from '../../data/traineeFacts';
import { useTraineeDrawer } from '../../hooks/useTraineeDrawer';
import './TraineesPage.css';

const NEEDS_NEXT_WEEK: TraineeFilter = 'needs_next_week';

/** The coach's trainees: status chips with counts, a search, and a table whose rows open the quick view. */
export function TraineesPage() {
  const language = useLanguage();
  const shared = useCopy(sharedCopy);
  const copy = useCopy(traineesCopy);
  const { trainees, hasTrainees, hasTraineesError, nowMs, weekOf, reload } = useCoachData();
  const { openDrawer } = useTraineeDrawer();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const invites = useCopy(invitesCopy);

  // The filter lives in the URL: the sidebar's "waiting for a plan" is a link to it.
  const filters: { id: TraineeFilter; label: string }[] = [
    ...statusFilters(language),
    { id: NEEDS_NEXT_WEEK, label: shared.traineeStatus.needsNextWeek },
  ];
  const requested = searchParams.get(TRAINEE_FILTER_PARAM);
  const filter = filters.find((option) => option.id === requested)?.id ?? 'all';

  function selectFilter(next: TraineeFilter) {
    setSearchParams(next === 'all' ? {} : { [TRAINEE_FILTER_PARAM]: next }, { replace: true });
  }

  const countFor = (id: TraineeFilter) => trainees.filter((trainee) => matchesFilter(trainee, id)).length;
  const visible = trainees.filter((trainee) => matchesFilter(trainee, filter) && matchesSearch(trainee, search));

  return (
    <div className="trainees-page">
      <PageHeader
        title={shared.coach.traineesTitle}
        subtitle={hasTrainees ? fill(copy.listSubtitle, { active: countFor('active'), waiting: countFor('waiting') }) : undefined}
      >
        <PillButton variant="primary" onClick={() => setIsInviting(true)}>
          {invites.button}
        </PillButton>
      </PageHeader>
      <InviteSheet isOpen={isInviting} onClose={() => setIsInviting(false)} />

      <div className="trainees-toolbar">
        <div className="trainees-filters" role="group" aria-label={shared.coach.filterLabel}>
          {filters.map(({ id, label }) => (
            <button key={id} className="trainees-chip" type="button" aria-pressed={filter === id} onClick={() => selectFilter(id)}>
              {label} <span className="trainees-chip-count">{countFor(id)}</span>
            </button>
          ))}
        </div>
        <label className="trainees-search">
          <Icon name="search" size="sm" />
          <input
            className="trainees-search-input"
            type="search"
            data-search-shortcut
            aria-keyshortcuts="/"
            placeholder={shared.coach.searchPlaceholder}
            aria-label={shared.coach.searchLabel}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>

      {!hasTrainees && !hasTraineesError && <Skeleton layout="rows" />}
      {hasTraineesError && !hasTrainees && <StateLine error={shared.coach.loadTraineesError} onRetry={reload} />}

      {hasTrainees && (
        <div className="trainees-table-wrap">
          {visible.length === 0 ? (
            <p className="trainees-empty">{trainees.length === 0 ? shared.coach.noTrainees : shared.coach.noMatch}</p>
          ) : (
            <table className="trainees-table">
              <thead>
                <tr>
                  <th scope="col">{copy.trainee}</th>
                  <th scope="col">{copy.status}</th>
                  <th scope="col">{copy.plan}</th>
                  <th scope="col">{copy.thisWeek}</th>
                  <th scope="col">{shared.coach.lastActivity}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(renderRow)}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );

  // A plain function, not a component: a component declared in here would be a new one on
  // every render, and the rows would lose their focus each time the clock ticks.
  function renderRow(trainee: CoachTraineeSummary) {
    const onOpen = () => openDrawer(trainee.id);
    const week = weekOf(trainee.id);
    const plan = week?.currentPlan ?? null;
    const details = [
      week && week.goals.length > 0 ? labelList(week.goals, shared.onboardingOptions.goals, language) : null,
      week?.daysPerWeek ? fill(copy.daysPerWeek, { days: describeDaysPerWeek(week.daysPerWeek) }) : null,
    ].filter(Boolean);

    return (
      <tr
        key={trainee.id}
        className="trainees-row"
        tabIndex={0}
        aria-haspopup="dialog"
        onClick={onOpen}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && event.target === event.currentTarget) onOpen();
        }}
      >
        <td>
          <span className="trainees-person">
            <Avatar name={trainee.name} seed={trainee.id} photoUrl={trainee.avatar?.url} />
            <span className="trainees-person-text">
              <b className="trainees-name">
                <bdi>{trainee.name}</bdi>
              </b>
              <span className="trainees-details">{details.length > 0 ? details.join(' · ') : trainee.email}</span>
            </span>
          </span>
        </td>
        <td>
          <span className="trainees-tags">
            <Tag tone={statusTagTone(trainee, nowMs)}>
              {trainee.planDueAt ? formatTimeLeft(trainee.planDueAt, nowMs, language).text : shared.traineeStatus.labels[trainee.status]}
            </Tag>
            {trainee.needsNextWeekPlan && <Tag tone="accent">{shared.traineeStatus.needsNextWeek}</Tag>}
          </span>
        </td>
        <td>
          {plan
            ? [formatWeekSpan(plan.weekStartDate, language), plan.splitId ? splitLabel(plan.splitId, language) : null].filter(Boolean).join(' · ')
            : trainee.status === 'waiting'
              ? shared.traineeStatus.labels.waiting
              : copy.noPlanThisWeek}
        </td>
        <td>
          {plan && plan.planned > 0 ? (
            <WeekSquares workouts={plan.workouts} label={fill(copy.weekProgress, { done: plan.completed, planned: plan.planned })} />
          ) : (
            <span className="trainees-muted">{shared.common.none}</span>
          )}
        </td>
        <td className="trainees-muted">
          {trainee.lastActivityAt ? formatTimeAgo(trainee.lastActivityAt, nowMs, language) : shared.common.none}
        </td>
      </tr>
    );
  }
}
