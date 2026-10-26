import { Link } from 'react-router-dom';
import type { CoachTodayResponse } from '@sistem/types';
import { useCopy } from '@sistem/shared';
import { coachTraineesPath } from '../../../../app/config/routes';
import { coachCopy } from '../../copy';
import './StageScoreboard.css';

/** Today's three numbers; each opens the trainees list on its filter. */
export function StageScoreboard({ scoreboard }: { scoreboard: CoachTodayResponse['scoreboard'] }) {
  const copy = useCopy(coachCopy).today;
  return (
    <nav className="stage-scoreboard" aria-label={copy.scoreboard}>
      <Link className="stage-scoreboard-cell" to={coachTraineesPath('active')}>
        <span className="stage-scoreboard-value" dir="ltr">
          {scoreboard.trainedThisWeek}
          <span className="stage-scoreboard-sup">/{scoreboard.activeTrainees}</span>
        </span>
        <span className="stage-scoreboard-label">{copy.scoreTrained}</span>
      </Link>
      <Link className="stage-scoreboard-cell" to={coachTraineesPath('waiting')}>
        <span className="stage-scoreboard-value stage-scoreboard-value-pink">{scoreboard.waiting}</span>
        <span className="stage-scoreboard-label">{copy.scoreWaiting}</span>
      </Link>
      <Link className="stage-scoreboard-cell" to={coachTraineesPath('attention')}>
        <span className="stage-scoreboard-value stage-scoreboard-value-amber">{scoreboard.attention}</span>
        <span className="stage-scoreboard-label">{copy.scoreAttention}</span>
      </Link>
    </nav>
  );
}
