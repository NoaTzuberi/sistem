import './WorkoutFacts.css';

export interface WorkoutFact {
  id: string;
  /** Digits / "3/4" — set left-to-right in Barlow. */
  value: string;
  label: string;
}

interface WorkoutFactsProps {
  facts: WorkoutFact[];
  label: string;
}

/** The stage's facts row: scoreboard numbers split by hairlines. A fact without data is not passed in. */
export function WorkoutFacts({ facts, label }: WorkoutFactsProps) {
  if (facts.length === 0) return null;
  return (
    <dl className="workout-facts" aria-label={label}>
      {facts.map((fact) => (
        <div className="workout-facts-item" key={fact.id}>
          <dt className="workout-facts-label">{fact.label}</dt>
          <dd className="workout-facts-value" dir="ltr">
            {fact.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
