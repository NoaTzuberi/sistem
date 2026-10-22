import { fill, useCopy } from '@sistem/shared';
import { useState } from 'react';
import { IconCheck, IconPlayerPlayFilled, IconPlayerStopFilled } from '@tabler/icons-react';
import type { SessionSet, SetValues } from '../../data/sessionSets';
import { DURATION_STEP_SEC, MAX_DURATION_SEC, MAX_REPS, MAX_WEIGHT_KG, REPS_STEP } from '../../data/sessionConfig';
import { formatClock } from '../../data/workoutDisplay';
import { hapticImpact } from '../../../../services/haptics/haptics';
import { workoutCopy } from '../../copy';
import { PlayerStepper } from '../PlayerStepper/PlayerStepper';
import './PlayerSetRow.css';

interface PlayerSetRowProps {
  set: SessionSet;
  values: SetValues;
  /** 'ח' / 'ד' (warm-up / drop) or the working set's number. */
  tag: string;
  /** The next set to do: soft ground, ink number and check. */
  isCurrent: boolean;
  weightStep: number;
  showWeight: boolean;
  /** No weight logged on a bodyweight exercise reads "BW", else "–". */
  bodyweight: boolean;
  /** Milliseconds left on this set's running hold, or null. */
  holdRemainingMs: number | null;
  /** The row's own ▶ countdown (off in an interval block, which has its own timer). */
  allowHold: boolean;
  onEdit: (patch: Partial<Omit<SetValues, 'completed'>>) => void;
  onToggle: () => void;
  onStartHold: () => void;
  onStopHold: () => void;
}

/** One set: number | kg | reps (or seconds) | ✓. Checking pops and taps; un-checking is allowed. */
export function PlayerSetRow(props: PlayerSetRowProps) {
  const { set, values, tag, isCurrent, weightStep, showWeight, bodyweight, holdRemainingMs, allowHold, onEdit, onToggle, onStartHold, onStopHold } = props;
  const copy = useCopy(workoutCopy);
  const [popping, setPopping] = useState(false);
  const setLabel = tag || String(set.setIndex + 1);
  const isHolding = holdRemainingMs !== null;
  const done = values.completed;
  const state = done ? 'wp-set-done' : isCurrent ? 'wp-set-current' : '';

  function handleToggle() {
    if (!done) hapticImpact('LIGHT');
    // Un-checking clears the class, so the next check pops again.
    setPopping(!done);
    onToggle();
  }

  return (
    <div className={['wp-set', state, popping && 'wp-set-pop'].filter(Boolean).join(' ')} id={`session-set-${set.key}`}>
      <div className="wp-set-row">
        <span className="wp-set-number" aria-label={fill(copy.session.setAria, { set: setLabel })}>
          {done ? <IconCheck size={14} stroke={3} aria-hidden="true" /> : tag}
        </span>

        {showWeight ? (
          <PlayerStepper
            value={values.weight}
            step={weightStep}
            max={MAX_WEIGHT_KG}
            decimal
            locked={done}
            placeholder={bodyweight ? copy.player.bodyweight : '–'}
            label={fill(copy.session.setColumnAria, { column: copy.session.columnKg, set: setLabel })}
            onChange={(weight) => onEdit({ weight })}
          />
        ) : (
          <span aria-hidden="true" />
        )}

        {set.timed ? (
          <PlayerStepper
            value={values.durationSec}
            step={DURATION_STEP_SEC}
            max={MAX_DURATION_SEC}
            locked={done}
            placeholder="–"
            label={fill(copy.session.setColumnAria, { column: copy.session.columnSec, set: setLabel })}
            onChange={(durationSec) => onEdit({ durationSec })}
          />
        ) : (
          <PlayerStepper
            value={values.reps}
            step={REPS_STEP}
            max={MAX_REPS}
            locked={done}
            placeholder="–"
            label={fill(copy.session.setColumnAria, { column: copy.session.columnReps, set: setLabel })}
            onChange={(reps) => onEdit({ reps })}
          />
        )}

        <button
          type="button"
          className="wp-set-check"
          aria-pressed={done}
          aria-label={done ? fill(copy.session.markNotDone, { setLabel }) : fill(copy.session.markDone, { setLabel })}
          onClick={handleToggle}
          onAnimationEnd={() => setPopping(false)}
        >
          <IconCheck size={22} stroke={2.6} aria-hidden="true" />
        </button>
      </div>

      {set.timed && allowHold && !done && (
        <button
          type="button"
          className={isHolding ? 'wp-set-hold wp-set-hold-running' : 'wp-set-hold'}
          onClick={isHolding ? onStopHold : onStartHold}
          disabled={!isHolding && !values.durationSec}
        >
          {isHolding ? <IconPlayerStopFilled size={14} aria-hidden="true" /> : <IconPlayerPlayFilled size={14} aria-hidden="true" />}
          {isHolding ? (
            <>
              <span role="timer" dir="ltr">
                {formatClock(Math.ceil(holdRemainingMs / 1000))}
              </span>
              {copy.session.stopHold}
            </>
          ) : (
            fill(copy.session.startHold, { seconds: formatClock(values.durationSec ?? 0) })
          )}
        </button>
      )}
    </div>
  );
}
