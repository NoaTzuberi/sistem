import './OptionList.css';

interface OptionListProps<Id extends string> {
  /** Names the group for screen readers (the question or the group's label). */
  label: string;
  /** `single` (radios) or `multi` (checkboxes). Both LOOK the same — the drawn box whose outline turns
   * into the check — so every questionnaire step selects alike; only the role and the step's rule differ. */
  kind: 'single' | 'multi';
  options: readonly { id: Id; label: string }[];
  selected: readonly string[];
  onToggle: (id: Id) => void;
  /** Long lists use two columns, so the card fits the screen. */
  columns?: 1 | 2;
}

/** A step's options as a clean list. What a tap does (toggle, replace, clear) is the step's own rule. */
export function OptionList<Id extends string>({ label, kind, options, selected, onToggle, columns = 1 }: OptionListProps<Id>) {
  const classNames = ['option-list', `option-list-${kind}`, columns === 2 ? 'option-list-two-columns' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames} role={kind === 'single' ? 'radiogroup' : 'group'} aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className="option-list-option"
          role={kind === 'single' ? 'radio' : 'checkbox'}
          aria-checked={selected.includes(option.id)}
          onClick={() => onToggle(option.id)}
        >
          {/* The outline unwraps into the check mark: both are stroke-dash drawings (OptionList.css). */}
          <span className="option-list-box" aria-hidden="true">
            <svg viewBox="0 0 18 18">
              <path d="M1,9 L1,3.5 C1,2 2,1 3.5,1 L14.5,1 C16,1 17,2 17,3.5 L17,14.5 C17,16 16,17 14.5,17 L3.5,17 C2,17 1,16 1,14.5 L1,9 Z" />
              <polyline points="1 9 7 14 15 4" />
            </svg>
          </span>
          <span className="option-list-label">{option.label}</span>
        </button>
      ))}
    </div>
  );
}
