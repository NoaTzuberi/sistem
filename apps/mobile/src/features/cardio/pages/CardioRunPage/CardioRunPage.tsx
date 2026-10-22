import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { extractErrorMessage } from '@sistem/api-client';
import type { TraineeCardioWorkoutResponse } from '@sistem/types';
import { fill, getActiveLanguage, useCopy, useLoad } from '@sistem/shared';
import { cardioDetailPath, ownCardioPath } from '../../../../app/config/routes';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { getCardioWorkout, getOwnCardioWorkout, saveCardioLog } from '../../../../services/cardio/cardioService';
import { BackButton } from '../../../workouts/components/BackButton/BackButton';
import { CardioFinish, type CardioFinishValues } from '../../components/CardioFinish/CardioFinish';
import { CardioPlayer } from '../../components/CardioPlayer/CardioPlayer';
import { cardioCopy } from '../../copy';
import { useCardioPrefs } from '../../hooks/useCardioPrefs';
import { useCardioRun } from '../../hooks/useCardioRun';
import '../../cardioZones.css';
import './CardioRunPage.css';

/** The live run (full screen): 3-2-1, the player, then the finish log. `own` = her own cardio workout. */
export function CardioRunPage({ own = false }: { own?: boolean }) {
  const copy = useCopy(cardioCopy);
  const params = useParams();
  // Her own workout: its run is kept on the phone under ('own', id).
  const planId = own ? 'own' : (params.planId ?? '');
  const workoutId = own ? (params.id ?? '') : (params.workoutId ?? '');
  const load = useCallback(() => (own ? getOwnCardioWorkout(workoutId) : getCardioWorkout(planId, workoutId)), [own, planId, workoutId]);
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
  return <CardioRun data={data} planId={planId} workoutId={workoutId} own={own} />;
}

function CardioRun({ data, planId, workoutId, own }: { data: TraineeCardioWorkoutResponse; planId: string; workoutId: string; own: boolean }) {
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
      await saveCardioLog({ ...(own ? { ownWorkoutId: workoutId } : { planId, workoutId }), ...run.progress, ...values });
      run.clear();
      const saved = coachName ? fill(text.saved, { name: coachName }) : text.savedNoCoach;
      navigate(own ? ownCardioPath(workoutId) : cardioDetailPath(planId, workoutId), { replace: true, state: { saved } });
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
