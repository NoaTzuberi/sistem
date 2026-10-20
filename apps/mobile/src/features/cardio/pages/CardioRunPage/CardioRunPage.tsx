import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { extractErrorMessage } from '@sistem/api-client';
import type { TraineeCardioSessionResponse } from '@sistem/types';
import { fill, getActiveLanguage, useCopy, useLoad } from '@sistem/shared';
import { cardioDetailPath } from '../../../../app/config/routes';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { getCardioSession, saveCardioLog } from '../../../../services/cardio/cardioService';
import { BackButton } from '../../../workouts/components/BackButton/BackButton';
import { CardioFinish, type CardioFinishValues } from '../../components/CardioFinish/CardioFinish';
import { CardioPlayer } from '../../components/CardioPlayer/CardioPlayer';
import { cardioCopy } from '../../copy';
import { useCardioPrefs } from '../../hooks/useCardioPrefs';
import { useCardioRun } from '../../hooks/useCardioRun';
import '../../cardioZones.css';
import './CardioRunPage.css';

/** The live run (full screen): 3-2-1, the player, then the finish log. */
export function CardioRunPage() {
  const copy = useCopy(cardioCopy);
  const { sessionId = '', date = '' } = useParams();
  const load = useCallback(() => getCardioSession(sessionId, date), [sessionId, date]);
  const { data, error, isLoading, reload } = useLoad(load, copy.loadError);

  if (!data) {
    return (
      <div className="cp-run-state">
        <BackButton />
        {isLoading && <StateMessage>{copy.loading}</StateMessage>}
        {error && <StateMessage onRetry={reload}>{error}</StateMessage>}
      </div>
    );
  }
  if (!data.canStart) {
    return (
      <div className="cp-run-state">
        <BackButton />
        <StateMessage>{copy.viewOnly}</StateMessage>
      </div>
    );
  }
  return <CardioRun data={data} sessionId={sessionId} date={date} />;
}

function CardioRun({ data, sessionId, date }: { data: TraineeCardioSessionResponse; sessionId: string; date: string }) {
  const navigate = useNavigate();
  const session = data.occurrence.session;
  const coachName = data.coach?.name ?? null;
  const { prefs } = useCardioPrefs();
  const [reducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const run = useCardioRun({ sessionId, date, steps: session.steps, prefs, reducedMotion });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // The finish screen opens at its top.
  useEffect(() => {
    if (run.phase === 'finished') window.scrollTo(0, 0);
  }, [run.phase]);

  async function save(values: CardioFinishValues) {
    if (isSaving) return;
    setIsSaving(true);
    setSaveError(null);
    const text = cardioCopy[getActiveLanguage()];
    try {
      await saveCardioLog({ sessionId, date, ...run.progress, ...values });
      run.clear();
      navigate(cardioDetailPath(sessionId, date), { replace: true, state: { saved: coachName ? fill(text.saved, { name: coachName }) : text.savedNoCoach } });
    } catch (caught) {
      setSaveError(extractErrorMessage(caught, text.saveError));
      setIsSaving(false);
    }
  }

  if (run.phase === 'finished') {
    return (
      <CardioFinish
        sessionName={session.name}
        completedSec={run.progress.completedSec}
        roundsDone={run.progress.roundsDone}
        roundsTotal={run.totals.rounds}
        highIntensitySec={run.progress.highIntensitySec}
        coachName={coachName}
        isSaving={isSaving}
        error={saveError}
        onSave={(values) => void save(values)}
      />
    );
  }
  if (!run.frame) return null;

  // Portaled: the page-enter transform on <main> would pin a fixed screen.
  return createPortal(
    <CardioPlayer
      frames={run.frames}
      frame={run.frame}
      frameLeft={run.frameLeft}
      position={run.position}
      totalSec={run.totals.totalSec}
      metric={session.metric}
      countdown={run.countdown}
      isPaused={run.isPaused}
      onEnd={run.end}
      onPrevious={run.previous}
      onTogglePause={run.togglePause}
      onNext={run.next}
    />,
    document.body,
  );
}
