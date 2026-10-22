import type { Response } from 'express';
import type { AiRecommendationLatest } from '@sistem/types';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { aiUnavailableReason } from '../ai/ai.config';
import {
  getLatestRecommendation,
  getRecommendation,
  presentRecommendation,
  startRecommendation,
} from './aiRecommendation.service';
import { parseRecommendationType, validateRecommendationIdParam } from './aiRecommendation.validation';
import { findSplit, getEffectiveTrainingConfig } from '../trainingSplits/trainingSplit.service';
import { requestLanguage, sendError, translate } from '../../i18n';

// Coach-only (mounted on /api/coach behind requireRole('coach') + loadCoachTrainee).
// No trainee route reads recommendations: an AI draft reaches her only as a plan the
// coach saved and published.

export async function getLatestTraineeRecommendation(req: AuthenticatedRequest, res: Response) {
  const type = parseRecommendationType(req.query.type ?? 'training_plan');
  if (!type) {
    sendError(res, 400, 'ai_type_invalid');
    return;
  }
  const unavailable = aiUnavailableReason();
  const body: AiRecommendationLatest = {
    recommendation: await getLatestRecommendation(req.coachingId!, type, requestLanguage(req)),
    unavailableReason: unavailable ? translate(requestLanguage(req), unavailable) : null,
  };
  res.status(200).json(body);
}

export async function getTraineeRecommendation(req: AuthenticatedRequest, res: Response) {
  const validationError = validateRecommendationIdParam(req.params.recommendationId);
  if (validationError) {
    sendError(res, 400, validationError);
    return;
  }
  const recommendation = await getRecommendation(req.coachingId!, String(req.params.recommendationId), requestLanguage(req));
  if (!recommendation) {
    sendError(res, 404, 'ai_recommendation_not_found');
    return;
  }
  res.status(200).json({ recommendation });
}

/** Generate / Regenerate. 202: started in the background; poll …/latest for the result. */
export async function createTraineeRecommendation(req: AuthenticatedRequest, res: Response) {
  const type = parseRecommendationType(req.body?.type);
  if (!type) {
    sendError(res, 400, 'ai_type_invalid');
    return;
  }
  const unavailable = aiUnavailableReason();
  if (unavailable) {
    sendError(res, 503, unavailable);
    return;
  }

  // Phase 12b: "Generate a plan for this split" — only a split of her coach's config.
  const splitId = req.body?.splitId;
  if (splitId !== undefined) {
    const known = type === 'training_plan' && typeof splitId === 'string' && findSplit(await getEffectiveTrainingConfig(req.userId!), splitId);
    if (!known) {
      sendError(res, 400, 'ai_split_unknown');
      return;
    }
  }

  const started = await startRecommendation({
    traineeId: req.traineeId!,
    coachId: req.userId!,
    coachingId: req.coachingId!,
    type,
    trigger: 'coach',
    request: splitId ? { splitId } : null,
  });
  const recommendation = await presentRecommendation(started.recommendation, requestLanguage(req));
  if (!started.created) {
    sendError(res, 409, 'ai_already_running', { recommendation });
    return;
  }
  res.status(202).json({ recommendation });
}
