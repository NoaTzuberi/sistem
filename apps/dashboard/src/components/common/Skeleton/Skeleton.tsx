import { sharedCopy, useCopy } from '@sistem/shared';
import './Skeleton.css';

type SkeletonLayout = 'overview' | 'cards' | 'rows' | 'profile' | 'panel';

interface SkeletonProps {
  /** The shape of what is loading: the overview / stats widgets, a table, a profile, one tab's widgets. */
  layout: SkeletonLayout;
}

const ROWS = 6;

/**
 * Grey blocks in the shape of the widgets that are loading (instead of a "loading" line), so the page
 * doesn't jump when the data lands. A gentle pulse; still under reduced motion. Screen readers hear "loading".
 */
export function Skeleton({ layout }: SkeletonProps) {
  const shared = useCopy(sharedCopy);
  return (
    <div className={`skeleton skeleton-${layout}`} role="status" aria-live="polite">
      <span className="visually-hidden">{shared.common.loading}</span>
      {layout === 'overview' && (
        <>
          <span className="skeleton-block skeleton-hero" />
          <span className="skeleton-block skeleton-hero" />
          <span className="skeleton-block skeleton-hero" />
          <span className="skeleton-block skeleton-wide" />
          <span className="skeleton-block skeleton-wide skeleton-wide-major" />
        </>
      )}
      {layout === 'cards' && (
        <>
          <span className="skeleton-block skeleton-tile" />
          <span className="skeleton-block skeleton-tile" />
          <span className="skeleton-block skeleton-tile" />
          <span className="skeleton-block skeleton-tile" />
          <span className="skeleton-block skeleton-chart" />
          <span className="skeleton-block skeleton-chart" />
        </>
      )}
      {layout === 'rows' && (
        <span className="skeleton-block skeleton-table">
          {Array.from({ length: ROWS }, (_, index) => (
            <span key={index} className="skeleton-row">
              <span className="skeleton-dot" />
              <span className="skeleton-line" />
              <span className="skeleton-line skeleton-line-short" />
            </span>
          ))}
        </span>
      )}
      {layout === 'profile' && (
        <>
          <span className="skeleton-block skeleton-header" />
          <span className="skeleton-block skeleton-tabs" />
          <span className="skeleton-block skeleton-chart" />
          <span className="skeleton-block skeleton-chart skeleton-chart-side" />
        </>
      )}
      {layout === 'panel' && (
        <>
          <span className="skeleton-block skeleton-tile" />
          <span className="skeleton-block skeleton-tile" />
          <span className="skeleton-block skeleton-tile" />
          <span className="skeleton-block skeleton-tile" />
          <span className="skeleton-block skeleton-panel-body" />
        </>
      )}
    </div>
  );
}
