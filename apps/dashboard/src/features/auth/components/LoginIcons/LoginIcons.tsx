import type { ReactNode } from 'react';

// The three line icons of the login card. Drawn here because the dashboard has no icon library.

function LineIcon({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function MailIcon() {
  return (
    <LineIcon>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </LineIcon>
  );
}

export function LockIcon() {
  return (
    <LineIcon>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </LineIcon>
  );
}

/** Points along the reading direction (mirrored in Hebrew by `flip-rtl`). */
export function ArrowIcon() {
  return (
    <LineIcon className="flip-rtl">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </LineIcon>
  );
}

/** The show / hide password toggle: an open eye = "show"; never mirrored. */
export function EyeIcon() {
  return (
    <LineIcon>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </LineIcon>
  );
}

export function EyeOffIcon() {
  return (
    <LineIcon>
      <path d="M10.6 5.1A9.9 9.9 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-2.4 3.4" />
      <path d="M6.6 6.6C3.7 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m2 2 20 20" />
    </LineIcon>
  );
}
