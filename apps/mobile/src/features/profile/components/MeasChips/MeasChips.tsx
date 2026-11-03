import { measurementLabel, useCopy, useLanguage } from '@sistem/shared';
import { bodyCopy } from '../../../bodyTracking/copy';
import './MeasChips.css';

interface MeasChipsProps {
  ids: string[];
  value: string;
  onChange: (id: string) => void;
}

/** One pill per measurement, in list order; scrolls sideways; the chosen one is solid ink. */
export function MeasChips({ ids, value, onChange }: MeasChipsProps) {
  const language = useLanguage();
  const copy = useCopy(bodyCopy);
  return (
    <div className="meas-chips" role="group" aria-label={copy.measurementPicker}>
      {ids.map((id) => (
        <button
          key={id}
          type="button"
          className={'meas-chip' + (id === value ? ' meas-chip-selected' : '')}
          aria-pressed={id === value}
          onClick={() => onChange(id)}
        >
          {measurementLabel(id, language)}
        </button>
      ))}
    </div>
  );
}
