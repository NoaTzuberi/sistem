import { IconUsers } from '@tabler/icons-react';
import { useCopy } from '@sistem/shared';
import { firstRunCopy } from '../../copy';
import './JoinBanner.css';

/** The slim "Joining <coach>'s coaching" line — from the sign-up on, when she came through a coach's link. */
export function JoinBanner({ coachName }: { coachName: string }) {
  const copy = useCopy(firstRunCopy);
  const [before, after = ''] = copy.banner.split('{coach}');
  return (
    <p className="fr-banner" role="status">
      <IconUsers size={16} aria-hidden="true" />
      <span>
        {before}
        <bdi>{coachName}</bdi>
        {after}
      </span>
    </p>
  );
}
