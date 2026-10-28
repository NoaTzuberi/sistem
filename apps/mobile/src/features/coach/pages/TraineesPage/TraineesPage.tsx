import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { matchesSearch, sharedCopy, useCopy, useLoad, useServerNow } from '@sistem/shared';
import { IconSearch } from '@tabler/icons-react';
import { listTrainees } from '../../../../services/coach/coachService';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { coachCopy } from '../../copy';
import {
  COACH_LIST_FILTERS,
  COACH_LIST_FILTER_PARAM,
  type CoachListFilter,
  coachListFilterOf,
  matchesCoachFilter,
  sortForCoach,
} from '../../data/coachMode';
import { CoachScreen } from '../../components/CoachScreen/CoachScreen';
import { FilterChips } from '../../components/FilterChips/FilterChips';
import { InvitePill } from '../../components/InvitePill/InvitePill';
import { TraineeRow } from '../../components/TraineeRow/TraineeRow';
import { ArchivedTraineeRow } from '../../components/ArchivedTraineeRow/ArchivedTraineeRow';
import { useCoachArchive } from '../../hooks/useCoachArchive';
import './TraineesPage.css';

// Coach mode Trainees list (docs/design/coach-app.html): search, filter chips with counts (Today's
// scoreboard opens them preset via ?filter=), one white card of rows. Statuses are the server's.
export function TraineesPage() {
  const shared = useCopy(sharedCopy);
  const copy = useCopy(coachCopy);
  const { data, error, isLoading, reload } = useLoad(listTrainees, shared.coach.loadTraineesError);
  const nowMs = useServerNow(data?.serverTime);
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = coachListFilterOf(searchParams.get(COACH_LIST_FILTER_PARAM));
  const [search, setSearch] = useState('');
  const archive = useCoachArchive();
  const isArchive = filter === 'archive';

  const trainees = useMemo(() => sortForCoach(data?.items ?? []), [data]);
  const counts = Object.fromEntries(
    COACH_LIST_FILTERS.map((id) => [id, trainees.filter((trainee) => matchesCoachFilter(trainee, id)).length]),
  ) as Record<CoachListFilter, number>;
  counts.archive = archive.data?.items.length ?? 0;
  const visible = trainees.filter((trainee) => matchesCoachFilter(trainee, filter) && matchesSearch(trainee, search));
  const archived = (archive.data?.items ?? []).filter((trainee) => matchesSearch(trainee, search));

  function selectFilter(next: CoachListFilter) {
    setSearchParams(next === 'all' ? {} : { [COACH_LIST_FILTER_PARAM]: next }, { replace: true });
  }

  return (
    <CoachScreen
      top={
        <div className="coach-screen-top">
          <div className="coach-screen-title-row">
            <h1 className="coach-screen-title display-title">{shared.coach.traineesTitle}</h1>
            <InvitePill />
          </div>
          <label className="coach-search">
            <IconSearch size={18} aria-hidden="true" />
            <input
              type="search"
              enterKeyHint="search"
              placeholder={copy.list.searchPlaceholder}
              aria-label={copy.list.searchPlaceholder}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <FilterChips selected={filter} counts={counts} onSelect={selectFilter} />
        </div>
      }
    >
      {isArchive && archive.isLoading && !archive.data && <StateMessage>{shared.common.loading}</StateMessage>}
      {isArchive && archive.error && <StateMessage onRetry={archive.reload}>{archive.error}</StateMessage>}
      {isArchive && archive.data && archived.length === 0 && (
        <StateMessage>{archive.data.items.length === 0 ? shared.coach.archive.empty : copy.list.noMatch}</StateMessage>
      )}
      {isArchive && archived.length > 0 && (
        <ul className="coach-trainee-list">
          {archived.map((trainee) => (
            <li key={trainee.id}>
              <ArchivedTraineeRow trainee={trainee} />
            </li>
          ))}
        </ul>
      )}

      {!isArchive && isLoading && !data && <StateMessage>{shared.common.loading}</StateMessage>}
      {!isArchive && error && <StateMessage onRetry={reload}>{error}</StateMessage>}
      {!isArchive && data && visible.length === 0 && <StateMessage>{trainees.length === 0 ? shared.coach.noTrainees : copy.list.noMatch}</StateMessage>}
      {!isArchive && visible.length > 0 && (
        <ul className="coach-trainee-list">
          {visible.map((trainee) => (
            <li key={trainee.id}>
              <TraineeRow trainee={trainee} nowMs={nowMs} />
            </li>
          ))}
        </ul>
      )}
    </CoachScreen>
  );
}
