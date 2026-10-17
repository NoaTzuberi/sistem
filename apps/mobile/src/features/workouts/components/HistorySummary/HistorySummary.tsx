import { fill, formatNumber, useCopy, useLanguage } from '@sistem/shared';
import { formatMonthName, type MonthKey } from '../../data/historyDisplay';
import { workoutCopy } from '../../copy';
import './HistorySummary.css';

interface HistorySummaryProps {
  total: number;
  inMonth: number;
  prs: number;
  /** The current month (her zone), for "In October". */
  month: MonthKey;
}

/** Three big numbers with hairlines: workouts in total, this month, personal records. */
export function HistorySummary({ total, inMonth, prs, month }: HistorySummaryProps) {
  const copy = useCopy(workoutCopy);
  const language = useLanguage();
  const stats = [
    { value: total, label: copy.history.total },
    { value: inMonth, label: fill(copy.history.inMonth, { month: formatMonthName(month, language) }) },
    { value: prs, label: copy.history.prs },
  ];
  return (
    <dl className="history-summary">
      {stats.map((stat) => (
        <div key={stat.label} className="history-summary-item">
          <dt className="history-summary-label">{stat.label}</dt>
          <dd className="history-summary-value">{formatNumber(stat.value, language)}</dd>
        </div>
      ))}
    </dl>
  );
}
