import type { ReactNode } from 'react';
import './ProfileRow.css';

interface ProfileRowProps {
  icon: ReactNode;
  label: string;
  /** The muted line under the label (one line, cut with an ellipsis). */
  sub?: ReactNode;
  /** Controls / a trailing hint at the end of the row. */
  trailing?: ReactNode;
  /** The whole row is one button (e.g. log out, open the dashboard). */
  onClick?: () => void;
  /** The control goes under the label, full width (a wide segmented control). */
  below?: ReactNode;
}

/** One row of the coach Profile's white grouped lists (design group 5): icon tile, label (+ line), trailing. */
export function ProfileRow({ icon, label, sub, trailing, onClick, below }: ProfileRowProps) {
  const content = (
    <>
      <span className="cp-row-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="cp-row-text">
        <span className="cp-row-label">{label}</span>
        {sub && <span className="cp-row-sub">{sub}</span>}
      </span>
      {trailing}
    </>
  );

  return (
    <li className="cp-row-item">
      {onClick ? (
        <button type="button" className="cp-row cp-row-button" onClick={onClick}>
          {content}
        </button>
      ) : (
        <div className="cp-row">{content}</div>
      )}
      {below && <div className="cp-row-below">{below}</div>}
    </li>
  );
}
