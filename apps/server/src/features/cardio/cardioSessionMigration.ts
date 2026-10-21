import mongoose, { Types } from 'mongoose';
import { Plan } from '../plans/plan.model';
import { weekStartOf } from '../plans/planWeek';

// One-off (runs at server start, idempotent): cardio sessions saved by the old separate cardio builder
// become cardio workouts inside her weekly plans — one workout per chosen day (or one without a day),
// in the session's start week and, when it repeated weekly, every later plan she already has. A start
// week without a plan gets a draft. A draft session only goes into draft plans, so nothing the coach had
// not added shows up in her app. Old cardio logs are re-pointed at the new workouts. Each session is
// marked `migratedAt`; the old collection is otherwise left as it was.

interface LegacySession {
  _id: Types.ObjectId;
  traineeId: Types.ObjectId;
  coachId: Types.ObjectId;
  name: string;
  sport: string;
  metric: string;
  steps: unknown[];
  note?: string | null;
  days?: number[];
  repeatsWeekly?: boolean;
  weekStartDate: string;
  status: 'draft' | 'active';
}

interface LegacyLog {
  _id: Types.ObjectId;
  sessionId: Types.ObjectId;
  date: string;
}

export interface CardioMigrationResult {
  sessions: number;
  workouts: number;
  /** Draft sessions whose week already had a published plan: left for the coach to add again. */
  skipped: number;
}

export async function migrateCardioSessions(): Promise<CardioMigrationResult> {
  const result: CardioMigrationResult = { sessions: 0, workouts: 0, skipped: 0 };
  const db = mongoose.connection.db;
  if (!db) return result;
  const sessions = db.collection<LegacySession>('cardiosessions');
  const pending = await sessions.find({ migratedAt: { $exists: false }, $or: [{ archivedAt: null }, { archivedAt: { $exists: false } }] }).toArray();

  for (const session of pending) {
    const plans = await Plan.find({
      traineeId: session.traineeId,
      weekStartDate: session.repeatsWeekly ? { $gte: session.weekStartDate } : session.weekStartDate,
    });
    if (!plans.some((plan) => plan.weekStartDate === session.weekStartDate)) {
      plans.push(new Plan({ traineeId: session.traineeId, coachId: session.coachId, weekStartDate: session.weekStartDate, status: 'draft', workouts: [] }));
    }
    const targets = session.status === 'draft' ? plans.filter((plan) => plan.status === 'draft') : plans;
    if (targets.length === 0) {
      result.skipped += 1;
      continue;
    }

    const days: (number | undefined)[] = session.days?.length ? session.days : [undefined];
    // weekStart:day → the new workout's id, for the old logs.
    const created = new Map<string, Types.ObjectId>();
    for (const plan of targets) {
      const start = plan.workouts.length;
      days.forEach((dayOfWeek, index) => {
        const _id = new Types.ObjectId();
        created.set(`${plan.weekStartDate}:${dayOfWeek ?? ''}`, _id);
        plan.workouts.push({
          _id,
          title: session.name,
          dayOfWeek,
          order: start + index,
          notes: session.note || undefined,
          kind: 'cardio',
          cardio: { sport: session.sport, metric: session.metric, steps: session.steps },
          exercises: [],
        } as never);
      });
      if (plan.status === 'published') plan.set('liveUpdatedAt', new Date());
      await plan.save();
      result.workouts += days.length;
    }

    const logs = await db.collection<LegacyLog>('cardiologs').find({ sessionId: session._id }).toArray();
    for (const log of logs) {
      const week = weekStartOf(log.date);
      const day = new Date(`${log.date}T00:00:00Z`).getUTCDay();
      const workoutId = created.get(`${week}:${day}`) ?? created.get(`${week}:`);
      const plan = targets.find((candidate) => candidate.weekStartDate === week);
      if (!workoutId || !plan) continue;
      await db.collection('cardiologs').updateOne(
        { _id: log._id },
        { $set: { planId: plan._id, workoutId, workoutTitle: session.name }, $unset: { sessionId: '', sessionName: '' } },
      );
    }

    await sessions.updateOne({ _id: session._id }, { $set: { migratedAt: new Date() } });
    result.sessions += 1;
  }
  return result;
}
