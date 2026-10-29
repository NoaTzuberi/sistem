import { fill, findWorkoutType, formatPlural, groupBySlot, slotLabel, useCopy, useLanguage } from '@sistem/shared';
import { useState } from 'react';
import type { AiPlanExercise, PlanIssue, TrainingConfig, TrainingSlot } from '@sistem/types';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import { changeWorkoutType, moveItem, newExercise, orderBySlots, removeExercise, setIntervalFlag, supersetWarnings } from '../../planDraft';
import type { DraftExercise, DraftWorkout } from '../../types';
import { workoutLetter } from '../../data/workoutLetters';
import { ExerciseRow } from '../ExerciseRow/ExerciseRow';
import { SlotSection } from '../SlotSection/SlotSection';
import { WorkoutHero } from '../WorkoutHero/WorkoutHero';
import './WorkoutCard.css';
import { planBuilderCopy } from '../../copy';

interface WorkoutCardProps {
  traineeId: string;
  workout: DraftWorkout;
  /** The class that carries this workout's identity color (workoutColorClass). */
  colorClass: string;
  /** The coach's workout types and slots (null while loading: shown as a free workout). */
  config: TrainingConfig | null;
  /** The AI's picks for this workout's slots (Phase 12b drafts of the same split), offered in empty slots. */
  suggestions?: AiPlanExercise[];
  /** Its place in the plan's order (what the trainee's list follows). */
  index: number;
  count: number;
  /** A workout just added: its name field takes the focus so she names it right away. */
  autoFocusTitle?: boolean;
  /** Problems the server reported for this workout and its exercises. */
  issues: PlanIssue[];
  onChange: (workout: DraftWorkout) => void;
  onMove: (direction: -1 | 1) => void;
  onDuplicate: () => void;
  /** Deletes this workout only — at once, the page offers "Undo". */
  onRemove: () => void;
  onExerciseRemoved: (name: string) => void;
  /** Open the exercise library for this workout — for one slot ("+ Add" on it), or for all exercises. */
  onAddExercise: (slot?: TrainingSlot) => void;
}

/**
 * The selected workout: its hero band, then its exercises as cards — one open at a time —
 * inside their slots when the workout has a type.
 */
