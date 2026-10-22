import { Link } from 'react-router-dom';
import { IconChevronRight } from '@tabler/icons-react';
import type { OwnCardioWorkout } from '@sistem/types';
import { cardioMinutesLabel, cardioSportLabel, cardioTotals, useI18n } from '@sistem/shared';
import { ownCardioPath } from '../../../../app/config/routes';
import { cardioCopy } from '../../copy';
import { useCopy } from '@sistem/shared';
import './OwnCardioList.css';

/** Her own cardio workouts: one row each (name, type, length, runs so far) → its page. */
export function OwnCardioList({ workouts }: { workouts: OwnCardioWorkout[] }) {
  const { language, plural } = useI18n();
  const copy = useCopy(cardioCopy).own;
  return (
    <ul className="sg-cardio-list">
      {workouts.map((workout) => (
        <li key={workout.id}>
          <Link className="sg-cardio-row" to={ownCardioPath(workout.id)}>
            <span className="sg-cardio-text">
              <bdi className="sg-cardio-name" dir="auto">
                {workout.title}
              </bdi>
              <span className="sg-cardio-meta">
                {[
                  cardioSportLabel(workout.cardio.sport, language),
                  cardioMinutesLabel(cardioTotals(workout.cardio.steps).totalSec, language),
                  workout.runs > 0 ? plural(copy.runs, workout.runs) : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </span>
            <IconChevronRight className="flip-rtl" size={18} aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
