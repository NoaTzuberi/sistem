import { useMemo, useState } from 'react';
import type { CardioBlockKind, CardioMetric, CardioSport, CardioStep, PlanCardio } from '@sistem/types';
import { cardioTimeline, cardioTotals } from '@sistem/shared';
import { addStep, changeTimes, removeStep, stepDuration, stepIntensity, updateBlock } from '../data/cardioDraft';
import { type AddKind, KIND_INTENSITY, presetSteps } from '../data/cardioPresets';

/**
 * A cardio workout's editor state inside the plan builder: the open block, the timeline and totals,
 * and every edit as a new `PlanCardio` handed to `onChange` (the plan's draft owns the value and
 * autosaves it). Pure step edits live in data/cardioDraft.ts.
 */
export function useCardioEditor(cardio: PlanCardio, onChange: (cardio: PlanCardio) => void) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const frames = useMemo(() => cardioTimeline(cardio.steps), [cardio.steps]);
  const totals = useMemo(() => cardioTotals(cardio.steps), [cardio.steps]);
  const editSteps = (change: (steps: CardioStep[]) => CardioStep[]) => onChange({ ...cardio, steps: change(cardio.steps) });

  return {
    frames,
    totals,
    selectedId,
    /** A type loads its preset (the blocks are replaced). */
    setSport(sport: CardioSport) {
      setSelectedId(null);
      onChange({ ...cardio, sport, steps: presetSteps(sport) });
    },
    setMetric: (metric: CardioMetric) => onChange({ ...cardio, metric }),
    toggleSelected: (id: string) => setSelectedId((current) => (current === id ? null : id)),
    /** Picking a kind also sets its usual intensity (as in the design). */
    setKind: (id: string, kind: CardioBlockKind) => editSteps((steps) => updateBlock(steps, id, (item) => ({ ...item, kind, intensity: KIND_INTENSITY[kind] }))),
    changeDuration: (id: string, direction: 1 | -1) =>
      editSteps((steps) => updateBlock(steps, id, (item) => ({ ...item, durationSec: stepDuration(item.durationSec, direction) }))),
    changeIntensity: (id: string, direction: 1 | -1) =>
      editSteps((steps) => updateBlock(steps, id, (item) => ({ ...item, intensity: stepIntensity(item.intensity, direction) }))),
    changeTimes: (id: string, direction: 1 | -1) => editSteps((steps) => changeTimes(steps, id, direction)),
    remove(id: string) {
      if (selectedId === id) setSelectedId(null);
      editSteps((steps) => removeStep(steps, id));
    },
    add: (kind: AddKind) => editSteps((steps) => addStep(steps, kind).steps),
  };
}

export type CardioEditorState = ReturnType<typeof useCardioEditor>;
