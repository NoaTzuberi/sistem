import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { extractErrorMessage } from '@sistem/api-client';
import type { CardioSession, CardioSessionStatus, CoachPlan } from '@sistem/types';
import { cardioMetricLabel, cardioSportLabel, fill, getActiveLanguage, useCopy, useLanguage } from '@sistem/shared';
import { cardioBuilderPath, planPath } from '../../../../app/config/routes';
import type { ActionMenuItem } from '../../../../components/common/ActionMenu/ActionMenu';
import { Toast } from '../../../../components/common/Toast/Toast';
import { useToast } from '../../../../hooks/useToast';
import { deleteTraineeCardioSession } from '../../../../services/cardio/cardioService';
import { cardioCopy } from '../../copy';
import { CARDIO_METRICS, CARDIO_SPORTS } from '../../data/cardioPresets';
import { useCardioBuilder } from '../../hooks/useCardioBuilder';
import { CardioAddBar } from '../CardioAddBar/CardioAddBar';
import { CardioBlockRow } from '../CardioBlockRow/CardioBlockRow';
import { CardioBuilderHeader } from '../CardioBuilderHeader/CardioBuilderHeader';
import { CardioDayPicker } from '../CardioDayPicker/CardioDayPicker';
import { CardioGraph } from '../CardioGraph/CardioGraph';
import { CardioPreview } from '../CardioPreview/CardioPreview';
import { CardioRepeatSet } from '../CardioRepeatSet/CardioRepeatSet';
import { CardioSegmented } from '../CardioSegmented/CardioSegmented';
import { CardioSummary } from '../CardioSummary/CardioSummary';
import '../../cardioZones.css';
import './CardioBuilder.css';

interface CardioBuilderProps {
  traineeId: string;
  traineeName: string;
  plan: CoachPlan;
  weekNumber: number;
  session: CardioSession | null;
}

