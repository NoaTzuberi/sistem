import { Types } from 'mongoose';
import type {
  CardioLog as PublicCardioLog,
  CardioOccurrence,
  CardioSession as PublicCardioSession,
  CardioStep,
  CoachCardioList,
  SaveCardioLogPayload,
  SaveCardioSessionPayload,
  TraineeCardioSessionResponse,
  TraineeCardioWeek,
} from '@sistem/types';
import { LocalizedError } from '../../i18n';
import { User } from '../users/user.model';
import { DEFAULT_TIMEZONE } from '../users/users.constants';
import { resolveWorkoutStatus } from '../plans/planStatus';
import { addDays, localDateString, weekStartOf } from '../plans/planWeek';
import { COACH_CARDIO_LOG_LIMIT } from './cardio.constants';
import { CardioLog, CardioSession } from './cardio.model';
import type { CardioLogDocument, CardioSessionDocument, CardioStepFields } from './cardio.types';
import { cardioTotals } from './cardioSteps';

// Cardio sessions: the coach builds them per trainee; the trainee sees each active session on
// its days — in the week it was added to and, when it repeats, every week after — with a status
// computed here from today in her zone (the same rule as a strength workout).

export class CardioRequestError extends LocalizedError {}
export class CardioNotFoundError extends LocalizedError {}
export class CardioConflictError extends LocalizedError {}

type LeanSession = CardioSessionDocument & { _id: Types.ObjectId };
type LeanLog = CardioLogDocument & { _id: Types.ObjectId };

function toPublicSession(session: LeanSession): PublicCardioSession {
  return {
    id: String(session._id),
    traineeId: String(session.traineeId),
    name: session.name,
    sport: session.sport,
    metric: session.metric,
    steps: session.steps as CardioStep[],
    note: session.note ?? null,
    days: session.days,
    repeatsWeekly: session.repeatsWeekly,
    weekStartDate: session.weekStartDate,
    status: session.status,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}

function toPublicLog(log: LeanLog): PublicCardioLog {
  return {
    id: String(log._id),
    sessionId: String(log.sessionId),
    sessionName: log.sessionName,
    sport: log.sport,
    date: log.date,
    completedSec: log.completedSec,
    roundsDone: log.roundsDone,
    roundsTotal: log.roundsTotal,
    highIntensitySec: log.highIntensitySec,
    distanceKm: log.distanceKm ?? null,
    rpe: log.rpe,
    note: log.note ?? null,
    createdAt: log.createdAt.toISOString(),
  };
}

/** Does the session show in that week (active, not removed, started, still repeating)? */
export function sessionAppliesTo(session: Pick<CardioSessionDocument, 'status' | 'archivedAt' | 'weekStartDate' | 'repeatsWeekly'>, weekStart: string): boolean {
  if (session.status !== 'active' || session.archivedAt) return false;
  return weekStart === session.weekStartDate || (session.repeatsWeekly && weekStart > session.weekStartDate);
}

async function traineeToday(traineeId: string, now: Date): Promise<string> {
  const user = await User.findById(traineeId).select('timezone').lean();
  return localDateString(now, user?.timezone ?? DEFAULT_TIMEZONE);
}

function occurrenceOf(session: LeanSession, date: string, today: string, logs: LeanLog[]): CardioOccurrence {
  const weekStart = weekStartOf(date);
  const log = logs.find((entry) => String(entry.sessionId) === String(session._id) && entry.date === date);
  return {
    session: toPublicSession(session),
    date,
    dayOfWeek: new Date(`${date}T00:00:00Z`).getUTCDay(),
    status: resolveWorkoutStatus(date, weekStart, today, log !== undefined),
    isToday: date === today,
    logId: log ? String(log._id) : null,
  };
}

/* ─── Coach ─────────────────────────────────────────────────────────────── */

export async function listCoachCardio(traineeId: string): Promise<CoachCardioList> {
  const [sessions, logs] = await Promise.all([
    CardioSession.find({ traineeId, archivedAt: null }).sort({ weekStartDate: -1, createdAt: 1 }).lean<LeanSession[]>(),
    CardioLog.find({ traineeId }).sort({ date: -1, createdAt: -1 }).limit(COACH_CARDIO_LOG_LIMIT).lean<LeanLog[]>(),
  ]);
  return { sessions: sessions.map(toPublicSession), logs: logs.map(toPublicLog) };
}

async function findCoachSession(traineeId: string, sessionId: string): Promise<LeanSession> {
  const session = await CardioSession.findOne({ _id: sessionId, traineeId, archivedAt: null }).lean<LeanSession>();
  if (!session) throw new CardioNotFoundError('cardio_session_not_found');
  return session;
}

export async function getCoachCardioSession(traineeId: string, sessionId: string): Promise<PublicCardioSession> {
  return toPublicSession(await findCoachSession(traineeId, sessionId));
}

type SessionInput = SaveCardioSessionPayload & { steps: CardioStepFields[] };

/** New sessions start this week or later (like a new plan). */
export async function createCoachCardioSession(coachId: string, traineeId: string, input: SessionInput, now: Date = new Date()): Promise<PublicCardioSession> {
  const today = await traineeToday(traineeId, now);
  if (input.weekStartDate < weekStartOf(today)) throw new CardioRequestError('cardio_week_past');
  const created = await CardioSession.create({ ...input, traineeId, coachId });
  return toPublicSession(created.toObject() as LeanSession);
}

/** The week it starts in never changes after creation. */
export async function saveCoachCardioSession(traineeId: string, sessionId: string, input: SessionInput): Promise<PublicCardioSession> {
  const existing = await findCoachSession(traineeId, sessionId);
  const { weekStartDate: _ignored, ...fields } = input;
  const saved = await CardioSession.findOneAndUpdate(
    { _id: existing._id, traineeId, archivedAt: null },
    { $set: fields },
    { returnDocument: 'after', runValidators: true },
  ).lean<LeanSession>();
  if (!saved) throw new CardioNotFoundError('cardio_session_not_found');
  return toPublicSession(saved);
}

/** Removed, not deleted: her logs keep pointing at it. */
export async function deleteCoachCardioSession(traineeId: string, sessionId: string): Promise<void> {
  const result = await CardioSession.updateOne({ _id: sessionId, traineeId, archivedAt: null }, { $set: { archivedAt: new Date() } });
  if (result.matchedCount === 0) throw new CardioNotFoundError('cardio_session_not_found');
}

/* ─── Trainee ───────────────────────────────────────────────────────────── */

export async function getTraineeCardioWeek(traineeId: string, weekStart: string | null, now: Date = new Date()): Promise<TraineeCardioWeek> {
  const today = await traineeToday(traineeId, now);
  const weekStartDate = weekStart ?? weekStartOf(today);
  const candidates = await CardioSession.find({ traineeId, status: 'active', archivedAt: null, weekStartDate: { $lte: weekStartDate } })
    .sort({ createdAt: 1 })
    .lean<LeanSession[]>();
  const sessions = candidates.filter((session) => sessionAppliesTo(session, weekStartDate));
  const logs = sessions.length
    ? await CardioLog.find({ traineeId, sessionId: { $in: sessions.map((session) => session._id) }, date: { $gte: weekStartDate, $lte: addDays(weekStartDate, 6) } }).lean<LeanLog[]>()
    : [];

  const items = sessions
    .flatMap((session) => session.days.map((day) => occurrenceOf(session, addDays(weekStartDate, day), today, logs)))
    .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? -1 : 1));
  return { weekStartDate, today, items };
}

