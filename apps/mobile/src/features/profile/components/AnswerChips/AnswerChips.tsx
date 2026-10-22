import './AnswerChips.css';

export interface AnswerChip {
  id: string;
  label: string;
  emoji?: string;
}

/** Her chosen answers as rounded chips in the section's tint (display only — editing is in the sheet). */
export function AnswerChips({ chips, label }: { chips: AnswerChip[]; label?: string }) {
  return (
    <div className="qn-chips-group">
      {label && <span className="qn-chips-label">{label}</span>}
      <ul className="qn-chips">
        {chips.map((chip) => (
          <li key={chip.id} className="qn-chip" dir="auto">
            {chip.emoji && (
              <span className="qn-chip-emoji" aria-hidden="true">
                {chip.emoji}
              </span>
            )}
            {chip.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