export function WorkoutCard({
  traineeId,
  workout,
  colorClass,
  config,
  suggestions,
  index,
  count,
  autoFocusTitle,
  issues,
  onChange,
  onMove,
  onDuplicate,
  onRemove,
  onExerciseRemoved,
  onAddExercise,
}: WorkoutCardProps) {
  const language = useLanguage();
  const copy = useCopy(planBuilderCopy);
  const title = workout.title.trim() || fill(copy.workoutPlaceholder, { n: index + 1 });
  const { exercises } = workout;
  const warnings = supersetWarnings(exercises, copy);
  const workoutIssues = issues.filter((issue) => issue.exerciseIndex === undefined);
  const type = findWorkoutType(config, workout.workoutType);
  // The one open card.
  const [expandedKey, setExpandedKey] = useState<string>();

  // A typed workout keeps its exercises grouped by slot.
  function setExercises(next: DraftExercise[]) {
    onChange({ ...workout, exercises: orderBySlots(next, type) });
  }

  function handleTypeChange(typeId: string) {
    if (exercises.length > 0 && !window.confirm(copy.changeTypeConfirm)) return;
    onChange(changeWorkoutType(workout, findWorkoutType(config, typeId || undefined)));
  }

  function handleUseSuggestion(suggestion: AiPlanExercise) {
    if (!suggestion.exercise) return;
    const exercise = {
      ...newExercise(suggestion.exercise, suggestion.slotId),
      mode: suggestion.durationSec != null && suggestion.reps == null ? ('time' as const) : ('reps' as const),
      sets: suggestion.sets,
      reps: suggestion.reps ?? undefined,
      repsMax: suggestion.repsMax ?? undefined,
      durationSec: suggestion.durationSec ?? undefined,
      restSec: suggestion.restSec ?? undefined,
    };
    setExercises([...exercises, exercise]);
  }

  /** The AI's picks for a slot that aren't in the workout yet. */
  function slotSuggestions(slot: TrainingSlot): AiPlanExercise[] {
    return (suggestions ?? []).filter(
      (suggestion) => suggestion.slotId === slot.id && suggestion.exercise && !exercises.some((exercise) => exercise.exerciseId === suggestion.exerciseId),
    );
  }

  function handleRemoveExercise(exercise: DraftExercise) {
    onChange(removeExercise(workout, exercise.key));
    setExpandedKey(undefined);
    onExerciseRemoved(exercise.facts?.name ?? copy.missingExercise);
  }

  function renderRow(exercise: DraftExercise, exerciseIndex: number) {
    return (
      <ExerciseRow
        key={exercise.key}
        traineeId={traineeId}
        exercise={exercise}
        isExpanded={exercise.key === expandedKey}
        index={exerciseIndex}
        count={exercises.length}
        issues={issues.filter((issue) => issue.exerciseIndex === exerciseIndex).map((issue) => issue.message)}
        warning={warnings.get(exercise.key)}
        onToggle={() => setExpandedKey(exercise.key === expandedKey ? undefined : exercise.key)}
        onChange={(next) => setExercises(exercises.map((other) => (other.key === next.key ? next : other)))}
        onIntervalChange={(interval) => setExercises(setIntervalFlag(exercises, exercise.key, interval))}
        onMove={(direction) => setExercises(moveItem(exercises, exerciseIndex, exerciseIndex + direction))}
        onRemove={() => handleRemoveExercise(exercise)}
      />
    );
  }

  // A removed suggestion stays hidden while it is empty (an exercise in it shows it again).
  const hidden = new Set(workout.hiddenSlotIds ?? []);
  const grouped = type ? groupBySlot(exercises, type) : null;
  const sections = grouped ? grouped.sections.filter(({ slot, exerciseIndexes }) => !hidden.has(slot.id) || exerciseIndexes.length > 0) : [];
  const hiddenCount = grouped ? grouped.sections.length - sections.length : 0;

  function hideSlot(slotId: string) {
    onChange({ ...workout, hiddenSlotIds: [...hidden, slotId] });
  }
  // The hero's chips: the slots that already have an exercise.
  const coveredGroups = grouped ? grouped.sections.filter((section) => section.exerciseIndexes.length > 0).map((section) => slotLabel(section.slot, language)) : [];

  return (
    <section className={`workout-card ${colorClass}`} aria-label={title}>
      <WorkoutHero
        workout={workout}
        config={config}
        type={type}
        letter={workoutLetter(index)}
        autoFocusTitle={autoFocusTitle}
        defaultTitle={fill(copy.workoutPlaceholder, { n: index + 1 })}
        coveredGroups={coveredGroups}
        menuItems={[
          { id: 'up', label: fill(copy.moveUpNamed, { name: title }), disabled: index === 0, onSelect: () => onMove(-1) },
          { id: 'down', label: fill(copy.moveDownNamed, { name: title }), disabled: index === count - 1, onSelect: () => onMove(1) },
          { id: 'duplicate', label: copy.duplicate, onSelect: onDuplicate },
          { id: 'delete', label: copy.deleteWorkout, danger: true, onSelect: onRemove },
        ]}
        onDelete={onRemove}
        deleteLabel={fill(copy.deleteWorkoutNamed, { name: title })}
        onChange={onChange}
        onTypeChange={handleTypeChange}
      />

      <div className="workout-slots">
        {workoutIssues.length > 0 && (
          <ul className="workout-issues">
            {workoutIssues.map((issue) => (
              <li key={issue.message} role="alert">
                {issue.message}
              </li>
            ))}
          </ul>
        )}

        {grouped ? (
          <>
            {sections.map(({ slot, exerciseIndexes }) => (
              <SlotSection
                key={slot.id}
                name={slotLabel(slot, language)}
                slot={{ onAdd: () => onAddExercise(slot), onRemove: () => hideSlot(slot.id) }}
                count={exerciseIndexes.length}
              >
                {exerciseIndexes.map((exerciseIndex) => renderRow(exercises[exerciseIndex], exerciseIndex))}
                {exerciseIndexes.length === 0 &&
                  slotSuggestions(slot).map((suggestion) => (
                    <li key={suggestion.exerciseId} className="workout-suggestion">
                      <span className="workout-suggestion-tag">✦ {copy.aiSuggestion}</span>
                      <bdi className="workout-suggestion-name">{suggestion.exercise?.name}</bdi>
                      <span className="workout-suggestion-why" dir="auto">
                        {suggestion.why}
                      </span>
                      <PillButton size="sm" onClick={() => handleUseSuggestion(suggestion)}>
                        {copy.useSuggestion}
                      </PillButton>
                    </li>
                  ))}
              </SlotSection>
            ))}
            {hiddenCount > 0 && (
              <button className="workout-restore" type="button" onClick={() => onChange({ ...workout, hiddenSlotIds: undefined })}>
                {formatPlural(language, copy.restoreSuggestions, hiddenCount)}
              </button>
            )}
            {grouped.other.length > 0 && (
              <SlotSection name={copy.otherSlot} count={grouped.other.length}>
                {grouped.other.map((exerciseIndex) => renderRow(exercises[exerciseIndex], exerciseIndex))}
              </SlotSection>
            )}
          </>
        ) : (
          // A free workout has no slots: one plain group.
          <SlotSection name={copy.statExercises} count={exercises.length}>
            {exercises.map((exercise, exerciseIndex) => renderRow(exercise, exerciseIndex))}
          </SlotSection>
        )}

        {/* Any exercise, whatever its slot: a typed workout puts it in the first slot it fits, else "Other". */}
        <button className="workout-add" type="button" onClick={() => onAddExercise()}>
          {copy.addExercise}
        </button>
      </div>
    </section>
  );
}
