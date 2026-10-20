import { useMemo, useRef, useState } from 'react';
import type { CardioBlockKind, CardioMetric, CardioSession, CardioSessionStatus, CardioSport, CardioStep, SaveCardioSessionPayload } from '@sistem/types';
import { cardioTimeline, cardioTotals } from '@sistem/shared';
import { createTraineeCardioSession, saveTraineeCardioSession } from '../../../services/cardio/cardioService';
import { addStep, changeTimes, removeStep, stepDuration, stepIntensity, updateBlock } from '../data/cardioDraft';
import { type AddKind, KIND_INTENSITY, presetSteps } from '../data/cardioPresets';

interface Draft {
  name: string;
  sport: CardioSport;
  metric: CardioMetric;
  steps: CardioStep[];
  days: number[];
  repeatsWeekly: boolean;
  note: string;
}

interface BuilderOptions {
  traineeId: string;
  weekStartDate: string;
  /** The session being edited; null = a new one. */
  session: CardioSession | null;
  /** The new session's name per type (the design's names). */
  defaultNames: Record<CardioSport, string>;
}

const NEW_SPORT: CardioSport = 'intervals';

function initialDraft(session: CardioSession | null, defaultNames: Record<CardioSport, string>): Draft {
  if (session) {
    const { name, sport, metric, steps, days, repeatsWeekly, note } = session;
    return { name, sport, metric, steps, days, repeatsWeekly, note: note ?? '' };
  }
  return { name: defaultNames[NEW_SPORT], sport: NEW_SPORT, metric: 'rpe', steps: presetSteps(NEW_SPORT), days: [], repeatsWeekly: true, note: '' };
}

/**
 * The cardio builder's state: the session draft, the open block, the totals and timeline, and
 * saving (draft or "add to plan" = active). Pure step edits live in data/cardioDraft.ts.
 */
export function useCardioBuilder({ traineeId, weekStartDate, session, defaultNames }: BuilderOptions) {
  const [draft, setDraft] = useState<Draft>(() => initialDraft(session, defaultNames));
  const [saved, setSaved] = useState<CardioSession | null>(session);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const saving = useRef(false);

  const frames = useMemo(() => cardioTimeline(draft.steps), [draft.steps]);
  const totals = useMemo(() => cardioTotals(draft.steps), [draft.steps]);

  const patch = (change: Partial<Draft>) => setDraft((current) => ({ ...current, ...change }));
  const editSteps = (change: (steps: CardioStep[]) => CardioStep[]) => setDraft((current) => ({ ...current, steps: change(current.steps) }));

  return {
    draft,
    saved,
    frames,
    totals,
    selectedId,
    isSaving,
    setName: (name: string) => patch({ name }),
    setNote: (note: string) => patch({ note }),
    setMetric: (metric: CardioMetric) => patch({ metric }),
    setRepeatsWeekly: (repeatsWeekly: boolean) => patch({ repeatsWeekly }),
    /** A type loads its preset; the name follows only while it is still a preset name (or empty). */
    setSport(sport: CardioSport) {
      setSelectedId(null);
      setDraft((current) => {
        const isDefaultName = current.name.trim() === '' || Object.values(defaultNames).includes(current.name.trim());
        return { ...current, sport, steps: presetSteps(sport), name: isDefaultName ? defaultNames[sport] : current.name };
      });
    },
    toggleDay(day: number) {
      setDraft((current) => ({
        ...current,
        days: current.days.includes(day) ? current.days.filter((other) => other !== day) : [...current.days, day].sort((a, b) => a - b),
      }));
    },
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
    /** Creates or saves; resolves to the saved session (the server's error is thrown on). */
    async save(status: CardioSessionStatus): Promise<CardioSession | null> {
      if (saving.current) return null;
      saving.current = true;
      setIsSaving(true);
      const payload: SaveCardioSessionPayload = {
        name: draft.name.trim(),
        sport: draft.sport,
        metric: draft.metric,
        steps: draft.steps,
        note: draft.note.trim() || null,
        days: draft.days,
        repeatsWeekly: draft.repeatsWeekly,
        weekStartDate: saved?.weekStartDate ?? weekStartDate,
        status,
      };
      try {
        const result = saved
          ? await saveTraineeCardioSession(traineeId, saved.id, payload)
          : await createTraineeCardioSession(traineeId, payload);
        setSaved(result);
        return result;
      } finally {
        saving.current = false;
        setIsSaving(false);
      }
    },
  };
}

export type CardioBuilder = ReturnType<typeof useCardioBuilder>;
