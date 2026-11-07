import { measurementLabel, useCopy, useLanguage } from '@sistem/shared';
import { bodyCopy } from '../../../bodyTracking/copy';
import { measurementTone } from '../../data/profileDisplay';
import '../../measurementTones.css';
import './MeasChips.css';

interface MeasChipsProps {
  ids: string[];
  value: string;
  onChange: (id: string) => void;
}

/** One pill per measurement, in list order; scrolls sideways. Each has its color: a dot, or solid when chosen. */
export function MeasChips({ ids, value, onChange }: MeasChipsProps) {
  const language = useLanguage();
  const copy = useCopy(bodyCopy);
  return (
    <div className="meas-chips" role="group" aria-label={copy.measurementPicker}>
      {ids.map((id) => (
        <button
          key={id}
          type="button"
          className={`meas-chip ${measurementTone(id)}${id === value ? ' meas-chip-selected' : ''}`}
          aria-pressed={id === value}
          onClick={() => onChange(id)}
        >
          <span className="meas-chip-dot" aria-hidden="true" />
          {measurementLabel(id, language)}
        </button>
      ))}
    </div>
  );
}
