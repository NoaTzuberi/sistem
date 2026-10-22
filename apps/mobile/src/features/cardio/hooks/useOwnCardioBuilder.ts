import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { extractErrorMessage } from '@sistem/api-client';
import type { CardioSport, CardioStep } from '@sistem/types';
import { getActiveLanguage } from '@sistem/shared';
import { ROUTES, ownCardioPath } from '../../../app/config/routes';
import {
  createOwnCardioWorkout,
  deleteOwnCardioWorkout,
  getOwnCardioWorkout,
  updateOwnCardioWorkout,
} from '../../../services/cardio/cardioService';
import { cardioCopy } from '../copy';
import { MAX_STEPS, addBlockToRepeat, initialSteps, newBlock, newRepeat, removeStep, setTimes, updateBlock } from '../data/ownCardioDraft';
import type { CardioBlock } from '@sistem/types';

/**
 * Her own cardio workout in the builder: new (one warm-up block) or an existing one (loaded). Save =
 * the server's checks (the same as the coach's builder), then its page. Delete archives it (runs kept).
 */
export function useOwnCardioBuilder(id: string | null) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [sport, setSport] = useState<CardioSport>('run');
  const [steps, setSteps] = useState<CardioStep[]>(initialSteps);
  const [isLoading, setIsLoading] = useState(id !== null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let isCurrent = true;
    getOwnCardioWorkout(id)
      .then((loaded) => {
        if (!isCurrent) return;
        setTitle(loaded.workout.title);
        setSport(loaded.workout.cardio.sport);
        setSteps(loaded.workout.cardio.steps);
        setIsLoading(false);
      })
      .catch(() => isCurrent && navigate(ROUTES.WORKOUTS, { replace: true }));
    return () => {
      isCurrent = false;
    };
  }, [id, navigate]);

  async function save() {
    const copy = cardioCopy[getActiveLanguage()].builder;
    if (title.trim().length === 0) {
      setError(copy.nameRequired);
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const payload = { title: title.trim(), cardio: { sport, metric: 'rpe' as const, steps } };
      const saved = id ? await updateOwnCardioWorkout(id, payload) : await createOwnCardioWorkout(payload);
      navigate(ownCardioPath(saved.ownWorkoutId ?? id ?? ''), { replace: true });
    } catch (caught) {
      setError(extractErrorMessage(caught, copy.saveError));
      setIsSaving(false);
    }
  }

  async function remove() {
    if (!id) return;
    setIsSaving(true);
    try {
      await deleteOwnCardioWorkout(id);
      navigate(ROUTES.WORKOUTS, { replace: true });
    } catch (caught) {
      setError(extractErrorMessage(caught, cardioCopy[getActiveLanguage()].builder.saveError));
      setIsSaving(false);
    }
  }

  const canAdd = steps.length < MAX_STEPS;
  return {
    title,
    sport,
    steps,
    isLoading,
    isSaving,
    error,
    canAdd,
    setTitle,
    setSport,
    addBlock: () => canAdd && setSteps((current) => [...current, newBlock()]),
    addRepeat: () => canAdd && setSteps((current) => [...current, newRepeat()]),
    addToRepeat: (repeatId: string) => setSteps((current) => addBlockToRepeat(current, repeatId)),
    changeBlock: (blockId: string, patch: Partial<Omit<CardioBlock, 'type' | 'id'>>) => setSteps((current) => updateBlock(current, blockId, patch)),
    changeTimes: (repeatId: string, times: number) => setSteps((current) => setTimes(current, repeatId, times)),
    removeStep: (stepId: string) => setSteps((current) => removeStep(current, stepId)),
    save,
    remove,
  };
}
