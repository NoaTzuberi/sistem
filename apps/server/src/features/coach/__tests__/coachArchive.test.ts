import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { AppNotification, CoachArchiveList, CoachArchivedTraineeResponse, CoachTraineeList, WorkoutLog as PublicWorkoutLog } from '@sistem/types';
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from '../../exercises/__tests__/testDb';
import { startApiTestClient, createTestUser } from '../../../testing/apiTestClient';
import type { ApiTestClient } from '../../../testing/apiTestClient';
import { Plan } from '../../plans/plan.model';
import { currentWeekStart } from '../../plans/planWeek';
import { WorkoutLog } from '../../workoutLogs/workoutLog.model';
import { Coaching } from '../../coachings/coaching.model';
import { User } from '../../users/user.model';

// Ending a coaching (PATCH /coach/trainees/:id/end-coaching) and the read-only archive (/coach/archive).

type TestUser = Awaited<ReturnType<typeof createTestUser>>;

const TIMEZONE = 'Asia/Jerusalem';
const EXERCISE_ID = '64b000000000000000000001';

let api: ApiTestClient;
let coach: TestUser;
let trainee: TestUser;

async function logWorkout(fields: { source?: 'free'; startedAt?: Date } = {}) {
  const plan = await Plan.findOne({ traineeId: trainee.user._id });
  const startedAt = fields.startedAt ?? new Date(Date.now() - 3600_000);
  return WorkoutLog.create({
    traineeId: trainee.user._id,
    ...(fields.source === 'free' ? { source: 'free' } : { planId: plan!._id, workoutId: plan!.workouts[0]._id }),
    workoutTitle: 'Lower Body',
    status: 'completed',
    startedAt,
    finishedAt: new Date(startedAt.getTime() + 1800_000),
    pumpPhoto: { publicId: 'sistem/pump/test', uploadedAt: new Date() },
    stats: { durationSec: 1800, totalVolume: 400, setsCompleted: 1, prCount: 0 },
    sets: [{ exerciseId: EXERCISE_ID, setIndex: 0, type: 'working', reps: 10, weight: 40, completed: true }],
  });
}

const end = (token = coach.token, id = trainee.id) => api.request('PATCH', `/coach/trainees/${id}/end-coaching`, { token });

describe('end coaching + archive', () => {
  beforeAll(async () => {
    await connectTestDatabase();
    api = await startApiTestClient();
  });

  afterAll(async () => {
    await api.close();
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    coach = await createTestUser('coach@example.com', { role: 'coach', name: 'Dana', timezone: TIMEZONE });
    trainee = await createTestUser('t@example.com', {
      coachId: coach.user._id,
      coachingStatus: 'active',
      timezone: TIMEZONE,
      onboardingStatus: 'completed',
      onboardingCompletedAt: new Date(Date.now() - 20 * 86_400_000),
    });
    await Plan.create({
      traineeId: trainee.user._id,
      coachId: coach.user._id,
      weekStartDate: currentWeekStart(TIMEZONE),
      status: 'published',
      publishedAt: new Date(),
      workouts: [{ title: 'Lower Body', order: 0, exercises: [{ exerciseId: EXERCISE_ID, sets: 3, reps: 10 }] }],
    });
  });

  it('only her own coach can end it', async () => {
    const other = await createTestUser('other@example.com', { role: 'coach' });
    expect((await end(other.token)).status).toBe(404);
    expect((await end(trainee.token)).status).toBe(403);
    expect((await Coaching.findById(trainee.coachingId).lean())!.live).toBe(true);
  });

  it('ends the coaching, keeps her account, notifies her and cuts the coach off', async () => {
    await logWorkout();
    const res = await end();
    expect(res.status).toBe(200);
    const coaching = (await Coaching.findById(trainee.coachingId).lean())!;
    expect(coaching).toMatchObject({ status: 'ended', live: false });
    expect(coaching.endedAt).toBeInstanceOf(Date);
    expect(await User.exists({ _id: trainee.user._id })).toBeTruthy();
    expect(await WorkoutLog.countDocuments({ traineeId: trainee.user._id })).toBe(1);

    // Her side: self-guided now, told once.
    const me = await api.request('GET', '/auth/me', { token: trainee.token });
    expect(me.body.user.coachingStatus).toBeNull();
    const notes = await api.request<{ items: AppNotification[] }>('GET', '/notifications', { token: trainee.token });
    expect(notes.body.items.find((item) => item.type === 'coaching_ended')).toMatchObject({ data: { coachName: 'Dana' } });

    // The coach: every live route is closed (enforced by the server, not the UI), a second end too.
    for (const path of ['', '/workout-logs', '/body-metrics', '/plans', '/achievements', '/meal-logs', '/nutrition-plan']) {
      expect((await api.request('GET', `/coach/trainees/${trainee.id}${path}`, { token: coach.token })).status).toBe(404);
    }
    expect((await end()).status).toBe(404);
    const list = await api.request<CoachTraineeList>('GET', '/coach/trainees', { token: coach.token });
    expect(list.body.items).toHaveLength(0);
  });

  it('archive: past logs of that coaching only, no photos, nothing she adds later', async () => {
    await logWorkout();
    await end();
    await logWorkout({ source: 'free' });
    await logWorkout({ startedAt: new Date(Date.now() + 60_000) });

    const archive = await api.request<CoachArchiveList>('GET', '/coach/archive', { token: coach.token });
    expect(archive.body.items).toHaveLength(1);
    expect(archive.body.items[0]).toMatchObject({ id: trainee.id, name: trainee.user.name });
    expect(archive.body.items[0]).not.toHaveProperty('avatar');

    const detail = await api.request<CoachArchivedTraineeResponse>('GET', `/coach/archive/${trainee.id}`, { token: coach.token });
    expect(detail.status).toBe(200);
    expect(detail.body.trainee.coachingEndedAt).toBeTruthy();

    const logs = await api.request<{ items: PublicWorkoutLog[] }>('GET', `/coach/archive/${trainee.id}/workout-logs`, { token: coach.token });
    expect(logs.body.items).toHaveLength(1);
    expect(logs.body.items[0].pumpPhoto).toBeNull();

    // Another coach never sees it; a trainee still live with this coach is not in the archive.
    const other = await createTestUser('other@example.com', { role: 'coach' });
    expect((await api.request('GET', `/coach/archive/${trainee.id}`, { token: other.token })).status).toBe(404);
    expect((await api.request<CoachArchiveList>('GET', '/coach/archive', { token: other.token })).body.items).toHaveLength(0);
  });

  it('coming back takes a new coaching (invite) — then she leaves the archive', async () => {
    await end();
    await Coaching.create({ traineeId: trainee.user._id, coachId: coach.user._id, status: 'waiting' });
    expect((await api.request<CoachArchiveList>('GET', '/coach/archive', { token: coach.token })).body.items).toHaveLength(0);
    expect((await api.request('GET', `/coach/archive/${trainee.id}`, { token: coach.token })).status).toBe(404);
    // The new coaching never shows the old one's logs.
    await logWorkout();
    expect((await api.request<{ items: PublicWorkoutLog[] }>('GET', `/coach/trainees/${trainee.id}/workout-logs`, { token: coach.token })).body.items).toHaveLength(0);
  });
});
