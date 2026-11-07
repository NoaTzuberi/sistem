import type { MouseEvent } from 'react';
import { IconArrowRight } from '@tabler/icons-react';
import { useCopy } from '@sistem/shared';
import { COACH_DASHBOARD_URL } from '../../../../app/config/env';
import { openExternal } from '../../../../services/external/openExternal';
import { authCopy } from '../../copy';
// The same quiet line as the other auth footer links.
import '../AuthFooterLink/AuthFooterLink.css';

/** The quiet link under the login card that takes the coach to her web dashboard. Hidden when no address is set. */
export function CoachDashboardLink() {
  const copy = useCopy(authCopy);
  const url = COACH_DASHBOARD_URL;
  if (!url) return null;

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    openExternal(url!);
  }

  return (
    <a className="auth-footer-link" href={url} target="_blank" rel="noopener noreferrer" onClick={handleClick}>
      <span>{copy.coachDashboardLink}</span>
      <IconArrowRight className="flip-rtl" size={18} stroke={2.4} aria-hidden="true" />
    </a>
  );
}
