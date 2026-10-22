import type { LastPerformance, WorkoutSession } from '@sistem/types';
import { describeInterval, fill, humanizeId, sharedCopy, useCopy, useLanguage } from '@sistem/shared';
import { IconHistory, IconPlayerPlayFilled, IconPlus } from '@tabler/icons-react';
import { isIntervalBlock, prescriptionOf } from '../../data/sessionSets';
import type { SessionBlock, SessionExercise, SetValues, SetValuesByKey } from '../../data/sessionSets';
import { MAX_SETS_PER_EXERCISE } from '../../data/sessionConfig';
import { formatRange, formatRest, lastTimeLabel, setTag } from '../../data/workoutDisplay';
import { nameScript } from '../../data/weekPlanDisplay';
import { workoutCopy } from '../../copy';
import { ExerciseMediaSlot } from '../ExerciseMediaSlot/ExerciseMediaSlot';
import { PlayerSetRow } from '../PlayerSetRow/PlayerSetRow';
import './PlayerExercise.css';

export interface SetHandlers {
  onEdit: (key: string, patch: Partial<Omit<SetValues, 'completed'>>) => void;
  onToggle: (key: string) => void;
  onStartHold: (key: string) => void;
  onStopHold: () => void;
}

interface PlayerExerciseProps extends SetHandlers {
  block: SessionBlock;
  /** The block holding the set to do now: the pink "Now" pill. */
  isCurrent: boolean;
  values: SetValuesByKey;
  currentKey: string | null;
  lastPerformance: WorkoutSession['lastPerformance'];
  hold: { key: string; remainingMs: number } | null;
  onAddSet: (planExerciseId: string) => void;
  onStartInterval: () => void;
}

const BODYWEIGHT_EQUIPMENT = 'bodyweight';

/**
 * The exercise on screen (or the exercises of one superset, done back to back): its name, library
 * facts as chips (no imported text), what the coach prescribed, last time, the coach's notes as the
 * instructions, and one row per set.
 */
export function PlayerExercise({ block, isCurrent, values, currentKey, lastPerformance, hold, onAddSet, onStartInterval, ...handlers }: PlayerExerciseProps) {
  const language = useLanguage();
  const copy = useCopy(workoutCopy);
  const interval = isIntervalBlock(block);
  const isDone = block.exercises.every((exercise) => exercise.sets.every((set) => values[set.key]?.completed));

  return (
    <section className="wp-exercise" aria-labelledby={`wp-exercise-${block.id}-0`}>
      {(isCurrent || block.supersetGroup) && (
        <div className="wp-exercise-tags">
          {isCurrent && (
            <span className="wp-exercise-now">
              <i aria-hidden="true" />
              {copy.session.now}
            </span>
          )}
          {block.supersetGroup && <span className="wp-exercise-superset">{fill(copy.session.supersetLabel, { group: block.supersetGroup })}</span>}
        </div>
      )}

      {interval && !isDone && (
        <div className="wp-exercise-interval">
          {/* One line per circuit: rounds and the first exercise's work / rest. */}
          <span>{describeInterval(block.exercises[0].plan, language)}</span>
          <button type="button" className="wp-exercise-interval-start" onClick={onStartInterval}>
            <IconPlayerPlayFilled size={16} aria-hidden="true" />
            {copy.interval.startInterval}
          </button>
        </div>
      )}

      {block.exercises.map((exercise, index) => (
        <ExerciseCard
          key={exercise.plan.id}
          headingId={`wp-exercise-${block.id}-${index}`}
          exercise={exercise}
          position={block.supersetGroup ? `${block.supersetGroup}${index + 1}` : undefined}
          values={values}
          currentKey={currentKey}
          lastPerformance={lastPerformance[exercise.plan.exerciseId]}
          hold={hold}
          interval={interval}
          onAddSet={() => onAddSet(exercise.plan.id)}
          {...handlers}
        />
      ))}
    </section>
  );
}

interface ExerciseCardProps extends SetHandlers {
  headingId: string;
  exercise: SessionExercise;
  position?: string;
  values: SetValuesByKey;
  currentKey: string | null;
  lastPerformance?: LastPerformance;
  hold: { key: string; remainingMs: number } | null;
  interval: boolean;
  onAddSet: () => void;
}

