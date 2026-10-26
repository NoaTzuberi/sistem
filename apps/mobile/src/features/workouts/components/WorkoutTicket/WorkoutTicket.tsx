import { Fragment } from 'react';
import { IconActivityHeartbeat, IconCheck } from '@tabler/icons-react';
import { cardioMinutesLabel, formatPlural, sharedCopy, useCopy, useLanguage } from '@sistem/shared';
import { useCardioProfile } from '../../../cardio/hooks/useCardioProfile';
import { exerciseCountLabel } from '../../data/workoutDisplay';
import { nameScript, ticketState, workoutShortDay, type PlannedWorkout } from '../../data/weekPlanDisplay';
import { workoutCopy } from '../../copy';
import { CardioIntensityStrip } from '../CardioIntensityStrip/CardioIntensityStrip';
import './WorkoutTicket.css';

interface WorkoutTicketProps {
  planned: PlannedWorkout;
  onOpen: () => void;
}

/** Numbers inside a meta line (minutes, counts) read left to right in the numeric font. */
function withNumbers(text: string) {
  return text.split(/(\d+′?)/).map((part, index) =>
    /\d/.test(part) ? (
      <bdi key={index} dir="ltr" className="workout-ticket-num">
        {part}
      </bdi>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}

/**
 * One workout of the week as a ticket: a faint letter, the name, a meta line and a status chip.
 * A cardio workout is the same ticket with a cardio badge, "minutes · blocks" and its intensity strip.
 */
export function WorkoutTicket({ planned, onOpen }: WorkoutTicketProps) {
  const copy = useCopy(workoutCopy);
  const shared = useCopy(sharedCopy);
  const language = useLanguage();
  const { workout, colorClass, letter } = planned;
  const profile = useCardioProfile(workout.kind === 'cardio' ? workout.cardio : undefined);
  const state = ticketState(planned);
  const day = workoutShortDay(workout, language, copy);
  const chip =
    state === 'done'
      ? copy.status.done
      : workout.inProgress
        ? copy.status.inProgress
        : state === 'today'
          ? copy.status.today
          : state === 'missed'
            ? copy.status.missed
            : day;

  const meta = profile
    ? `${cardioMinutesLabel(profile.totalSec, language)} · ${formatPlural(language, copy.plan.cardioBlocks, profile.blockCount)}`
    : '';
  const stripLabel = profile
    ? formatPlural(language, copy.plan.cardioStripLabel, profile.blockCount, { max: profile.maxIntensity })
    : '';

  return (
    <button
      type="button"
      className={`workout-ticket workout-ticket-${state} ${colorClass}${profile ? ' workout-ticket-cardio' : ''}`}
      onClick={onOpen}
    >
      <span className="workout-ticket-letter" aria-hidden="true">
        {letter}
      </span>
      {profile && (
        <span className="workout-ticket-badge">
          <IconActivityHeartbeat size={12} stroke={2.5} aria-hidden="true" />
          {shared.cardio.cardioTag}
        </span>
      )}
      <span className="workout-ticket-name">
        <bdi className="display-name" {...nameScript(workout.title)}>
          {workout.title}
        </bdi>
      </span>
      <span className="workout-ticket-meta">
        {profile ? withNumbers(meta) : `${exerciseCountLabel(workout.exercises.length, copy, language)} · ${day}`}
      </span>
      {profile && <CardioIntensityStrip segments={profile.segments} label={stripLabel} />}
      <span className="workout-ticket-chip">
        {state === 'done' && <IconCheck size={12} stroke={3} aria-hidden="true" />}
        {chip}
      </span>
    </button>
  );
}
