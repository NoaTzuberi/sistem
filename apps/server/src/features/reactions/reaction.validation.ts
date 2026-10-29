import mongoose from 'mongoose';
import type { ReactionId, ReactionTargetType, SetReactionPayload } from '@sistem/types';
import { type ServerMessage, msg } from '../../i18n';
import { isDateString } from '../plans/planWeek';
import { LOG_TARGET_TYPES, REACTION_IDS, REACTION_TARGET_TYPES } from './reaction.constants';

type Parsed<T> = { value: T; error?: undefined } | { value?: undefined; error: ServerMessage };

export function isLogTarget(type: ReactionTargetType): boolean {
  return (LOG_TARGET_TYPES as readonly string[]).includes(type);
}

/** PUT …/reactions { targetType, targetId (a log id or a date), reaction: id | null }. */
export function parseSetReactionBody(body: unknown): Parsed<SetReactionPayload> {
  const { targetType, targetId, reaction } = (body ?? {}) as Record<string, unknown>;
  if (typeof targetType !== 'string' || !(REACTION_TARGET_TYPES as readonly string[]).includes(targetType)) {
    return { error: msg('reaction_target_invalid') };
  }
  const type = targetType as ReactionTargetType;
  const validId = typeof targetId === 'string' && (isLogTarget(type) ? mongoose.isValidObjectId(targetId) : isDateString(targetId));
  if (!validId) return { error: msg('reaction_target_invalid') };
  if (reaction !== null && (typeof reaction !== 'string' || !(REACTION_IDS as readonly string[]).includes(reaction))) {
    return { error: msg('reaction_invalid') };
  }
  return { value: { targetType: type, targetId: targetId as string, reaction: reaction as ReactionId | null } };
}

/** GET /reactions?logId= */
export function parseReactionListQuery(query: Record<string, unknown>): Parsed<{ logId?: string }> {
  const { logId } = query;
  if (logId === undefined) return { value: {} };
  if (typeof logId !== 'string' || !mongoose.isValidObjectId(logId)) return { error: msg('id_invalid', { label: 'log' }) };
  return { value: { logId } };
}
