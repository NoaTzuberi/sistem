import { fill, isolateLtr, sharedCopy, useCopy } from '@sistem/shared';
import { profileCopy } from '../../copy';
import './FrequencyPips.css';

const WEEK_DAYS = 7;

interface FrequencyPipsProps {
  minDays: number;
  maxDays: number;
  flexible: boolean;
}

/** Days per week as 7 pips: the low end solid, up to the high end half-tint ("2–3" = 2 solid + 1 half). */
export function FrequencyPips({ minDays, maxDays, flexible }: FrequencyPipsProps) {
  const copy = useCopy(profileCopy);
  const labels = useCopy(sharedCopy).onboardingSections;
  const days = minDays === maxDays ? String(minDays) : isolateLtr(`${minDays}–${maxDays}`);
  return (
    <div className="qn-freq">
      <div className="qn-freq-pips" role="img" aria-label={fill(copy.questionnaire.daysPips, { days })}>
        {Array.from({ length: WEEK_DAYS }, (_, index) => (
          <span
            key={index}
            className={'qn-freq-pip' + (index < minDays ? ' qn-freq-pip-full' : index < maxDays ? ' qn-freq-pip-half' : '')}
          />
        ))}
      </div>
      <p className="qn-freq-label" aria-hidden="true">
        <span className="qn-freq-num">{days}</span> {labels.daysPerWeek}
        {flexible && <span className="qn-freq-flex">{copy.flexibleSchedule}</span>}
      </p>
    </div>
  );
}