/** The coach's cardio builder (docs/design/coach-cardio-builder.html): session, graph, blocks; days, note, preview. */
export function CardioBuilder({ traineeId, traineeName, plan, weekNumber, session }: CardioBuilderProps) {
  const copy = useCopy(cardioCopy);
  const language = useLanguage();
  const navigate = useNavigate();
  const { toastMessage, showToast } = useToast();
  const builder = useCardioBuilder({ traineeId, weekStartDate: plan.weekStartDate, session, defaultNames: copy.defaultNames });
  const { draft, frames, totals, selectedId } = builder;
  const strengthDays = useMemo(
    () => new Set(plan.workouts.map((workout) => workout.dayOfWeek).filter((day): day is number => day !== undefined)),
    [plan.workouts],
  );
  const backTo = planPath(traineeId, plan.id);

  async function save(status: CardioSessionStatus) {
    try {
      const result = await builder.save(status);
      if (!result) return;
      const text = cardioCopy[getActiveLanguage()];
      showToast(status === 'active' ? fill(text.toastAdded, { name: traineeName }) : text.toastDraft);
      // A new session gets its own address, so a reload opens it.
      if (!builder.saved) navigate(cardioBuilderPath(traineeId, plan.id, result.id), { replace: true });
    } catch (error) {
      showToast(extractErrorMessage(error, cardioCopy[getActiveLanguage()].saveError));
    }
  }

  async function handleDelete() {
    const saved = builder.saved;
    if (!saved || !window.confirm(copy.removeConfirm)) return;
    try {
      await deleteTraineeCardioSession(traineeId, saved.id);
      navigate(backTo);
    } catch (error) {
      showToast(extractErrorMessage(error, cardioCopy[getActiveLanguage()].saveError));
    }
  }

  const menuItems: ActionMenuItem[] = builder.saved ? [{ id: 'delete', label: copy.remove, danger: true, onSelect: () => void handleDelete() }] : [];
  const blockHandlers = {
    onToggle: builder.toggleSelected,
    onKind: builder.setKind,
    onDuration: builder.changeDuration,
    onIntensity: builder.changeIntensity,
    onRemove: builder.remove,
  };

  function selectFromGraph(id: string) {
    const opening = selectedId !== id;
    builder.toggleSelected(id);
    if (!opening) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(() =>
      document.querySelector(`[data-block-id="${id}"]`)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }),
    );
  }

  return (
    <div className="cb-page">
      <CardioBuilderHeader
        traineeId={traineeId}
        traineeName={traineeName}
        weekNumber={weekNumber}
        backTo={backTo}
        isNew={!builder.saved}
        isSaving={builder.isSaving}
        menuItems={menuItems}
        onSaveDraft={() => void save('draft')}
        onAdd={() => void save('active')}
      />
      <div className="cb-grid">
        <main className="cb-main">
          <section className="cb-card">
            <label className="cb-label" htmlFor="cb-name">
              {copy.nameLabel}
            </label>
            <input
              className="cb-name"
              id="cb-name"
              dir="auto"
              value={draft.name}
              placeholder={copy.namePlaceholder}
              maxLength={80}
              onChange={(event) => builder.setName(event.target.value)}
            />
            <div className="cb-row2">
              <div>
                <span className="cb-label" id="cb-sport-label">
                  {copy.sportLabel}
                </span>
                <CardioSegmented
                  label={copy.sportLabel}
                  labelledBy="cb-sport-label"
                  options={CARDIO_SPORTS.map((id) => ({ id, label: cardioSportLabel(id, language) }))}
                  value={draft.sport}
                  onChange={builder.setSport}
                />
              </div>
              <div>
                <span className="cb-label" id="cb-metric-label">
                  {copy.metricLabel}
                </span>
                <CardioSegmented
                  label={copy.metricGroup}
                  labelledBy="cb-metric-label"
                  options={CARDIO_METRICS.map((id) => ({ id, label: cardioMetricLabel(id, language) }))}
                  value={draft.metric}
                  onChange={builder.setMetric}
                />
              </div>
            </div>

            <CardioSummary totals={totals} stepCount={frames.length} />
            <CardioGraph frames={frames} totalSec={totals.totalSec} metric={draft.metric} selectedId={selectedId} onSelect={selectFromGraph} />

            <div className="cb-structure-head">
              <h2 className="cb-structure-title">{copy.structure}</h2>
              <small className="cb-structure-hint">{copy.structureHint}</small>
            </div>
            {draft.steps.map((step) =>
              step.type === 'repeat' ? (
                <CardioRepeatSet
                  key={step.id}
                  step={step}
                  metric={draft.metric}
                  selectedId={selectedId}
                  onTimes={(direction) => builder.changeTimes(step.id, direction)}
                  onRemove={() => builder.remove(step.id)}
                  blockHandlers={blockHandlers}
                />
              ) : (
                <CardioBlockRow
                  key={step.id}
                  block={step}
                  metric={draft.metric}
                  isOpen={selectedId === step.id}
                  onToggle={() => builder.toggleSelected(step.id)}
                  onKind={(kind) => builder.setKind(step.id, kind)}
                  onDuration={(direction) => builder.changeDuration(step.id, direction)}
                  onIntensity={(direction) => builder.changeIntensity(step.id, direction)}
                  onRemove={() => builder.remove(step.id)}
                />
              ),
            )}
            <CardioAddBar onAdd={builder.add} />
          </section>
        </main>

        <aside className="cb-side">
          <CardioDayPicker
            days={draft.days}
            strengthDays={strengthDays}
            repeatsWeekly={draft.repeatsWeekly}
            onToggle={builder.toggleDay}
            onRepeatsWeekly={builder.setRepeatsWeekly}
          />
          <section className="cb-card" aria-labelledby="cb-note-title">
            <h3 className="cb-side-title" id="cb-note-title">
              <label htmlFor="cb-note">{copy.noteTitle}</label>
            </h3>
            <textarea
              className="cb-note"
              id="cb-note"
              dir="auto"
              value={draft.note}
              placeholder={copy.notePlaceholder}
              maxLength={1000}
              onChange={(event) => builder.setNote(event.target.value)}
            />
          </section>
          <CardioPreview name={draft.name} sport={draft.sport} totalSec={totals.totalSec} frames={frames} days={draft.days} repeatsWeekly={draft.repeatsWeekly} />
        </aside>
      </div>
      <Toast message={toastMessage} />
    </div>
  );
}
