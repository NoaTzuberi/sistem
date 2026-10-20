import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { IconCheck } from '@tabler/icons-react';
import { cardioMinutes, cardioTimeline, cardioTotals, formatClock, useCopy, useLoad } from '@sistem/shared';
import { cardioRunPath } from '../../../../app/config/routes';
import { SlideToStart } from '../../../../components/common/SlideToStart/SlideToStart';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { appCopy } from '../../../../copy';
import { getCardioSession } from '../../../../services/cardio/cardioService';
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

/** One cardio session on one of its days (docs/design/trainee-cardio.html): its shape, the coach's note, the steps, start. */
export function CardioDetailPage() {
  const copy = useCopy(cardioCopy);
  const weekdays = useCopy(appCopy).eyebrow.weekdays;
  const navigate = useNavigate();
  const { sessionId = '', date = '' } = useParams();
  const savedMessage = (useLocation().state as { saved?: string } | null)?.saved;
  const load = useCallback(() => getCardioSession(sessionId, date), [sessionId, date]);
  const { data, error, isLoading, reload } = useLoad(load, copy.loadError);
  const { prefs, change } = useCardioPrefs();
  const startTimer = useRef<number | undefined>(undefined);
  // A full-screen page opens at its top (the list it came from may have been scrolled).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [sessionId, date]);
  useEffect(() => () => window.clearTimeout(startTimer.current), []);

  const session = data?.occurrence.session;
  const frames = useMemo(() => (session ? cardioTimeline(session.steps) : []), [session]);
  const totals = useMemo(() => (session ? cardioTotals(session.steps) : null), [session]);

  if (!data || !session || !totals) {
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

  const isDone = data.occurrence.status === 'done';

  function start() {
    window.clearTimeout(startTimer.current);
    startTimer.current = window.setTimeout(() => navigate(cardioRunPath(sessionId, date)), START_DELAY_MS);
  }

  return (
    <div className={'cp-detail' + (data.canStart ? ' cp-detail-with-slide' : '')}>
      <div className="cp-detail-top">
        <BackButton />
      </div>
      <code className="cp-detail-eyebrow" aria-hidden="true">
        {detailEyebrow(session.sport, date, weekdays)}
      </code>
      <CardioTitle title={session.name} className="cp-detail-title" />
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
      {session.note && <CardioCoachNote name={data.coach?.name ?? null} note={session.note} />}
      <CardioSteps steps={session.steps} metric={session.metric} />

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
