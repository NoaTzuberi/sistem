import { fill, useCopy } from '@sistem/shared';
import { nutritionCopy } from '../../copy';
import { PROTEIN_TARGET_MAX, useProteinTargetInput } from '../../hooks/useProteinTargetInput';
import './ProteinTarget.css';

interface ProteinTargetProps {
  /** Grams a day; null = none. */
  value: number | null;
  onChange: (value: number | null) => void;
}

/**
 * Portions mode: an optional daily protein goal in grams, next to the protein portions. It is shown
 * to her as "~X g protein a day". There is no computed hint: no protein-per-portion value exists in
 * the food data yet (owner decision pending, 2026-10-28).
 */
export function ProteinTarget({ value, onChange }: ProteinTargetProps) {
  const copy = useCopy(nutritionCopy);
  const b = copy.builder;
  const field = useProteinTargetInput(value, onChange);

  return (
    <div className="nm-protein">
      <label className="nm-protein-label" htmlFor="nm-protein-grams">
        {b.proteinTarget}
        <span className="nm-protein-optional">{b.proteinTargetOptional}</span>
      </label>
      <div className="nm-protein-row">
        <input
          className="nm-protein-input"
          id="nm-protein-grams"
          type="text"
          inputMode="numeric"
          dir="ltr"
          autoComplete="off"
          aria-invalid={field.isInvalid || undefined}
          aria-describedby={field.isInvalid ? 'nm-protein-error' : undefined}
          value={field.text}
          onChange={field.onChange}
        />
        <span className="nm-protein-unit">{b.proteinTargetUnit}</span>
      </div>
      {field.isInvalid && (
        <p className="nm-protein-error" id="nm-protein-error" role="alert">
          {fill(b.proteinTargetInvalid, { max: PROTEIN_TARGET_MAX })}
        </p>
      )}
    </div>
  );
}
