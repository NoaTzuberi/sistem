import type { Response } from 'express';
import type { CoachPaymentResponse, CoachSendDefaultsResponse } from '@sistem/types';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { sendError } from '../../i18n';
import { getCoachPayment, getCoachSendDefaults, updateCoachPayment, updateCoachSendDefaults } from './coachProfile.service';
import { parseCoachDefaultsPayload } from './coachDefaults.validation';
import { parseCoachPaymentPayload } from './coachPayment.validation';

// GET / PUT /api/coach/profile/payment — her own payment links (role coach, from the coach router).

export async function getMyPayment(req: AuthenticatedRequest, res: Response) {
  const body: CoachPaymentResponse = { payment: await getCoachPayment(req.userId!) };
  res.status(200).json(body);
}

export async function putMyPayment(req: AuthenticatedRequest, res: Response) {
  const parsed = parseCoachPaymentPayload(req.body);
  if (parsed.error !== undefined) return sendError(res, 400, parsed.error);
  const body: CoachPaymentResponse = { payment: await updateCoachPayment(req.userId!, parsed.value) };
  res.status(200).json(body);
}

// GET / PATCH /api/coach/profile/defaults — her own saved message + tip for sending a plan.

export async function getMyDefaults(req: AuthenticatedRequest, res: Response) {
  const body: CoachSendDefaultsResponse = { defaults: await getCoachSendDefaults(req.userId!) };
  res.status(200).json(body);
}

export async function patchMyDefaults(req: AuthenticatedRequest, res: Response) {
  const parsed = parseCoachDefaultsPayload(req.body);
  if (parsed.error !== undefined) return sendError(res, 400, parsed.error);
  const body: CoachSendDefaultsResponse = { defaults: await updateCoachSendDefaults(req.userId!, parsed.value) };
  res.status(200).json(body);
}
