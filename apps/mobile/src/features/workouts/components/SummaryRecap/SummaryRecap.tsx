import type { WorkoutLog } from '@sistem/types';
import { fill, isolateLtr, logExerciseNames, sharedCopy, useCopy } from '@sistem/shared';
import { Eyebrow } from '../../../../components/common/Eyebrow/Eyebrow';
import { appCopy } from '../../../../copy';
import { workoutCopy } from '../../copy';
import { recapOf } from '../../data/summaryDisplay';
import { formatRange } from '../../data/workoutDisplay';
import { nameScript } from '../../data/weekPlanDisplay';
import './SummaryRecap.css';

interface SummaryRecapProps {
  log: WorkoutLog;
}

/** "What you did": one row per exercise — sets done of planned, the reps, a PR tag where one fell. */
export function SummaryRecap({ log }: SummaryRecapProps) {
  const copy = useCopy(workoutCopy);
  const shared = useCopy(sharedCopy);
  const eyebrow = useCopy(appCopy).eyebrow;
  const names = logExerciseNames(log);

  return (
    <section className="ws-section" aria-labelledby="ws-recap-title">
      <h2 className="ws-section-title" id="ws-recap-title">
        <Eyebrow>{eyebrow.recap}</Eyebrow>
        {copy.finish.recap}
      </h2>
      <ul className="ws-recap">
        {recapOf(log).map((row) => {
          const name = names.get(row.exerciseId) ?? shared.log.exercise;
          return (
            <li key={row.key} className={row.done > 0 ? 'ws-recap-row ws-recap-row-done' : 'ws-recap-row'}>
              <i aria-hidden="true" />
              <span className="ws-recap-name display-name" {...nameScript(name)}>
                {name}
              </span>
              <span className="ws-recap-detail">
                {fill(copy.finish.recapSets, { progress: isolateLtr(`${row.done}/${row.total}`) })}
                {row.reps && ` · ${fill(copy.finish.recapReps, { reps: isolateLtr(formatRange(row.reps)) })}`}
              </span>
              {row.pr && <em className="ws-recap-pr">{copy.finish.prTag}</em>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
