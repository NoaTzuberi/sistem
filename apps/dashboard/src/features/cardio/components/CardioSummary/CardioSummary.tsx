import { type CardioTotals, cardioMinutes, formatClock, useCopy } from '@sistem/shared';
import { cardioCopy } from '../../copy';
import { stepsEyebrow } from '../../data/cardioLabels';
import './CardioSummary.css';

interface CardioSummaryProps {
  totals: CardioTotals;
  /** Blocks in the unrolled timeline. */
  stepCount: number;
}

/** Total minutes, high-intensity time and rounds above the graph. */
export function CardioSummary({ totals, stepCount }: CardioSummaryProps) {
  const copy = useCopy(cardioCopy);
  const items = [
    { id: 'total', value: `${cardioMinutes(totals.totalSec)}′`, label: copy.total },
    { id: 'high', value: formatClock(totals.highIntensitySec), label: copy.high },
    { id: 'rounds', value: totals.rounds > 0 ? String(totals.rounds) : '—', label: copy.rounds },
  ];
  return (
    <div className="cb-summary">
      {items.map((item) => (
        <div key={item.id} className="cb-summary-item">
          <bdi className="cb-summary-value" dir="ltr">
            {item.value}
          </bdi>
          <span className="cb-summary-label">{item.label}</span>
        </div>
      ))}
      <code className="cb-summary-eyebrow" aria-hidden="true">
        {stepsEyebrow(stepCount)}
      </code>
    </div>
  );
}
