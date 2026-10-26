import { Link } from 'react-router-dom';
import type { CoachTraineeSummary } from '@sistem/types';
import { useCopy, useLanguage } from '@sistem/shared';
import { coachTraineePath } from '../../../../app/config/routes';
import { coachCopy } from '../../copy';
import { coachTagOf, traineeColorClass, traineeSubLine } from '../../data/coachMode';
import { CoachAvatar } from '../CoachAvatar/CoachAvatar';
import { WeekPips } from '../WeekPips/WeekPips';
import './TraineeRow.css';

/** A trainees list row: avatar, name, the sub line, this week's pips and the status tag. */
export function TraineeRow({ trainee, nowMs }: { trainee: CoachTraineeSummary; nowMs: number }) {
  const copy = useCopy(coachCopy);
  const language = useLanguage();
  const tag = coachTagOf(trainee);
  return (
    <Link className={`trainee-row ${traineeColorClass(trainee.id)}`} to={coachTraineePath(trainee.id)}>
      <CoachAvatar name={trainee.name} seed={trainee.id} photoUrl={trainee.avatar?.url} size="lg" />
      <span className="trainee-row-body">
        <bdi className="trainee-row-name display-title">{trainee.name}</bdi>
        <span className="trainee-row-line">{traineeSubLine(trainee, nowMs, copy, language)}</span>
        {trainee.thisWeek && tag !== 'waiting' && <WeekPips week={trainee.thisWeek} />}
      </span>
      <span className={`trainee-row-tag trainee-row-tag-${tag}`}>{copy.list.tags[tag]}</span>
    </Link>
  );
}
