import type { AnimationEventHandler } from 'react';
import type { FoodGroup } from '@sistem/types';
import { GroupIcon } from '../groupIcons';
import '../../groupColors.css';
import './GroupBadge.css';

interface GroupBadgeProps {
  group: FoodGroup;
  /** The parent's own state classes (the completion pop). */
  className?: string;
  onAnimationEnd?: AnimationEventHandler<HTMLSpanElement>;
}

/** The group's round badge: its white glyph on the group's color. Decorative — the name is next to it. */
export function GroupBadge({ group, className, onAnimationEnd }: GroupBadgeProps) {
  return (
    <span className={['tn-badge', `tn-group-${group}`, className].filter(Boolean).join(' ')} aria-hidden="true" onAnimationEnd={onAnimationEnd}>
      <GroupIcon group={group} />
    </span>
  );
}
