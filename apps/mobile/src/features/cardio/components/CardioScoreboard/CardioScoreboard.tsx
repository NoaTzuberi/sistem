import './CardioScoreboard.css';

export interface ScoreItem {
  id: string;
  value: string;
  label: string;
}

/** Three numbers with hairlines between them (detail and finish). */
export function CardioScoreboard({ items }: { items: ScoreItem[] }) {
  return (
    <dl className="cp-scoreboard">
      {items.map((item) => (
        <div key={item.id} className="cp-scoreboard-item">
          <dt className="cp-scoreboard-label">{item.label}</dt>
          <dd className="cp-scoreboard-value">
            <bdi dir="ltr">{item.value}</bdi>
          </dd>
        </div>
      ))}
    </dl>
  );
}
