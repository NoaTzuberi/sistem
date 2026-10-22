import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from '../../exercises/__tests__/testDb';
import { startApiTestClient, createTestUser } from '../../../testing/apiTestClient';
import type { ApiTestClient } from '../../../testing/apiTestClient';
import { Plan } from '../../plans/plan.model';
import { currentWeekStart } from '../../plans/planWeek';
import { NutritionPlanVersion } from '../../nutrition/nutritionPlan.model';
import { Notification } from '../notification.model';

// Home's "👍 Thanks!" under the coach's note: POST /notifications/thanks → one notification to her coach per note.

type TestUser = Awaited<ReturnType<typeof createTestUser>>;

const TIMEZONE = 'Asia/Jerusalem';

let api: ApiTestClient;
let coach: TestUser;
let trainee: TestUser;

function thank(user: TestUser, note: unknown) {
  return api.request('POST', '/notifications/thanks', { token: user.token, body: { note } });
}

async function publishPlan(notes: string) {
  return Plan.create({
    traineeId: trainee.user._id,
    coachId: coach.user._id,
    weekStartDate: currentWeekStart(TIMEZONE),
    status: 'published',
    publishedAt: new Date(),
    notes,
    workouts: [],
  });
}

describe('coach note thanks', () => {
  beforeAll(async () => {
    await connectTestDatabase();
    api = await startApiTestClient();
    await Notification.init();
  });

  afterAll(async () => {
    await api.close();
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    coach = await createTestUser('coach@example.com', { role: 'coach' });
    trainee = await createTestUser('maya@example.com', { coachId: coach.user._id, timezone: TIMEZONE });
  });

  it('plan notes: notifies her coach once, whatever the taps', async () => {
    const plan = await publishPlan('Great week!');
    expect((await thank(trainee, 'plan')).status).toBe(204);
    expect((await thank(trainee, 'plan')).status).toBe(204);

    const res = await api.request('GET', '/notifications', { token: coach.token });
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({
      type: 'coach_note_thanks',
      data: { traineeId: trainee.id, traineeName: trainee.user.name, note: 'plan', noteId: String(plan._id) },
    });
  });

  it('nutrition intro: one per version', async () => {
    const version = {
      traineeId: trainee.user._id,
      coachId: coach.user._id,
      planId: coach.user._id,
      calorieTarget: { goal: 'recomp' as const },
      groupKcal: { protein: 150, carb: 120, fat: 90, vegetable: 0 },
      dayKcal: 0,
      publishedAt: new Date(),
    };
    await NutritionPlanVersion.create({ ...version, version: 1, introMessage: 'Welcome' });
    expect((await thank(trainee, 'nutrition')).status).toBe(204);
    await NutritionPlanVersion.create({ ...version, version: 2, introMessage: 'Updated' });
    expect((await thank(trainee, 'nutrition')).status).toBe(204);
    expect(await Notification.countDocuments({ userId: coach.id, type: 'coach_note_thanks' })).toBe(2);
  });

  it('no note (or an empty one) → 404, nothing sent', async () => {
    expect((await thank(trainee, 'plan')).status).toBe(404);
    await publishPlan('   ');
    expect((await thank(trainee, 'plan')).status).toBe(404);
    expect((await thank(trainee, 'nutrition')).status).toBe(404);
    expect(await Notification.countDocuments({ userId: coach.id })).toBe(0);
  });

  it('trainees only; the note must be plan or nutrition', async () => {
    expect((await thank(coach, 'plan')).status).toBe(403);
    expect((await thank(trainee, 'workout')).status).toBe(400);
    expect((await api.request('POST', '/notifications/thanks', { body: { note: 'plan' } })).status).toBe(401);
  });
});
