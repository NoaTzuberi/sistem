import './ValueScoreboard.css';

export interface ScoreValue {
  id: string;
  value: string;
  unit?: string;
  label: string;
}

/** Single values in a row (weight, height, age, target): a Barlow number + unit, a small muted label. */
export function ValueScoreboard({ values }: { values: ScoreValue[] }) {
  return (
    <dl className="qn-score">
      {values.map((item) => (
        <div key={item.id} className="qn-score-cell">
          <dt className="qn-score-label">{item.label}</dt>
          <dd className="qn-score-value">
            <bdi className="qn-score-num">{item.value}</bdi>
            {item.unit && <span className="qn-score-unit">{item.unit}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
