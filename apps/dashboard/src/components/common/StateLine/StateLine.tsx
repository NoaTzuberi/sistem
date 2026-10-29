import { sharedCopy, useCopy } from '@sistem/shared';
import './StateLine.css';

interface StateLineProps {
  /** An error to show; without it the line says "loading". */
  error?: string;
  onRetry?: () => void;
  /** The retry button's text; default = the shared "retry". */
  retryLabel?: string;
}

/** The loading / error line of a dashboard page or widget. */
export function StateLine({ error, onRetry, retryLabel }: StateLineProps) {
  const shared = useCopy(sharedCopy);
  if (!error) return <p className="state-line">{shared.common.loading}</p>;
  return (
    <p className="state-line" role="alert">
      {error}
      {onRetry && (
        <button className="state-line-retry" type="button" onClick={onRetry}>
          {retryLabel ?? shared.common.retry}
        </button>
      )}
    </p>
  );
}