/** One day of a session: someone else's, a draft, or a day it does not fall on look the same — not found. */
async function findTraineeOccurrenceSession(traineeId: string, sessionId: string, date: string): Promise<LeanSession> {
  const session = await CardioSession.findOne({ _id: sessionId, traineeId }).lean<LeanSession>();
  const dayOfWeek = new Date(`${date}T00:00:00Z`).getUTCDay();
  if (!session || !sessionAppliesTo(session, weekStartOf(date)) || !session.days.includes(dayOfWeek)) {
    throw new CardioNotFoundError('cardio_session_not_found');
  }
  return session;
}

export async function getTraineeCardioSession(traineeId: string, sessionId: string, date: string, now: Date = new Date()): Promise<TraineeCardioSessionResponse> {
  const [today, session, trainee] = await Promise.all([
    traineeToday(traineeId, now),
    findTraineeOccurrenceSession(traineeId, sessionId, date),
    User.findById(traineeId).select('coachId').lean(),
  ]);
  const [log, coach] = await Promise.all([
    CardioLog.findOne({ traineeId, sessionId, date }).lean<LeanLog>(),
    trainee?.coachId ? User.findById(trainee.coachId).select('name').lean() : null,
  ]);
  return {
    occurrence: occurrenceOf(session, date, today, log ? [log] : []),
    log: log ? toPublicLog(log) : null,
    coach: coach ? { name: coach.name } : null,
    canStart: !log && weekStartOf(date) === weekStartOf(today),
  };
}

/**
 * Saves what she did, once per session day, for a day of this week (like a strength workout,
 * a missed day can still be done until the week ends). The plan's own numbers bound hers.
 */
export async function saveTraineeCardioLog(traineeId: string, input: SaveCardioLogPayload, now: Date = new Date()): Promise<PublicCardioLog> {
  const [today, session] = await Promise.all([traineeToday(traineeId, now), findTraineeOccurrenceSession(traineeId, input.sessionId, input.date)]);
  if (weekStartOf(input.date) !== weekStartOf(today)) throw new CardioRequestError('cardio_log_week');

  const totals = cardioTotals(session.steps);
  if (input.roundsDone > totals.rounds || input.completedSec > totals.totalSec || input.highIntensitySec > Math.min(totals.highIntensitySec, input.completedSec)) {
    throw new CardioRequestError('cardio_log_invalid');
  }
  try {
    const created = await CardioLog.create({
      traineeId,
      sessionId: session._id,
      sessionName: session.name,
      sport: session.sport,
      date: input.date,
      completedSec: input.completedSec,
      roundsDone: input.roundsDone,
      roundsTotal: totals.rounds,
      highIntensitySec: input.highIntensitySec,
      distanceKm: input.distanceKm ?? null,
      rpe: input.rpe,
      note: input.note ?? null,
    });
    return toPublicLog(created.toObject() as LeanLog);
  } catch (error) {
    if ((error as { code?: number }).code === 11000) throw new CardioConflictError('cardio_log_exists');
    throw error;
  }
}
