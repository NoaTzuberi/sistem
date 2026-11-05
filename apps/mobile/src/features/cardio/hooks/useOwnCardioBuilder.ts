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
import {
  CARDIO_TEMPLATES,
  MAX_STEPS,
  addBlockToRepeat,
  duplicateStep,
  firstBlockId,
  initialSteps,
  insertStep,
  newRepeat,
  presetBlock,
  removeStep,
  reorderStep,
  setTimes,
  updateBlock,
} from '../data/ownCardioDraft';
import type { BlockPresetId, CardioTemplateId } from '../data/ownCardioDraft';
import type { CardioBlock } from '@sistem/types';

/**
 * Her own cardio workout in the builder: new (one warm-up block) or an existing one (loaded). One block is
 * open at a time (`selectedId`); new blocks go in after it and open. Save = the server's checks (the same as
 * the coach's builder), then back; "preview" saves, then opens its page (her view of the session). Delete
 * archives it (runs kept).
 */
export function useOwnCardioBuilder(id: string | null) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [sport, setSport] = useState<CardioSport>('run');
  const [steps, setSteps] = useState<CardioStep[]>(initialSteps);
  // The open block — the first one of a new workout, nothing of a loaded one.
  const [selectedId, setSelectedId] = useState<string | null>(() => (id || !steps[0] ? null : firstBlockId(steps[0])));
  const [isDirty, setIsDirty] = useState(false);
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

  async function persist(then: 'back' | 'preview') {
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
      const savedId = saved.ownWorkoutId ?? id ?? '';
      if (then === 'preview' || !id) navigate(ownCardioPath(savedId), { replace: true });
      else navigate(-1);
    } catch (caught) {
      setError(extractErrorMessage(caught, copy.saveError));
      setIsSaving(false);
    }
  }

  async function deleteWorkout() {
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

  // Every edit marks the draft changed (the save button shows it; nothing is lost silently).
  function edit(next: (current: CardioStep[]) => CardioStep[]) {
    setSteps(next);
    setIsDirty(true);
  }

  function addPreset(preset: BlockPresetId) {
    if (!canAdd) return;
    const block = presetBlock(preset);
    edit((current) => insertStep(current, selectedId, block));
    setSelectedId(block.id);
  }

  function addRepeat() {
    if (!canAdd) return;
    const repeat = newRepeat();
    edit((current) => insertStep(current, selectedId, repeat));
    setSelectedId(firstBlockId(repeat));
  }

  function applyTemplate(template: CardioTemplateId) {
    const built = CARDIO_TEMPLATES[template].build();
    setSport(CARDIO_TEMPLATES[template].sport);
    edit(() => built);
    setSelectedId(null);
  }

  function duplicate(stepId: string) {
    const result = duplicateStep(steps, stepId);
    if (!result.copyId) return;
    edit(() => result.steps);
    setSelectedId(result.copyId);
  }

  function remove(stepId: string) {
    edit((current) => removeStep(current, stepId));
    if (selectedId === stepId) setSelectedId(null);
  }

  return {
    title,
    sport,
    steps,
    isLoading,
    isSaving,
    isDirty,
    error,
    canAdd,
    selectedId,
    /** Opens a block (a second tap closes it). */
    select: (blockId: string | null) => setSelectedId((current) => (current === blockId ? null : blockId)),
    /** Opens a block and keeps it open (a chart bar). */
    open: (blockId: string) => setSelectedId(blockId),
    setTitle: (value: string) => {
      setTitle(value);
      setIsDirty(true);
    },
    setSport: (value: CardioSport) => {
      setSport(value);
      setIsDirty(true);
    },
    addPreset,
    addRepeat,
    applyTemplate,
    duplicate,
    removeStep: remove,
    addToRepeat: (repeatId: string) => {
      const before = new Set(steps.flatMap((step) => (step.type === 'repeat' ? step.blocks.map((block) => block.id) : [])));
      const next = addBlockToRepeat(steps, repeatId);
      edit(() => next);
      const added = next.flatMap((step) => (step.type === 'repeat' ? step.blocks : [])).find((block) => !before.has(block.id));
      if (added) setSelectedId(added.id);
    },
    changeBlock: (blockId: string, patch: Partial<Omit<CardioBlock, 'type' | 'id'>>) => edit((current) => updateBlock(current, blockId, patch)),
    changeTimes: (repeatId: string, times: number) => edit((current) => setTimes(current, repeatId, times)),
    reorder: (activeId: string, overId: string) => edit((current) => reorderStep(current, activeId, overId)),
    save: () => persist('back'),
    saveAndPreview: () => persist('preview'),
    deleteWorkout,
  };
}
