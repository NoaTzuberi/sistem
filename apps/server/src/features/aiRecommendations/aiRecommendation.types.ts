import type { Types } from 'mongoose';
import type { AiRecommendationStatus, AiRecommendationTrigger, AiRecommendationType } from '@sistem/types';
import type { ServerMessage } from '../../i18n';

/** One call to the model: kept for cost and quality checks (coach-invisible). */
export interface RecommendationAttempt {
  startedAt: Date;
  finishedAt: Date;
  model: string | null;
  finish: string | null;
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
  /** What was wrong with the reply (sent back to the model on the next attempt). */
  issues: string[];
  error: string | null;
  /** The reply came from the fallback model; why the main one failed. */
  fallbackReason: string | null;
}

export interface AiRecommendationDocument {
  traineeId: Types.ObjectId;
  coachingId: Types.ObjectId;
  coachId: Types.ObjectId;
  type: AiRecommendationType;
  status: AiRecommendationStatus;
  trigger: AiRecommendationTrigger;
  /** Phase 12b: what the coach asked for (a split for the training plan). */
  request?: { splitId?: string } | null;
  /** True while pending / running: a unique index allows one active run per trainee and type. */
  active: boolean;
  promptVersion: string | null;
  /**
   * Everything that was sent, so the coach can see what the draft is based on.
   * Health data: same access as the onboarding answers (her coach only).
   */
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  model: string | null;
  attempts: RecommendationAttempt[];
  /**
   * Why it failed. `message` is English (logs, rows saved before Phase 15); `text` is the
   * message as a code + params, worded in the coach's language when read.
   */
  error: { code: string; message: string; text?: ServerMessage | null } | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
