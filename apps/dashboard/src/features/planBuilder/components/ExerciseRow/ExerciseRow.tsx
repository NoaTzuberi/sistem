import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from '../../../../components/common/Icon/Icon';
import { Select } from '../../../../components/common/Select/Select';
import { Switch } from '../../../../components/common/Switch/Switch';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import { fill, humanizeId, isolateLtr, useCopy, useLanguage, variantLabel } from '@sistem/shared';
import type { ExerciseFacts, PlanProgression } from '@sistem/types';
import type { ProgressChip } from '../../data/blockWeeks';
import { exerciseSpec } from '../../data/planStats';
import { SUPERSET_LABELS } from '../../data/planDefaults';
import { isTimedExercise, toPerSetTargets, toSimpleTargets } from '../../planDraft';
import type { DraftExercise } from '../../types';
import { ExerciseField } from '../ExerciseField/ExerciseField';
import { SetTargetsTable } from '../SetTargetsTable/SetTargetsTable';
import { VariantPanel } from '../VariantPanel/VariantPanel';
import './ExerciseRow.css';
import { planBuilderCopy } from '../../copy';

interface ExerciseRowProps {
  traineeId: string;
  exercise: DraftExercise;
  /** Open for editing — the workout keeps only one row open. */
  isExpanded: boolean;
  index: number;
  count: number;
  /** Problems the server reported for this exercise on the last save / publish. */
  issues: string[];
  /** Superset hint while editing. */
  warning?: string;
  onToggle: () => void;
  onChange: (exercise: DraftExercise) => void;
  /** Interval on / off — the workout applies it to the whole superset. */
  onIntervalChange: (interval: boolean) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  /**
   * Multi-week plans only: `chip` = what changed vs the week before ("+2.5 ק״ג ↑"); `showRule` = this
   * week is the one copied forward, so its rule shows on the row and can be changed in the editor.
   */
  block?: { chip: ProgressChip | null; showRule: boolean };
}

/**
 * One exercise as a card: a thumbnail, its name, and the big spec ("3 × 12–15", its rest under
 * it). The whole card is the toggle; open, it shows the fields and everything that changes or
 * removes the exercise.
 */
