import { useEffect, useState } from 'react';
import type { CoachReaction } from '@sistem/types';
import { fill, useCopy } from '@sistem/shared';
import { listMyReactions } from '../../../../services/messages/messagesService';
import { messagesCopy } from '../../copy';
import { REACTION_EMOJI } from '../../data/reactionEmoji';
import './LogReactions.css';

/** Her coach's reaction(s) on one workout log ("שקד הגיבה 🔥"). Nothing when there is none or the call fails. */
export function LogReactions({ logId }: { logId: string }) {
  const copy = useCopy(messagesCopy);
  const [items, setItems] = useState<CoachReaction[]>([]);

  useEffect(() => {
    let isCurrent = true;
    listMyReactions(logId)
      .then((list) => {
        if (isCurrent) setItems(list.items);
      })
      .catch(() => undefined);
    return () => {
      isCurrent = false;
    };
  }, [logId]);

  if (items.length === 0) return null;
  return (
    <ul className="cr-log">
      {items.map((item) => (
        <li key={item.id} className="cr-log-item" dir="auto">
          {fill(copy.reactionOnLog, { coach: item.coachName, emoji: REACTION_EMOJI[item.reaction] })}
        </li>
      ))}
    </ul>
  );
}
