import { Link } from 'react-router-dom';
import { IconArrowRight } from '@tabler/icons-react';
import './AuthFooterLink.css';

interface AuthFooterLinkProps {
  to: string;
  children: string;
}

/** The quiet link under the auth card (e.g. back to log in); its arrow points along the reading direction. */
export function AuthFooterLink({ to, children }: AuthFooterLinkProps) {
  return (
    <Link className="auth-footer-link" to={to}>
      <span>{children}</span>
      <IconArrowRight className="flip-rtl" size={18} stroke={2.4} aria-hidden="true" />
    </Link>
  );
}
