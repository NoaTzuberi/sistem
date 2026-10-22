import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { IconCheck } from '@tabler/icons-react';
import { cardioMinutes, cardioTimeline, cardioTotals, formatClock, useCopy, useLoad } from '@sistem/shared';
import { cardioRunPath, ownCardioEditPath, ownCardioRunPath } from '../../../../app/config/routes';
import { SlideToStart } from '../../../../components/common/SlideToStart/SlideToStart';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { appCopy } from '../../../../copy';
import { getCardioWorkout, getOwnCardioWorkout } from '../../../../services/cardio/cardioService';
import { BackButton } from '../../../workouts/components/BackButton/BackButton';
import { CardioCoachNote } from '../../components/CardioCoachNote/CardioCoachNote';
import { CardioGraph } from '../../components/CardioGraph/CardioGraph';
import { CardioScoreboard } from '../../components/CardioScoreboard/CardioScoreboard';
import { CardioSteps } from '../../components/CardioSteps/CardioSteps';
import { CardioSwitch } from '../../components/CardioSwitch/CardioSwitch';
import { CardioTitle } from '../../components/CardioTitle/CardioTitle';
import { cardioCopy } from '../../copy';
import { canSpeak, canVibrate } from '../../data/cardioCues';
import { detailEyebrow } from '../../data/cardioText';
import { useCardioPrefs } from '../../hooks/useCardioPrefs';
import '../../cardioZones.css';
import './CardioDetailPage.css';

/** The slide shows its done state this long before the 3-2-1 starts. */
const START_DELAY_MS = 500;

/**
 * One cardio workout of her plan (docs/design/trainee-cardio.html): its shape, the coach's note, the steps,
 * start. `own` = one she built herself (self-guided): always startable, with an edit link.
 */
export function CardioDetailPage({ own = false }: { own?: boolean }) {
  const copy = useCopy(cardioCopy);
  const weekdays = useCopy(appCopy).eyebrow.weekdays;
  const navigate = useNavigate();
  const { planId = '', workoutId = '', id = '' } = useParams();
  const savedMessage = (useLocation().state as { saved?: string } | null)?.saved;
  const load = useCallback(() => (own ? getOwnCardioWorkout(id) : getCardioWorkout(planId, workoutId)), [own, id, planId, workoutId]);
  const { data, error, isLoading, reload } = useLoad(load, copy.loadError);
  const { prefs, change } = useCardioPrefs();
  const startTimer = useRef<number | undefined>(undefined);
  // A full-screen page opens at its top (the list it came from may have been scrolled).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [planId, workoutId]);
  useEffect(() => () => window.clearTimeout(startTimer.current), []);

  const workout = data?.workout;
  const cardio = workout?.cardio;
  const frames = useMemo(() => (cardio ? cardioTimeline(cardio.steps) : []), [cardio]);
  const totals = useMemo(() => (cardio ? cardioTotals(cardio.steps) : null), [cardio]);

  if (!data || !workout || !cardio || !totals) {
    return (
      <div className="cp-detail">
        <div className="cp-detail-top">
          <BackButton />
        </div>
        {isLoading && <StateMessage>{copy.loading}</StateMessage>}
        {error && <StateMessage onRetry={reload}>{error}</StateMessage>}
      </div>
    );
  }

  const isDone = data.status === 'done';

  function start() {
    window.clearTimeout(startTimer.current);
    startTimer.current = window.setTimeout(() => navigate(own ? ownCardioRunPath(id) : cardioRunPath(planId, workoutId)), START_DELAY_MS);
  }

  return (
    <div className={'cp-detail' + (data.canStart ? ' cp-detail-with-slide' : '')}>
      <div className="cp-detail-top">
        <BackButton />
        {own && (
          <button type="button" className="cp-detail-edit" onClick={() => navigate(ownCardioEditPath(id))}>
            {copy.ownEdit}
          </button>
        )}
      </div>
      <code className="cp-detail-eyebrow" aria-hidden="true">
        {detailEyebrow(cardio.sport, data.date, weekdays)}
      </code>
      <CardioTitle title={workout.title} className="cp-detail-title" />
      {isDone && (
        <p className="cp-detail-done">
          <IconCheck size={16} stroke={2.5} aria-hidden="true" />
          {copy.done}
        </p>
      )}
      {savedMessage && (
        <p className="cp-detail-saved" role="status">
          {savedMessage}
        </p>
      )}

      <CardioScoreboard
        items={[
          { id: 'total', value: `${cardioMinutes(totals.totalSec)}′`, label: copy.total },
          { id: 'rounds', value: totals.rounds > 0 ? String(totals.rounds) : '—', label: copy.rounds },
          { id: 'high', value: formatClock(totals.highIntensitySec), label: copy.high },
        ]}
      />
      <CardioGraph frames={frames} totalSec={totals.totalSec} />
      {workout.notes && <CardioCoachNote name={data.coach?.name ?? null} note={workout.notes} />}
      <CardioSteps steps={cardio.steps} metric={cardio.metric} />

      {data.canStart && (canSpeak() || canVibrate()) && (
        <div className="cp-detail-options">
          {canSpeak() && <CardioSwitch checked={prefs.voice} onChange={(voice) => change({ voice })} label={copy.voice} hint={copy.voiceHint} />}
          {canVibrate() && <CardioSwitch checked={prefs.vibrate} onChange={(vibrate) => change({ vibrate })} label={copy.vibrate} />}
        </div>
      )}
      {!data.canStart && !isDone && <p className="cp-detail-note">{copy.viewOnly}</p>}

      {data.canStart && <SlideToStart variant="floating" label={copy.slide} onComplete={start} />}
    </div>
  );
}
