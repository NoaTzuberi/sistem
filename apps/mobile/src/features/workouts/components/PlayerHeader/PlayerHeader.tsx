import { useCopy } from '@sistem/shared';
import { IconDots, IconX } from '@tabler/icons-react';
import { workoutCopy } from '../../copy';
import { PlayerProgress } from '../PlayerProgress/PlayerProgress';
import type { ProgressGroup } from '../PlayerProgress/PlayerProgress';
import { SessionClock } from '../SessionClock/SessionClock';
import { SoundToggle } from '../SoundToggle/SoundToggle';
import './PlayerHeader.css';

interface PlayerHeaderProps {
  workoutTitle: string;
  startedAt: string;
  serverOffsetMs: number;
  groups: ProgressGroup[];
  currentGroupId: string | null;
  /** 1-based place of the exercise on screen. */
  exerciseNumber: number;
  doneSets: number;
  totalSets: number;
  onEnd: () => void;
  onMenu: () => void;
}

/**
 * The sticky top of the player (white blur): end ✕ and sound on the start side, ⋯ on the other,
 * the workout name and the big running clock in the middle, then the segmented progress.
 */
export function PlayerHeader(props: PlayerHeaderProps) {
  const { workoutTitle, startedAt, serverOffsetMs, groups, currentGroupId, exerciseNumber, doneSets, totalSets, onEnd, onMenu } = props;
  const copy = useCopy(workoutCopy);

  return (
    <header className="wp-header">
      <div className="wp-header-bar">
        <button type="button" className="wp-icon-button" aria-label={copy.player.end} onClick={onEnd}>
          <IconX size={20} stroke={2.4} aria-hidden="true" />
        </button>
        {/* One sound setting for every timer: rest, holds and intervals. */}
        <SoundToggle className="wp-icon-button wp-sound" />
        <div className="wp-header-title">
          <span className="wp-header-name" dir="auto" aria-hidden="true">
            {workoutTitle}
          </span>
          <SessionClock className="wp-header-clock" startedAt={startedAt} serverOffsetMs={serverOffsetMs} label={copy.player.clock} />
        </div>
        <button type="button" className="wp-icon-button" aria-label={copy.session.menu} onClick={onMenu}>
          <IconDots size={20} stroke={2.4} aria-hidden="true" />
        </button>
        <span className="wp-header-spacer" aria-hidden="true" />
      </div>
      <PlayerProgress groups={groups} currentId={currentGroupId} />
      <div className="wp-header-counts">
        <span>
          {copy.player.exercise} <b dir="ltr">{exerciseNumber}</b> {copy.player.of} <b dir="ltr">{groups.length}</b>
        </span>
        <span>
          <bdi dir="ltr">
            <b>{doneSets}</b> / {totalSets}
          </bdi>{' '}
          {copy.player.sets}
        </span>
      </div>
    </header>
  );
}
