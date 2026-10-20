import { useState } from 'react';
import { IconMinus, IconPlus } from '@tabler/icons-react';
import { fill, formatClock, formatNumber, intensityZone, useCopy, useLanguage } from '@sistem/shared';
import { cardioCopy } from '../../copy';
import { doneEyebrow } from '../../data/cardioText';
import { CardioScoreboard } from '../CardioScoreboard/CardioScoreboard';
import { CardioTitle } from '../CardioTitle/CardioTitle';
import './CardioFinish.css';

export interface CardioFinishValues {
  distanceKm: number | null;
  rpe: number;
  note: string | null;
}

interface CardioFinishProps {
  sessionName: string;
  completedSec: number;
  roundsDone: number;
  roundsTotal: number;
  highIntensitySec: number;
  coachName: string | null;
  isSaving: boolean;
  error: string | null;
  onSave: (values: CardioFinishValues) => void;
}

const RPE_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
/** The design's starting effort. */
const DEFAULT_RPE = 8;
const MAX_DISTANCE_TENTHS = 3000;

/** After the run: what she did (from the real run), optional distance, how hard (1–10), a note, save + send. */
export function CardioFinish(props: CardioFinishProps) {
  const { sessionName, completedSec, roundsDone, roundsTotal, highIntensitySec, coachName, isSaving, error, onSave } = props;
  const copy = useCopy(cardioCopy);
  const language = useLanguage();
  // Distance in tenths of a km (steps of 100 m); 0 = not given.
  const [distance, setDistance] = useState(0);
  const [rpe, setRpe] = useState(DEFAULT_RPE);
  const [note, setNote] = useState('');

  const title =
    roundsTotal === 0 ? sessionName : roundsDone === roundsTotal ? fill(copy.closedRounds, { count: roundsTotal }) : fill(copy.didRounds, { done: roundsDone, total: roundsTotal });

  return (
    <div className="cp-finish">
      <code className="cp-finish-eyebrow" aria-hidden="true">
        {doneEyebrow(formatClock(completedSec))}
      </code>
      <CardioTitle title={title} className="cp-finish-title" />
      <CardioScoreboard
        items={[
          { id: 'time', value: formatClock(completedSec), label: copy.time },
          { id: 'rounds', value: roundsTotal > 0 ? `${roundsDone}/${roundsTotal}` : '—', label: copy.rounds },
          { id: 'high', value: formatClock(highIntensitySec), label: copy.high },
        ]}
      />

      <div className="cp-finish-question">
        <span className="cp-finish-label" id="cp-distance-label">
          {copy.distanceQuestion} <small>{copy.optional}</small>
        </span>
        <div className="cp-distance" role="group" aria-labelledby="cp-distance-label">
          <button className="cp-distance-button" type="button" aria-label={copy.moreDistance} onClick={() => setDistance((value) => Math.min(MAX_DISTANCE_TENTHS, value + 1))}>
            <IconPlus size={20} aria-hidden="true" />
          </button>
          <output className="cp-distance-value" aria-live="polite">
            <bdi dir="ltr">{distance === 0 ? '—' : formatNumber(distance / 10, language, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</bdi>
            <small>{copy.km}</small>
          </output>
          <button className="cp-distance-button" type="button" aria-label={copy.lessDistance} disabled={distance === 0} onClick={() => setDistance((value) => Math.max(0, value - 1))}>
            <IconMinus size={20} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="cp-finish-question">
        <span className="cp-finish-label" id="cp-rpe-label">
          {copy.rpeQuestion}
        </span>
        <div className="cp-rpe" role="radiogroup" aria-labelledby="cp-rpe-label">
          {RPE_VALUES.map((value) => (
            <button
              key={value}
              className="cp-rpe-chip cp-zone"
              type="button"
              role="radio"
              data-zone={intensityZone(value)}
              aria-checked={value === rpe}
              aria-label={fill(copy.rpeLabel, { value })}
              onClick={() => setRpe(value)}
            >
              {value}
            </button>
          ))}
        </div>
        <div className="cp-rpe-ends" aria-hidden="true">
          <span>{copy.rpeEasy}</span>
          <span>{copy.rpeMax}</span>
        </div>
      </div>

      <div className="cp-finish-question">
        <label className="cp-finish-label" htmlFor="cp-finish-note">
          {coachName ? fill(copy.noteQuestion, { name: coachName }) : copy.noteQuestionNoCoach} <small>{copy.optional}</small>
        </label>
        <textarea
          className="cp-finish-note"
          id="cp-finish-note"
          dir="auto"
          maxLength={1000}
          value={note}
          placeholder={copy.notePlaceholder}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>

      {error && (
        <p className="cp-finish-error" role="alert">
          {error}
        </p>
      )}
      <button
        className="cp-finish-save"
        type="button"
        aria-busy={isSaving || undefined}
        disabled={isSaving}
        onClick={() => onSave({ distanceKm: distance === 0 ? null : distance / 10, rpe, note: note.trim() || null })}
      >
        {coachName ? fill(copy.save, { name: coachName }) : copy.saveNoCoach}
      </button>
    </div>
  );
}
