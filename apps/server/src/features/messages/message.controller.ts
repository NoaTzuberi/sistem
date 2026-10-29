import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { sendError } from '../../i18n';
import { parseMessagePageQuery, parseSendMessageBody } from './message.validation';
import {
  NoCoachingError,
  countCoachUnread,
  countTraineeUnread,
  getCoachThreadPage,
  getTraineeThread,
  listCoachThreads,
  markCoachThreadRead,
  markTraineeThreadRead,
  sendCoachMessage,
  sendTraineeMessage,
} from './message.service';

/* Coach — every :traineeId route runs after loadCoachTrainee (a live coaching of this coach). */

export async function getCoachThreads(req: AuthenticatedRequest, res: Response) {
  res.status(200).json(await listCoachThreads(req.userId!));
}

export async function getCoachUnread(req: AuthenticatedRequest, res: Response) {
  res.status(200).json({ unread: await countCoachUnread(req.userId!) });
}

export async function getTraineeMessages(req: AuthenticatedRequest, res: Response) {
  const parsed = parseMessagePageQuery(req.query as Record<string, unknown>);
  if (parsed.error) {
    sendError(res, 400, parsed.error);
    return;
  }
  res.status(200).json(await getCoachThreadPage(req.coachingId!, parsed.value));
}

export async function postTraineeMessage(req: AuthenticatedRequest, res: Response) {
  const parsed = parseSendMessageBody(req.body);
  if (parsed.error) {
    sendError(res, 400, parsed.error);
    return;
  }
  res.status(201).json({ message: await sendCoachMessage(req.userId!, req.traineeId!, req.coachingId!, parsed.value) });
}

export async function postTraineeMessagesRead(req: AuthenticatedRequest, res: Response) {
  res.status(200).json({ unread: await markCoachThreadRead(req.userId!, req.coachingId!) });
}

/* Trainee — her thread with her current coach. */

export async function getMyThread(req: AuthenticatedRequest, res: Response) {
  const parsed = parseMessagePageQuery(req.query as Record<string, unknown>);
  if (parsed.error) {
    sendError(res, 400, parsed.error);
    return;
  }
  res.status(200).json(await getTraineeThread(req.userId!, parsed.value));
}

export async function getMyUnreadMessages(req: AuthenticatedRequest, res: Response) {
  res.status(200).json({ unread: await countTraineeUnread(req.userId!) });
}

export async function postMyMessage(req: AuthenticatedRequest, res: Response) {
  const parsed = parseSendMessageBody(req.body);
  if (parsed.error) {
    sendError(res, 400, parsed.error);
    return;
  }
  try {
    res.status(201).json({ message: await sendTraineeMessage(req.userId!, parsed.value) });
  } catch (error) {
    if (error instanceof NoCoachingError) {
      sendError(res, 409, error.serverMessage);
      return;
    }
    throw error;
  }
}

export async function postMyMessagesRead(req: AuthenticatedRequest, res: Response) {
  res.status(200).json({ unread: await markTraineeThreadRead(req.userId!) });
}
