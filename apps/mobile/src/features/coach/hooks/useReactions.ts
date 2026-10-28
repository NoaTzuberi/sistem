import { useCallback, useRef, useState } from 'react';
import type { CoachActivityItem, ReactionId } from '@sistem/types';
import { setReaction } from '../../../services/coach/coachConnectService';

type Reactable = Pick<CoachActivityItem, 'id' | 'trainee' | 'reactionTarget'>;

/**
 * The coach's reactions on the feed: one per item, a tap toggles (the same emoji again removes it).
 * Shown at once; a failed save puts the old one back and calls onError.
 */
export function useReactions(onError: () => void) {
  const [overrides, setOverrides] = useState<Record<string, ReactionId | null>>({});
  const overridesRef = useRef(overrides);
  overridesRef.current = overrides;

  const reactionOf = useCallback(
    (item: Reactable): ReactionId | null => (item.id in overrides ? overrides[item.id]! : (item.reactionTarget?.reaction ?? null)),
    [overrides],
  );

  const toggle = useCallback(
    async (item: Reactable, reaction: ReactionId) => {
      const target = item.reactionTarget;
      if (!target) return;
      const before = item.id in overridesRef.current ? overridesRef.current[item.id]! : target.reaction;
      const next = before === reaction ? null : reaction;
      setOverrides((current) => ({ ...current, [item.id]: next }));
      try {
        await setReaction(item.trainee.id, { targetType: target.type, targetId: target.id, reaction: next });
      } catch {
        setOverrides((current) => ({ ...current, [item.id]: before }));
        onError();
      }
    },
    [onError],
  );

  return { reactionOf, toggle };
}
