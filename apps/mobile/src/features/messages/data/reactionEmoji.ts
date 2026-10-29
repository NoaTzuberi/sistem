import type { ReactionId } from '@sistem/types';

/** The order on the feed and the emoji drawn for each id (an emoji is not text to translate). */
export const REACTION_ORDER: readonly ReactionId[] = ['clap', 'fire', 'heart'];

export const REACTION_EMOJI: Record<ReactionId, string> = { clap: '👏', fire: '🔥', heart: '❤️' };
