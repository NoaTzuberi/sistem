import type { PlannedWorkout } from '../../data/weekPlanDisplay';
import { WorkoutTicket } from '../WorkoutTicket/WorkoutTicket';
import './WorkoutTicketCarousel.css';

interface WorkoutTicketCarouselProps {
  workouts: PlannedWorkout[];
  label: string;
  onOpen: (planned: PlannedWorkout) => void;
}

/** The week's workouts as a horizontal, snapping row of tickets (swipe; it scrolls with the reading direction). */
export function WorkoutTicketCarousel({ workouts, label, onOpen }: WorkoutTicketCarouselProps) {
  return (
    <ul className="workout-ticket-carousel" aria-label={label}>
      {workouts.map((planned) => (
        <li key={planned.workout.id} className="workout-ticket-carousel-item">
          <WorkoutTicket planned={planned} onOpen={() => onOpen(planned)} />
        </li>
      ))}
    </ul>
  );
}
