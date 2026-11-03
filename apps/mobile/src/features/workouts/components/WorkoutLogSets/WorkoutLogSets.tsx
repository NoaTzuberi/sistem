import type { WorkoutLog } from '@sistem/types';
import { IconCheck } from '@tabler/icons-react';
import { describeLogSetAmount, groupLogSetsByExercise, logExerciseNames, sharedCopy, useCopy, useLanguage } from '@sistem/shared';
import { recordSetIndexes } from '../../data/logSetRecords';
import { workoutCopy } from '../../copy';
import './WorkoutLogSets.css';

interface WorkoutLogSetsProps {
  log: WorkoutLog;
}

/** What she did, one white card per exercise, the sets in the player's style; a PR set gets its blue chip. */
export function WorkoutLogSets({ log }: WorkoutLogSetsProps) {
  const language = useLanguage();
  const shared = useCopy(sharedCopy);
  const copy = useCopy(workoutCopy);
  const names = logExerciseNames(log);
  const records = recordSetIndexes(log.sets, log.personalRecords ?? []);

  return (
    <div className="wk-log-list">
      {groupLogSetsByExercise(log.sets).map((group, index) => {
        const recordAt = records.get(group.exerciseId);
        return (
          <section key={index} className="wk-log-card">
            <h2 className="wk-log-name">
              <bdi>{names.get(group.exerciseId) ?? shared.log.exercise}</bdi>
              {recordAt === null && <span className="wk-log-pr">{copy.history.tagPr}</span>}
            </h2>
            <ol className="wk-log-sets">
              {group.sets.map((set) => (
                <li key={set.setIndex} className={set.completed ? 'wk-log-set' : 'wk-log-set wk-log-set-missed'}>
                  <span className="wk-log-set-number">{set.setIndex + 1}</span>
                  <span className="wk-log-set-value">{describeLogSetAmount(set, language)}</span>
                  {recordAt === set.setIndex && <span className="wk-log-pr">{copy.history.tagPr}</span>}
                  {set.completed ? (
                    <span className="wk-log-set-done">
                      <IconCheck size={16} stroke={3} aria-hidden="true" />
                    </span>
                  ) : (
                    <span className="wk-log-set-skip">{shared.log.notDone}</span>
                  )}
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
