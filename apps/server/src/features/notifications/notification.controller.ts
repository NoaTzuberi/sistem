import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { parseNotificationListQuery, parseThanksBody, validateNotificationIdParam } from './notification.validation';
import { CoachNoteNotFoundError, thankCoachForNote } from './coachNoteThanks.service';
import {
  listNotifications,
  countUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  NotificationNotFoundError,
} from './notification.service';
import { sendError } from '../../i18n';

export async function getMyNotifications(req: AuthenticatedRequest, res: Response) {
  const parsed = parseNotificationListQuery(req.query as Record<string, unknown>);
  if ('error' in parsed) {
    sendError(res, 400, parsed.error);
    return;
  }

  const list = await listNotifications(req.userId!, parsed.value);
  res.status(200).json(list);
}

export async function getMyUnreadCount(req: AuthenticatedRequest, res: Response) {
  const unreadCount = await countUnreadNotifications(req.userId!);
  res.status(200).json({ unreadCount });
}

export async function markMyNotificationRead(req: AuthenticatedRequest, res: Response) {
  const validationError = validateNotificationIdParam(req.params.id);
  if (validationError) {
    sendError(res, 400, validationError);
    return;
  }

  try {
    const notification = await markNotificationRead(req.userId!, String(req.params.id));
    res.status(200).json({ notification });
  } catch (error) {
    if (error instanceof NotificationNotFoundError) {
      sendError(res, 404, error.serverMessage);
      return;
    }
    throw error;
  }
}

export async function markAllMyNotificationsRead(req: AuthenticatedRequest, res: Response) {
  await markAllNotificationsRead(req.userId!);
  res.status(200).json({ unreadCount: 0 });
}

/** 204 — also when she already thanked for this note (one notification per note). */
export async function thankMyCoach(req: AuthenticatedRequest, res: Response) {
  const parsed = parseThanksBody(req.body);
  if ('error' in parsed) {
    sendError(res, 400, parsed.error);
    return;
  }

  try {
    await thankCoachForNote(req.userId!, parsed.value);
    res.status(204).end();
  } catch (error) {
    if (error instanceof CoachNoteNotFoundError) {
      sendError(res, 404, error.serverMessage);
      return;
    }
    throw error;
  }
}
