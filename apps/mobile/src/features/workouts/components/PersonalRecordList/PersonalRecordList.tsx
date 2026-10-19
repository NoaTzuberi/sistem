import type { WorkoutLog } from '@sistem/types';
import { describePersonalRecord, logExerciseNames, useLanguage } from '@sistem/shared';
import './PersonalRecordList.css';

interface PersonalRecordListProps {
  log: WorkoutLog;
  title: string;
}

/** The PRs hit in this workout (computed by the server at finish); nothing when none. */
export function PersonalRecordList({ log, title }: PersonalRecordListProps) {
  const language = useLanguage();
  const records = log.personalRecords ?? [];
  if (records.length === 0) return null;
  const names = logExerciseNames(log);
  return (
    <section className="personal-record-list" aria-label={title}>
      <h2 className="personal-record-list-title display-title">{title}</h2>
      <ul className="personal-record-list-items">
        {records.map((record) => (
          <li key={record.exerciseId} className="personal-record-list-item">
            {describePersonalRecord(record, names.get(record.exerciseId), language)}
          </li>
        ))}
      </ul>
    </section>
  );
}
