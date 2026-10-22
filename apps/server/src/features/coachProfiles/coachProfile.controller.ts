import type { Response } from 'express';
import type { CoachPaymentResponse } from '@sistem/types';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { sendError } from '../../i18n';
import { getCoachPayment, updateCoachPayment } from './coachProfile.service';
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
