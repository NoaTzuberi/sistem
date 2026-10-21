import type { WorkoutLogStats } from '@sistem/types';
import { dateFormat, formatNumber, sharedCopy, useCopy, useLanguage } from '@sistem/shared';
import { IconX } from '@tabler/icons-react';
import { Eyebrow } from '../../../../components/common/Eyebrow/Eyebrow';
import { appCopy } from '../../../../copy';
import { workoutCopy } from '../../copy';
import { durationMinutes, shortDate } from '../../data/summaryDisplay';
import { nameScript } from '../../data/weekPlanDisplay';
import './SummaryStage.css';

interface SummaryStageProps {
  workoutTitle: string;
  /** When she finished (ISO). */
  finishedAt: string;
  stats: WorkoutLogStats | null;
  onClose: () => void;
}

/**
 * The pink stage at the top of the summary (like Home's): the check drawing itself, "Workout
 * complete", the workout and when, and the four numbers the server computed at finish.
 */
export function SummaryStage({ workoutTitle, finishedAt, stats, onClose }: SummaryStageProps) {
  const language = useLanguage();
  const copy = useCopy(workoutCopy);
  const units = useCopy(sharedCopy).units;
  const eyebrow = useCopy(appCopy).eyebrow;
  const day = dateFormat(language, { weekday: 'short', day: 'numeric', month: 'long' }).format(new Date(finishedAt));
  const time = dateFormat(language, { hour: '2-digit', minute: '2-digit' }).format(new Date(finishedAt));

  return (
    <header className="ws-stage">
      <div className="ws-stage-bar">
        <Eyebrow keepInEnglish>{`${eyebrow.done} · ${workoutTitle} · ${shortDate(finishedAt)}`}</Eyebrow>
        <button type="button" className="ws-stage-close" aria-label={copy.summary.close} onClick={onClose}>
          <IconX size={20} stroke={2.4} aria-hidden="true" />
        </button>
      </div>

      <svg className="ws-stage-medal" viewBox="0 0 74 74" fill="none" aria-hidden="true">
        <circle cx="37" cy="37" r="34" />
        <path d="m24 38 9 9 17-19" />
      </svg>

      <h1 className="ws-stage-title display-title">{copy.summary.title}</h1>
      <p className="ws-stage-meta">
        <bdi className="display-name" {...nameScript(workoutTitle)}>
          {workoutTitle}
        </bdi>{' '}
        · {day} · <bdi dir="ltr">{time}</bdi>
      </p>

      {stats && (
        <dl className="ws-stage-score">
          <div>
            <dt>{copy.finish.scoreDuration}</dt>
            <dd>
              <bdi dir="ltr">
                {durationMinutes(stats.durationSec)}
                <small>′</small>
              </bdi>
            </dd>
          </div>
          <div>
            <dt>{copy.finish.scoreSets}</dt>
            <dd>{stats.setsCompleted}</dd>
          </div>
          <div>
            <dt>{copy.finish.scoreVolume}</dt>
            <dd>
              {stats.totalVolume > 0 ? (
                <>
                  <bdi dir="ltr">{formatNumber(Math.round(stats.totalVolume), language)}</bdi>
                  <small>{units.kg}</small>
                </>
              ) : (
                '—'
              )}
            </dd>
          </div>
          <div>
            <dt>{copy.finish.scorePrs}</dt>
            <dd>{stats.prCount}</dd>
          </div>
        </dl>
      )}
    </header>
  );
}
