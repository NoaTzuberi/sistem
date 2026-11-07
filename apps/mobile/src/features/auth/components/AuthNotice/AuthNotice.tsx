import type { ReactNode } from 'react';
import './AuthNotice.css';

interface AuthNoticeProps {
  /** A round white chip with one icon (mail, broken link). */
  icon: ReactNode;
  title: string;
  text: string;
  /** The one action under the text. */
  children: ReactNode;
}

/** A centered state of the auth card (reset link sent, link invalid): icon, title, one line, one action. */
export function AuthNotice({ icon, title, text, children }: AuthNoticeProps) {
  return (
    <div className="auth-notice">
      <span className="auth-notice-icon" aria-hidden="true">
        {icon}
      </span>
      <h1 className="auth-glass-title display-title">{title}</h1>
      <p className="auth-notice-text">{text}</p>
      {children}
    </div>
  );
}
