import type { ReactionId } from '@sistem/types';
import { useCopy } from '@sistem/shared';
import { REACTION_EMOJI, REACTION_ORDER } from '../../../messages/data/reactionEmoji';
import { coachCopy } from '../../copy';
import './ReactionBar.css';

interface ReactionBarProps {
  value: ReactionId | null;
  onSelect: (reaction: ReactionId) => void;
}

/** 👏 🔥 ❤️ under a feed item: one can be on (pressed); the same one again turns it off. */
export function ReactionBar({ value, onSelect }: ReactionBarProps) {
  const copy = useCopy(coachCopy).reactions;
  return (
    <div className="cf-reactions" role="group" aria-label={copy.label}>
      {REACTION_ORDER.map((id) => (
        <button
          key={id}
          type="button"
          className="cf-reaction"
          aria-pressed={value === id}
          aria-label={`${copy.label}: ${copy.names[id]}`}
          onClick={() => onSelect(id)}
        >
          <span aria-hidden="true">{REACTION_EMOJI[id]}</span>
        </button>
      ))}
    </div>
  );
}