function ExerciseCard({ headingId, exercise, position, values, currentKey, lastPerformance, hold, interval, onAddSet, onEdit, onToggle, onStartHold, onStopHold }: ExerciseCardProps) {
  const language = useLanguage();
  const copy = useCopy(workoutCopy);
  const shared = useCopy(sharedCopy);
  const facts = exercise.plan.exercise;
  const name = facts?.name ?? shared.log.exercise;
  const chips = facts ? [...facts.primaryMuscles, ...facts.equipment, facts.difficulty].filter(Boolean).map(humanizeId) : [];
  const prescription = prescriptionOf(exercise);
  const bodyweight = facts?.equipment.includes(BODYWEIGHT_EQUIPMENT) ?? false;

  const showWeight = (key: string, targetWeight: number | undefined, timed: boolean) =>
    !timed || targetWeight !== undefined || values[key]?.weight !== undefined;
  const anyWeight = exercise.sets.some((set) => showWeight(set.key, set.target?.targetWeight, set.timed));
  let workingNumber = 0;

  return (
    <article className="wp-card">
      <h2 className="wp-card-name" id={headingId}>
        {position && <span className="wp-card-position">{position}</span>}
        <bdi className="display-name" {...nameScript(name)}>
          {name}
        </bdi>
      </h2>

      {chips.length > 0 && (
        <ul className="wp-card-chips">
          {chips.map((chip, index) => (
            <li key={`${chip}-${index}`} dir="ltr">
              {chip}
            </li>
          ))}
        </ul>
      )}

      <ExerciseMediaSlot exercise={facts} />

      <dl className="wp-card-score">
        <div>
          <dt>{copy.player.scoreSets}</dt>
          <dd>{prescription.sets}</dd>
        </div>
        <div>
          <dt>{prescription.timed ? copy.player.scoreSeconds : copy.player.scoreReps}</dt>
          <dd>
            <bdi dir="ltr">{prescription.amount ? formatRange(prescription.amount) : '—'}</bdi>
          </dd>
        </div>
        <div>
          <dt>{copy.player.scoreRest}</dt>
          <dd>
            <bdi dir="ltr">{prescription.rest ? formatRange(prescription.rest, formatRest) : '—'}</bdi>
          </dd>
        </div>
      </dl>

      {lastPerformance && (
        <p className="wp-card-last">
          <IconHistory size={14} stroke={2.2} aria-hidden="true" />
          {copy.session.lastTime} <b dir="ltr">{lastTimeLabel(lastPerformance, language)}</b>
        </p>
      )}

      {/* The coach's notes are the instructions the trainee sees (PRD §5.2). */}
      {exercise.plan.notes && (
        <p className="wp-card-notes" dir="auto">
          {exercise.plan.notes}
        </p>
      )}

      <div className="wp-card-columns" aria-hidden="true">
        <span>{copy.session.columnSet}</span>
        <span>{anyWeight ? copy.session.columnKg : ''}</span>
        <span>{prescription.timed ? copy.session.columnSec : copy.session.columnReps}</span>
        <span />
      </div>

      <div className="wp-card-sets">
        {exercise.sets.map((set) => {
          if (set.type === 'working') workingNumber += 1;
          const setValues = values[set.key];
          if (!setValues) return null;
          return (
            <PlayerSetRow
              key={set.key}
              set={set}
              values={setValues}
              tag={setTag(set.type, workingNumber, copy)}
              isCurrent={set.key === currentKey}
              weightStep={exercise.weightStep}
              showWeight={showWeight(set.key, set.target?.targetWeight, set.timed)}
              bodyweight={bodyweight}
              holdRemainingMs={hold?.key === set.key ? hold.remainingMs : null}
              allowHold={!interval}
              onEdit={(patch) => onEdit(set.key, patch)}
              onToggle={() => onToggle(set.key)}
              onStartHold={() => onStartHold(set.key)}
              onStopHold={onStopHold}
            />
          );
        })}
      </div>

      {!interval && exercise.sets.length < MAX_SETS_PER_EXERCISE && (
        <button type="button" className="wp-card-add" onClick={onAddSet}>
          <IconPlus size={14} stroke={2.6} aria-hidden="true" />
          {copy.player.addSet}
        </button>
      )}
    </article>
  );
}
