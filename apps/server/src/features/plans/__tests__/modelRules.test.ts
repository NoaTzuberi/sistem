import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from '../../exercises/__tests__/testDb';
import { Plan } from '../plan.model';
import { WorkoutLog } from '../../workoutLogs/workoutLog.model';
import { BodyMetric } from '../../bodyMetrics/bodyMetric.model';
import { Achievement } from '../../achievements/achievement.model';

// Index-backed rules need a real database (unique indexes are built by init()).

describe('model rules backed by indexes', () => {
  beforeAll(async () => {
    await connectTestDatabase();
    await Promise.all([Plan.init(), WorkoutLog.init(), Achievement.init()]);
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  it('allows one plan per coaching per week (another coaching of hers may plan the same week)', async () => {
    const traineeId = new Types.ObjectId();
    const base = { traineeId, coachId: new Types.ObjectId(), coachingId: new Types.ObjectId(), weekStartDate: '2026-10-04' };
    await Plan.create(base);
    await expect(Plan.create(base)).rejects.toThrow(/duplicate key/);
    await expect(Plan.create({ ...base, weekStartDate: '2026-10-11' })).resolves.toBeDefined();
    await expect(Plan.create({ ...base, coachId: new Types.ObjectId(), coachingId: new Types.ObjectId() })).resolves.toBeDefined();
  });

  it('a plan without a coaching is refused', async () => {
    await expect(Plan.create({ traineeId: new Types.ObjectId(), coachId: new Types.ObjectId(), weekStartDate: '2026-10-04' })).rejects.toThrow(/coachingId/);
  });

  it('allows one in-progress workout log per trainee, any number of finished ones', async () => {
    const traineeId = new Types.ObjectId();
    const base = { traineeId, planId: new Types.ObjectId(), coachingId: new Types.ObjectId(), workoutId: new Types.ObjectId(), workoutTitle: 'Day 1' };
    await WorkoutLog.create({ ...base, status: 'completed' });
    await WorkoutLog.create({ ...base, status: 'completed' });
    await WorkoutLog.create({ ...base, status: 'in_progress' });
    await expect(WorkoutLog.create({ ...base, status: 'in_progress' })).rejects.toThrow(/duplicate key/);
  });

  it('keeps time-based and typed sets on a workout log', async () => {
    const log = await WorkoutLog.create({
      traineeId: new Types.ObjectId(),
      planId: new Types.ObjectId(),
      coachingId: new Types.ObjectId(),
      workoutId: new Types.ObjectId(),
      workoutTitle: 'Core',
      sets: [{ exerciseId: new Types.ObjectId(), setIndex: 0, type: 'warmup', durationSec: 45, completed: true }],
    });
    expect(log.sets[0]).toMatchObject({ type: 'warmup', durationSec: 45 });
  });

  it('never awards the same achievement key twice', async () => {
    const traineeId = new Types.ObjectId();
    await Achievement.create({ traineeId, type: 'workouts_10', key: 'workouts_10' });
    await expect(Achievement.create({ traineeId, type: 'workouts_10', key: 'workouts_10' })).rejects.toThrow(/duplicate key/);
  });

  it('only accepts known body measurements (cm) and real dates', async () => {
    const traineeId = new Types.ObjectId();
    await expect(BodyMetric.create({ traineeId, date: '2026-10-01', measurements: { waist: 70, hips: 95 } })).resolves.toBeDefined();
    await expect(BodyMetric.create({ traineeId, date: '2026-10-01', measurements: { neck: 35 } })).rejects.toThrow(/Unknown body measurement/);
    await expect(BodyMetric.create({ traineeId, date: '2026-13-01' })).rejects.toThrow(/YYYY-MM-DD/);
  });
});
