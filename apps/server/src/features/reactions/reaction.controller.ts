import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { sendError } from '../../i18n';
import { parseReactionListQuery, parseSetReactionBody } from './reaction.validation';
import { ReactionTargetNotFoundError, listMyReactions, markMyReactionsSeen, setCoachReaction } from './reaction.service';

/* Coach (after loadCoachTrainee) */

export async function putTraineeReaction(req: AuthenticatedRequest, res: Response) {
  const parsed = parseSetReactionBody(req.body);
  if (parsed.error) {
    sendError(res, 400, parsed.error);
    return;
  }
  try {
    const reaction = await setCoachReaction(req.userId!, req.traineeId!, req.coachingId!, parsed.value);
    res.status(200).json({ reaction });
  } catch (error) {
    if (error instanceof ReactionTargetNotFoundError) {
      sendError(res, 404, error.serverMessage);
      return;
    }
    throw error;
  }
}

/* Trainee */

export async function getMyReactions(req: AuthenticatedRequest, res: Response) {
  const parsed = parseReactionListQuery(req.query as Record<string, unknown>);
  if (parsed.error) {
    sendError(res, 400, parsed.error);
    return;
  }
  res.status(200).json(await listMyReactions(req.userId!, parsed.value));
}

export async function postMyReactionsSeen(req: AuthenticatedRequest, res: Response) {
  await markMyReactionsSeen(req.userId!);
  res.status(204).end();
}
