import { useEffect, useState } from 'react';
import type { UnitPreferences } from '@sistem/types';
import { extractErrorMessage } from '@sistem/api-client';
import { IconMinus, IconPlus } from '@tabler/icons-react';
import { fill, getActiveLanguage, measurementLabel, parseDecimalInput, roundOneDecimal, unitLabel, useCopy, useLanguage } from '@sistem/shared';
import { BottomSheet } from '../../../../components/common/BottomSheet/BottomSheet';
import { bodyCopy } from '../../../bodyTracking/copy';
import { roundToStep } from '../../data/profileDisplay';
import type { MeasurementEntry } from '../../hooks/useMeasurements';
import { profileCopy } from '../../copy';
import './MeasurementSheet.css';

const WEIGHT_STEP = 0.1;
const LENGTH_STEP = 0.5;
const COLORED = new Set(['chest', 'waist', 'hips', 'arms', 'thighs']);

interface MeasurementSheetProps {
  isOpen: boolean;
  onClose: () => void;
  units: UnitPreferences;
  measurementIds: string[];
  /** Her last values in her units — the steppers start there. */
  lastValues: { weight: number | null; measurements: Record<string, number> };
  onSave: (entry: MeasurementEntry) => Promise<void>;
  onSaved: () => void;
}

function asText(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(roundOneDecimal(value));
}

interface StepperProps {
  value: string;
  onChange: (value: string) => void;
  step: number;
  unit: string;
  inputLabel: string;
  size: 'lg' | 'sm';
}

/** + / a typed value / − (the value is an input too: no previous value = she types the first one). */
function Stepper({ value, onChange, step, unit, inputLabel, size }: StepperProps) {
  const copy = useCopy(profileCopy);
  const current = parseDecimalInput(value);
  const move = (direction: 1 | -1) => {
    if (current === null) return;
    const next = roundToStep(current + direction * step, step);
    if (next > 0) onChange(String(next));
  };
  return (
    <div className={`pf-stepper pf-stepper-${size}`}>
      <button type="button" className="pf-step" aria-label={fill(copy.stepUp, { step, unit })} disabled={current === null} onClick={() => move(1)}>
        <IconPlus size={size === 'lg' ? 22 : 16} aria-hidden="true" />
      </button>
      <label className="pf-stepper-value">
        <input
          className="pf-stepper-input"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="done"
          dir="ltr"
          aria-label={inputLabel}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <span className="pf-stepper-unit" aria-hidden="true">
          {unit}
        </span>
      </label>
      <button type="button" className="pf-step" aria-label={fill(copy.stepDown, { step, unit })} disabled={current === null} onClick={() => move(-1)}>
        <IconMinus size={size === 'lg' ? 22 : 16} aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * "עדכון מדידה": today's weight (required, ±0.1) and, optionally, measurements (±0.5) starting from her
 * last values. Saves one entry for today (the same PUT the coach reads); only changed measurements go.
 */
export function MeasurementSheet({ isOpen, onClose, units, measurementIds, lastValues, onSave, onSaved }: MeasurementSheetProps) {
  const copy = useCopy(profileCopy);
  const language = useLanguage();
  const [weight, setWeight] = useState('');
  const [measures, setMeasures] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Every opening starts from her latest values.
  useEffect(() => {
    if (!isOpen) return;
    setWeight(asText(lastValues.weight));
    setMeasures(Object.fromEntries(measurementIds.map((id) => [id, asText(lastValues.measurements[id])])));
    setError(null);
  }, [isOpen, lastValues, measurementIds]);

  const weightUnit = unitLabel(units.weight, language);
  const lengthUnit = unitLabel(units.length, language);

  async function save() {
    const weightValue = parseDecimalInput(weight);
    if (weightValue === null) {
      setError(copy.weightRequired);
      return;
    }
    const changed: Record<string, number> = {};
    for (const id of measurementIds) {
      const value = parseDecimalInput(measures[id] ?? '');
      const last = lastValues.measurements[id];
      if (value !== null && (last === undefined || value !== roundOneDecimal(last))) changed[id] = value;
    }
    setError(null);
    setIsSaving(true);
    try {
      await onSave({ weight: weightValue, measurements: changed });
      onSaved();
      onClose();
    } catch (caught) {
      setError(extractErrorMessage(caught, bodyCopy[getActiveLanguage()].saveError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="pf-sheet-title"
      className="pf-sheet"
      footer={
        <button type="button" className="pf-save" disabled={isSaving} onClick={() => void save()}>
          {copy.save}
        </button>
      }
    >
      <h2 className="pf-sheet-title" id="pf-sheet-title">
        {copy.sheetTitle}
      </h2>
      <p className="pf-sheet-hint">{copy.sheetHint}</p>

      <Stepper value={weight} onChange={setWeight} step={WEIGHT_STEP} unit={weightUnit} inputLabel={fill(copy.weightInput, { unit: weightUnit })} size="lg" />

      <h3 className="pf-sheet-subtitle">
        {copy.sheetMeasurements} <span className="pf-sheet-optional">{copy.sheetOptional}</span>
      </h3>
      <ul className="pf-sheet-list">
        {measurementIds.map((id) => {
          const name = measurementLabel(id, language);
          return (
            <li key={id} className={'pf-sheet-row' + (COLORED.has(id) ? ` pf-sheet-${id}` : '')}>
              <span className="pf-sheet-bar" aria-hidden="true" />
              <span className="pf-sheet-row-name">{name}</span>
              <Stepper
                value={measures[id] ?? ''}
                onChange={(value) => setMeasures((current) => ({ ...current, [id]: value }))}
                step={LENGTH_STEP}
                unit={lengthUnit}
                inputLabel={fill(copy.measurementInput, { name, unit: lengthUnit })}
                size="sm"
              />
            </li>
          );
        })}
      </ul>

      {error && (
        <p className="pf-sheet-error" role="alert">
          {error}
        </p>
      )}
    </BottomSheet>
  );
}
