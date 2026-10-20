import { useCopy, useLanguage } from '@sistem/shared';
import { Switch } from '../../../../components/common/Switch/Switch';
import { cardioCopy } from '../../copy';
import { shortDayName } from '../../data/cardioLabels';
import './CardioDayPicker.css';

interface CardioDayPickerProps {
  days: number[];
  /** Days of this plan week that already have a strength workout. */
  strengthDays: ReadonlySet<number>;
  repeatsWeekly: boolean;
  onToggle: (day: number) => void;
  onRepeatsWeekly: (value: boolean) => void;
}

const WEEK = [0, 1, 2, 3, 4, 5, 6];

/** Seven day tiles (Sunday first), "כוח" under days with strength, and the weekly switch. */
export function CardioDayPicker({ days, strengthDays, repeatsWeekly, onToggle, onRepeatsWeekly }: CardioDayPickerProps) {
  const copy = useCopy(cardioCopy);
  const language = useLanguage();

  return (
    <section className="cb-card cb-days-card" aria-labelledby="cb-days-title">
      <h3 className="cb-side-title" id="cb-days-title">
        {copy.daysTitle}
      </h3>
      <div className="cb-days">
        {WEEK.map((day) => {
          const hasStrength = strengthDays.has(day);
          return (
            <button
              key={day}
              className="cb-day"
              type="button"
              aria-pressed={days.includes(day)}
              data-strength={hasStrength ? '' : undefined}
              onClick={() => onToggle(day)}
            >
              {shortDayName(day, language)}
              <small className="cb-day-note">{hasStrength ? copy.strength : '—'}</small>
            </button>
          );
        })}
      </div>
      <p className="cb-days-hint">{copy.daysHint}</p>
      <Switch className="cb-days-switch" checked={repeatsWeekly} onChange={onRepeatsWeekly} label={copy.weekly} />
    </section>
  );
}