export function ExerciseRow({
  traineeId,
  exercise,
  isExpanded,
  index,
  count,
  issues,
  warning,
  onToggle,
  onChange,
  onIntervalChange,
  onMove,
  onRemove,
  block,
}: ExerciseRowProps) {
  const copy = useCopy(planBuilderCopy);
  const language = useLanguage();
  const [showVariants, setShowVariants] = useState(false);
  const weightRef = useRef<HTMLInputElement>(null);
  const editId = useId();
  const name = exercise.facts?.name ?? copy.missingExercise;
  const facts = exercise.facts
    ? [...exercise.facts.primaryMuscles, ...exercise.facts.equipment, exercise.facts.difficulty].map(humanizeId).join(' · ')
    : '';
  const isPerSet = exercise.setTargets !== null;
  const hasProblem = issues.length > 0;
  const spec = exerciseSpec(exercise);
  const blockText = copy.block;
  const ruleLabel = (rule: PlanProgression | undefined) =>
    rule === 'weight'
      ? fill(blockText.progressionWeight, { amount: isolateLtr('+2.5') })
      : rule === 'reps'
        ? fill(blockText.progressionReps, { amount: isolateLtr('+1') })
        : blockText.progressionNone;
  const chip = block?.chip;
  const chipText = !chip
    ? null
    : chip.kind === 'deload'
      ? fill(blockText.chipDeload, { amount: isolateLtr('−30%') })
      : fill(chip.kind === 'weight' ? blockText.chipWeight : blockText.chipReps, { amount: isolateLtr(`+${chip.amount}`) });
  // Under the name: the first muscle it works, and its weight when one is set.
  const underName = [
    exercise.facts?.primaryMuscles[0] ? humanizeId(exercise.facts.primaryMuscles[0]) : undefined,
    exercise.targetWeight !== undefined ? fill(copy.summaryWeight, { count: exercise.targetWeight }) : undefined,
  ].filter(Boolean);

  // Opening a row puts the cursor in its weight — the number that changes most from week to week.
  const wasExpanded = useRef(isExpanded);
  useEffect(() => {
    if (isExpanded && !wasExpanded.current) weightRef.current?.focus();
    wasExpanded.current = isExpanded;
  }, [isExpanded]);

  // Another variant of the same family: the targets, notes and slot stay; the server sees a new exercise id.
  function handleSwap(facts: ExerciseFacts) {
    onChange({ ...exercise, exerciseId: facts.id, facts });
  }

  function handleBackToSimple() {
    if (window.confirm(copy.backToSimpleConfirm)) {
      onChange(toSimpleTargets(exercise));
    }
  }

  return (
    <li className={isExpanded ? 'exercise-card exercise-card-open' : 'exercise-card'}>
      <button className="exercise-main" type="button" aria-expanded={isExpanded} aria-controls={isExpanded ? editId : undefined} onClick={onToggle}>
        {/* The library is facts only (no media yet), so the tile is the fallback: the workout's color and an icon. */}
        <span className="exercise-thumb" aria-hidden="true">
          {exercise.supersetGroup ? <span className="exercise-superset-letter">{exercise.supersetGroup}</span> : <Icon name="dumbbell" />}
        </span>
        <span className="exercise-text">
          <bdi className="exercise-name">{name}</bdi>
          {underName.length > 0 && (
            <span className="exercise-under">
              {/* Each part keeps its own direction (an English muscle id next to "22.5 ק״ג"). */}
              {underName.map((part, partIndex) => (
                <span key={part}>
                  {partIndex > 0 && ' · '}
                  <bdi>{part}</bdi>
                </span>
              ))}
            </span>
          )}
          {chipText && <span className="exercise-progress">{chipText}</span>}
          {block?.showRule && exercise.progression && <span className="exercise-progress-rule">{ruleLabel(exercise.progression)}</span>}
        </span>
        <span className="exercise-spec">
          <span className="exercise-spec-main">
            {spec.amount === undefined ? (
              <span className="exercise-spec-words">
                {isPerSet ? `${fill(copy.summarySets, { count: spec.sets })} · ${copy.perSetTargets}` : fill(copy.summarySets, { count: spec.sets })}
              </span>
            ) : (
              <>
                {/* "3 × 12–15" reads left to right in Hebrew too. */}
                <span className="exercise-spec-number" dir="ltr">
                  {spec.sets}
                  <span className="exercise-spec-times">×</span>
                  {spec.amount}
                </span>
                {spec.isSeconds && <span className="exercise-spec-unit">{copy.secondsShort}</span>}
              </>
            )}
          </span>
          {(exercise.restSec !== undefined || exercise.interval) && (
            <span className="exercise-rest">
              {exercise.restSec !== undefined && (
                <>
                  <Icon name="clock" size="sm" className="exercise-rest-icon" />
                  {fill(copy.summarySeconds, { count: isolateLtr(String(exercise.restSec)) })}
                </>
              )}
              {exercise.interval && <span>{copy.interval}</span>}
            </span>
          )}
        </span>
        <span className="exercise-chevron" aria-hidden="true" />
      </button>

      {/* Problems show on the closed row too: she must not have to open every row to find one. */}
      {(hasProblem || warning) && (
        <ul className="exercise-problems">
          {issues.map((message) => (
            <li key={message} className="exercise-issue" role="alert">
              {message}
            </li>
          ))}
          {warning && !issues.includes(warning) && <li className="exercise-warning">{warning}</li>}
        </ul>
      )}

      {isExpanded && (
        <div className="exercise-editor" id={editId}>
          {facts && <p className="exercise-facts">{facts}</p>}

          {!isPerSet && (
            <div className="exercise-fields">
              <ExerciseField label={copy.sets} min={1} value={exercise.sets} onChange={(sets) => onChange({ ...exercise, sets })} />
              {exercise.mode === 'reps' ? (
                <ExerciseField
                  label={copy.reps}
                  min={1}
                  value={exercise.reps}
                  onChange={(reps) => onChange({ ...exercise, reps })}
                  range={{ label: copy.toOptional, value: exercise.repsMax, onChange: (repsMax) => onChange({ ...exercise, repsMax }) }}
                />
              ) : (
                <ExerciseField label={copy.seconds} min={1} value={exercise.durationSec} onChange={(durationSec) => onChange({ ...exercise, durationSec })} />
              )}
              <ExerciseField
                label={copy.weightKg}
                step={0.5}
                value={exercise.targetWeight}
                inputRef={weightRef}
                onChange={(targetWeight) => onChange({ ...exercise, targetWeight })}
              />
              <ExerciseField label={copy.restSec} value={exercise.restSec} onChange={(restSec) => onChange({ ...exercise, restSec })} />
            </div>
          )}

          {exercise.setTargets && (
            <SetTargetsTable targets={exercise.setTargets} onChange={(setTargets) => onChange({ ...exercise, setTargets })} />
          )}

          <div className="exercise-options">
            {!isPerSet && (
              <div className="exercise-mode" role="group" aria-label={copy.countBy}>
                <button className="exercise-mode-option" type="button" aria-pressed={exercise.mode === 'reps'} onClick={() => onChange({ ...exercise, mode: 'reps' })}>
                  {copy.reps}
                </button>
                <button className="exercise-mode-option" type="button" aria-pressed={exercise.mode === 'time'} onClick={() => onChange({ ...exercise, mode: 'time' })}>
                  {copy.time}
                </button>
              </div>
            )}

            <label className="exercise-superset">
              <span className="exercise-option-label">{copy.superset}</span>
              <Select
                className="exercise-superset-select"
                value={exercise.supersetGroup}
                onChange={(event) => onChange({ ...exercise, supersetGroup: event.target.value })}
              >
                <option value="">—</option>
                {SUPERSET_LABELS.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
                {/* A label from an older plan that is not in the list. */}
                {exercise.supersetGroup && !(SUPERSET_LABELS as readonly string[]).includes(exercise.supersetGroup) && (
                  <option value={exercise.supersetGroup}>{exercise.supersetGroup}</option>
                )}
              </Select>
            </label>

            {/* Multi-week plans: how it grows when this week is copied forward. */}
            {block?.showRule && (
              <label className="exercise-superset">
                <span className="exercise-option-label">{blockText.progressionLabel}</span>
                <Select
                  className="exercise-progression-select"
                  value={exercise.progression ?? ''}
                  onChange={(event) => onChange({ ...exercise, progression: (event.target.value || undefined) as PlanProgression | undefined })}
                >
                  <option value="">{ruleLabel(undefined)}</option>
                  <option value="weight">{ruleLabel('weight')}</option>
                  <option value="reps">{ruleLabel('reps')}</option>
                </Select>
              </label>
            )}

            {/* Shown for timed exercises (and to switch off a flag that no longer fits). */}
            {(isTimedExercise(exercise) || exercise.interval) && (
              <Switch
                className="exercise-interval"
                checked={exercise.interval}
                onChange={onIntervalChange}
                label={
                  <>
                    <span>{copy.interval}</span>{' '}
                    <span className="exercise-interval-hint">
                      {exercise.supersetGroup ? fill(copy.wholeSuperset, { group: exercise.supersetGroup }) : ''}
                      {copy.intervalHint}
                    </span>
                  </>
                }
              />
            )}

            <div className="exercise-options-end">
              {isPerSet ? (
                <PillButton size="sm" onClick={handleBackToSimple}>
                  {copy.backToSimple}
                </PillButton>
              ) : (
                <PillButton size="sm" onClick={() => onChange({ ...exercise, setTargets: toPerSetTargets(exercise) })}>
                  {copy.perSetTargets}
                </PillButton>
              )}
              <PillButton size="sm" aria-label={fill(copy.moveUpNamed, { name: name })} disabled={index === 0} onClick={() => onMove(-1)}>
                ↑
              </PillButton>
              <PillButton size="sm" aria-label={fill(copy.moveDownNamed, { name: name })} disabled={index === count - 1} onClick={() => onMove(1)}>
                ↓
              </PillButton>
            </div>
          </div>

          <label className="exercise-notes">
            <span className="exercise-option-label">{copy.notesLabel}</span>
            <textarea
              className="exercise-notes-input"
              rows={2}
              dir="auto"
              value={exercise.notes}
              onChange={(event) => onChange({ ...exercise, notes: event.target.value })}
            />
          </label>

          {showVariants && exercise.facts?.familyId && <VariantPanel traineeId={traineeId} facts={exercise.facts} onSwap={handleSwap} />}

          <div className="exercise-actions">
            <button className="exercise-text-button exercise-text-button-danger" type="button" onClick={onRemove}>
              {copy.removeExercise}
            </button>
            {exercise.facts?.familyId && (
              <button className="exercise-text-button exercise-text-button-accent" type="button" aria-expanded={showVariants} onClick={() => setShowVariants((open) => !open)}>
                {showVariants ? copy.hideVariants : `${copy.swapVariant} · ${variantLabel(exercise.facts.variant, language)}`}
              </button>
            )}
            <button className="exercise-text-button" type="button" onClick={onToggle}>
              {copy.done}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
