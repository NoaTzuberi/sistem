import type { CSSProperties } from 'react';
import './PlayerProgress.css';

export interface ProgressGroup {
  id: string;
  /** One entry per set: done or not. */
  sets: boolean[];
}

interface PlayerProgressProps {
  groups: ProgressGroup[];
  /** The exercise on screen: its open segments are a shade darker. */
  currentId: string | null;
}

/**
 * The workout as thin segments: one group per exercise (or superset), one segment per set,
 * a group's width follows its set count. Decoration — the numbers under it carry the meaning.
 */
export function PlayerProgress({ groups, currentId }: PlayerProgressProps) {
  return (
    <div className="wp-progress" aria-hidden="true">
      {groups.map((group) => (
        <span
          key={group.id}
          className={group.id === currentId ? 'wp-progress-group wp-progress-group-current' : 'wp-progress-group'}
          style={{ '--wp-sets': group.sets.length } as CSSProperties}
        >
          {group.sets.map((done, index) => (
            <i key={index} className={done ? 'wp-progress-set wp-progress-set-done' : 'wp-progress-set'} />
          ))}
        </span>
      ))}
    </div>
  );
}
