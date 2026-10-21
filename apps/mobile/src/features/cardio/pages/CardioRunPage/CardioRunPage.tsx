import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { extractErrorMessage } from '@sistem/api-client';
import type { TraineeCardioWorkoutResponse } from '@sistem/types';
import { fill, getActiveLanguage, useCopy, useLoad } from '@sistem/shared';
import { cardioDetailPath } from '../../../../app/config/routes';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { getCardioWorkout, saveCardioLog } from '../../../../services/cardio/cardioService';
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
  const { planId = '', workoutId = '' } = useParams();
  const load = useCallback(() => getCardioWorkout(planId, workoutId), [planId, workoutId]);
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
  return <CardioRun data={data} planId={planId} workoutId={workoutId} />;
}

function CardioRun({ data, planId, workoutId }: { data: TraineeCardioWorkoutResponse; planId: string; workoutId: string }) {
  const navigate = useNavigate();
  const workout = data.workout;
  const coachName = data.coach?.name ?? null;
  const { prefs } = useCardioPrefs();
  const [reducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const run = useCardioRun({ planId, workoutId, steps: workout.cardio.steps, prefs, reducedMotion });
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
      await saveCardioLog({ planId, workoutId, ...run.progress, ...values });
      run.clear();
      navigate(cardioDetailPath(planId, workoutId), { replace: true, state: { saved: coachName ? fill(text.saved, { name: coachName }) : text.savedNoCoach } });
    } catch (caught) {
      setSaveError(extractErrorMessage(caught, text.saveError));
      setIsSaving(false);
    }
  }

  if (run.phase === 'finished') {
    return (
      <CardioFinish
        sessionName={workout.title}
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
      metric={workout.cardio.metric}
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
