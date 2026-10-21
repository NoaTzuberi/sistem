import type { PlanCardio } from '@sistem/types';
import { cardioMetricLabel, cardioSportLabel, useCopy, useLanguage } from '@sistem/shared';
import { cardioCopy } from '../../copy';
import { stepsEyebrow } from '../../data/cardioLabels';
import { CARDIO_METRICS, CARDIO_SPORTS } from '../../data/cardioPresets';
import { useCardioEditor } from '../../hooks/useCardioEditor';
import { CardioAddBar } from '../CardioAddBar/CardioAddBar';
import { CardioBlockRow } from '../CardioBlockRow/CardioBlockRow';
import { CardioGraph } from '../CardioGraph/CardioGraph';
import { CardioRepeatSet } from '../CardioRepeatSet/CardioRepeatSet';
import { CardioSegmented } from '../CardioSegmented/CardioSegmented';
import '../../cardioZones.css';
import './CardioEditor.css';

interface CardioEditorProps {
  /** The workout's key: ids of its labels stay unique when the card is swapped. */
  workoutKey: string;
  cardio: PlanCardio;
  onChange: (cardio: PlanCardio) => void;
}

/** A cardio workout's body in the plan builder (docs/design/coach-cardio-builder.html): type, metric, graph, blocks. */
export function CardioEditor({ workoutKey, cardio, onChange }: CardioEditorProps) {
  const copy = useCopy(cardioCopy);
  const language = useLanguage();
  const editor = useCardioEditor(cardio, onChange);
  const { frames, totals, selectedId } = editor;
  const sportLabel = `cb-sport-${workoutKey}`;
  const metricLabel = `cb-metric-${workoutKey}`;
  const blockHandlers = {
    onToggle: editor.toggleSelected,
    onKind: editor.setKind,
    onDuration: editor.changeDuration,
    onIntensity: editor.changeIntensity,
    onRemove: editor.remove,
  };

  function selectFromGraph(id: string) {
    const opening = selectedId !== id;
    editor.toggleSelected(id);
    if (!opening) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(() => document.querySelector(`[data-block-id="${id}"]`)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }));
  }

  return (
    <div className="cb-editor">
      <div className="cb-editor-row">
        <div>
          <span className="cb-editor-label" id={sportLabel}>
            {copy.sportLabel}
          </span>
          <CardioSegmented
            label={copy.sportLabel}
            labelledBy={sportLabel}
            options={CARDIO_SPORTS.map((id) => ({ id, label: cardioSportLabel(id, language) }))}
            value={cardio.sport}
            onChange={editor.setSport}
          />
        </div>
        <div>
          <span className="cb-editor-label" id={metricLabel}>
            {copy.metricLabel}
          </span>
          <CardioSegmented
            label={copy.metricGroup}
            labelledBy={metricLabel}
            options={CARDIO_METRICS.map((id) => ({ id, label: cardioMetricLabel(id, language) }))}
            value={cardio.metric}
            onChange={editor.setMetric}
          />
        </div>
      </div>

      <code className="cb-editor-eyebrow" aria-hidden="true">
        {stepsEyebrow(frames.length)}
      </code>
      <CardioGraph frames={frames} totalSec={totals.totalSec} metric={cardio.metric} selectedId={selectedId} onSelect={selectFromGraph} />

      <div className="cb-editor-head">
        <h3 className="cb-editor-title">{copy.structure}</h3>
        <small className="cb-editor-hint">{copy.structureHint}</small>
      </div>
      {cardio.steps.map((step) =>
        step.type === 'repeat' ? (
          <CardioRepeatSet
            key={step.id}
            step={step}
            metric={cardio.metric}
            selectedId={selectedId}
            onTimes={(direction) => editor.changeTimes(step.id, direction)}
            onRemove={() => editor.remove(step.id)}
            blockHandlers={blockHandlers}
          />
        ) : (
          <CardioBlockRow
            key={step.id}
            block={step}
            metric={cardio.metric}
            isOpen={selectedId === step.id}
            onToggle={() => editor.toggleSelected(step.id)}
            onKind={(kind) => editor.setKind(step.id, kind)}
            onDuration={(direction) => editor.changeDuration(step.id, direction)}
            onIntensity={(direction) => editor.changeIntensity(step.id, direction)}
            onRemove={() => editor.remove(step.id)}
          />
        ),
      )}
      <CardioAddBar onAdd={editor.add} />
    </div>
  );
}
