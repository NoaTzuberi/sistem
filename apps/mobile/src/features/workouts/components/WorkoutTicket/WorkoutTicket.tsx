import { IconCheck } from '@tabler/icons-react';
import { useCopy, useLanguage } from '@sistem/shared';
import { exerciseCountLabel } from '../../data/workoutDisplay';
import { nameScript, ticketState, workoutShortDay, type PlannedWorkout } from '../../data/weekPlanDisplay';
import { workoutCopy } from '../../copy';
import './WorkoutTicket.css';

interface WorkoutTicketProps {
  planned: PlannedWorkout;
  onOpen: () => void;
}

/** One workout of the week as a ticket: a faint letter, the name, "N exercises · day" and a status chip. */
export function WorkoutTicket({ planned, onOpen }: WorkoutTicketProps) {
  const copy = useCopy(workoutCopy);
  const language = useLanguage();
  const { workout, colorClass, letter } = planned;
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

  return (
    <button type="button" className={`workout-ticket workout-ticket-${state} ${colorClass}`} onClick={onOpen}>
      <span className="workout-ticket-letter" aria-hidden="true">
        {letter}
      </span>
      <span className="workout-ticket-name">
        <bdi className="display-name" {...nameScript(workout.title)}>
          {workout.title}
        </bdi>
      </span>
      <span className="workout-ticket-meta">
        {exerciseCountLabel(workout.exercises.length, copy, language)} · {day}
      </span>
      <span className="workout-ticket-chip">
        {state === 'done' && <IconCheck size={12} stroke={3} aria-hidden="true" />}
        {chip}
      </span>
    </button>
  );
}
