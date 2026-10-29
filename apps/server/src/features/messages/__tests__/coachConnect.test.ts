import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { CoachActivityPage, CoachReactionList, CoachThreadList, MessagePage, TraineeThreadResponse } from '@sistem/types';
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from '../../exercises/__tests__/testDb';
import { startApiTestClient, createTestUser } from '../../../testing/apiTestClient';
import type { ApiTestClient } from '../../../testing/apiTestClient';
import { setRateLimitForTests } from '../../../middleware/rateLimit.middleware';
import { Plan } from '../../plans/plan.model';
import { currentWeekStart } from '../../plans/planWeek';
import { WorkoutLog } from '../../workoutLogs/workoutLog.model';
import { Coaching } from '../../coachings/coaching.model';

// Coach mode Phase B: the coach's reactions on the feed (the trainee sees them) and 1:1 messages.

type TestUser = Awaited<ReturnType<typeof createTestUser>>;

const TIMEZONE = 'Asia/Jerusalem';
const EXERCISE_ID = '64b000000000000000000001';

let api: ApiTestClient;
let coach: TestUser;
let maya: TestUser;

async function completedLog(trainee: TestUser, coachId = coach.user._id) {
  const plan = await Plan.create({
    traineeId: trainee.user._id,
    coachId,
    weekStartDate: currentWeekStart(TIMEZONE),
    status: 'published',
    publishedAt: new Date(),
    workouts: [{ title: 'Full Body B', order: 0, exercises: [{ exerciseId: EXERCISE_ID, sets: 3, reps: 10 }] }],
  });
  return WorkoutLog.create({
    traineeId: trainee.user._id,
    planId: plan._id,
    workoutId: plan.workouts[0]._id,
    workoutTitle: 'Full Body B',
    status: 'completed',
    startedAt: new Date(Date.now() - 3600_000),
    finishedAt: new Date(),
    stats: { durationSec: 2400, totalVolume: 1000, setsCompleted: 9, prCount: 0 },
    sets: [{ exerciseId: EXERCISE_ID, setIndex: 0, type: 'working', reps: 10, weight: 40, completed: true }],
  });
}

describe('reactions + messages', () => {
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
    coach = await createTestUser('coach@example.com', { role: 'coach', timezone: TIMEZONE });
    maya = await createTestUser('maya@example.com', { coachId: coach.user._id, coachingStatus: 'active', timezone: TIMEZONE });
  });

  it('reacts on a workout: toggles, shows on the feed and to her, marks seen', async () => {
    const log = await completedLog(maya);
    const path = `/coach/trainees/${maya.id}/reactions`;
    const target = { targetType: 'workout_log', targetId: String(log._id) };

    expect((await api.request('PUT', path, { token: coach.token, body: { ...target, reaction: 'wave' } })).body.code).toBe('reaction_invalid');
    expect((await api.request('PUT', path, { token: coach.token, body: { ...target, targetType: 'post' } })).body.code).toBe('reaction_target_invalid');
    expect((await api.request('PUT', path, { token: maya.token, body: { ...target, reaction: 'fire' } })).status).toBe(403);

    const set = await api.request('PUT', path, { token: coach.token, body: { ...target, reaction: 'fire' } });
    expect(set.status).toBe(200);
    expect(set.body).toEqual({ reaction: 'fire' });
    // Changing it keeps one reaction.
    await api.request('PUT', path, { token: coach.token, body: { ...target, reaction: 'heart' } });

    const feed = await api.request<CoachActivityPage>('GET', '/coach/activity', { token: coach.token });
    const item = feed.body.items.find((entry) => entry.type === 'workout_completed')!;
    expect(item.reactionTarget).toEqual({ type: 'workout_log', id: String(log._id), reaction: 'heart' });

    const mine = await api.request<CoachReactionList>('GET', '/reactions', { token: maya.token });
    expect(mine.body.items).toHaveLength(1);
    expect(mine.body.items[0]).toMatchObject({ reaction: 'heart', workoutTitle: 'Full Body B', logId: String(log._id), coachName: 'coach', seen: false });
    expect((await api.request<CoachReactionList>('GET', `/reactions?logId=${log._id}`, { token: maya.token })).body.items).toHaveLength(1);

    expect((await api.request('POST', '/reactions/seen', { token: maya.token })).status).toBe(204);
    expect((await api.request<CoachReactionList>('GET', '/reactions', { token: maya.token })).body.items[0].seen).toBe(true);

    // null removes it.
    await api.request('PUT', path, { token: coach.token, body: { ...target, reaction: null } });
    expect((await api.request<CoachReactionList>('GET', '/reactions', { token: maya.token })).body.items).toHaveLength(0);
  });

  it('never reacts on another trainee’s or another coach’s records', async () => {
    const other = await createTestUser('other@example.com', { role: 'coach' });
    const theirs = await createTestUser('theirs@example.com', { coachId: other.user._id, coachingStatus: 'active' });
    const theirLog = await completedLog(theirs, other.user._id);

    // Her trainee id under another coach: 404 (loadCoachTrainee).
    const foreign = await api.request('PUT', `/coach/trainees/${theirs.id}/reactions`, {
      token: coach.token,
      body: { targetType: 'workout_log', targetId: String(theirLog._id), reaction: 'fire' },
    });
    expect(foreign.status).toBe(404);
    // Another trainee's log under her own trainee's id: not found either.
    const crossed = await api.request('PUT', `/coach/trainees/${maya.id}/reactions`, {
      token: coach.token,
      body: { targetType: 'workout_log', targetId: String(theirLog._id), reaction: 'fire' },
    });
    expect(crossed.status).toBe(404);
    expect(crossed.body.code).toBe('reaction_target_not_found');
    // A photo day that has no photos.
    const noPhotos = await api.request('PUT', `/coach/trainees/${maya.id}/reactions`, {
      token: coach.token,
      body: { targetType: 'meal_photos', targetId: '2026-10-20', reaction: 'clap' },
    });
    expect(noPhotos.status).toBe(404);
  });

  it('messages both ways with unread counts; threads list her live coachings only', async () => {
    const coachPath = `/coach/trainees/${maya.id}/messages`;
    expect((await api.request('POST', coachPath, { token: coach.token, body: { text: '   ' } })).body.code).toBe('message_text_required');
    expect((await api.request('POST', coachPath, { token: coach.token, body: { text: 'x'.repeat(2001) } })).body.code).toBe('message_text_too_long');

    const sent = await api.request('POST', coachPath, { token: coach.token, body: { text: 'כל הכבוד על האימון! 💪' } });
    expect(sent.status).toBe(201);
    expect(sent.body.message).toMatchObject({ sender: 'coach', text: 'כל הכבוד על האימון! 💪', readAt: null });

    expect((await api.request('GET', '/messages/unread', { token: maya.token })).body).toEqual({ unread: 1 });
    const thread = await api.request<TraineeThreadResponse>('GET', '/messages', { token: maya.token });
    expect(thread.body.coach).toMatchObject({ id: coach.id, name: 'coach' });
    expect(thread.body.items.map((message) => message.sender)).toEqual(['coach']);
    expect(thread.body.unread).toBe(1);
    await api.request('POST', '/messages/read', { token: maya.token });
    expect((await api.request('GET', '/messages/unread', { token: maya.token })).body).toEqual({ unread: 0 });

    expect((await api.request('POST', '/messages', { token: maya.token, body: { text: 'תודה!' } })).status).toBe(201);
    expect((await api.request('GET', '/coach/messages/unread', { token: coach.token })).body).toEqual({ unread: 1 });
    const threads = await api.request<CoachThreadList>('GET', '/coach/messages', { token: coach.token });
    expect(threads.body.unreadTotal).toBe(1);
    expect(threads.body.items).toHaveLength(1);
    expect(threads.body.items[0]).toMatchObject({ trainee: { id: maya.id }, unread: 1, lastMessage: { sender: 'trainee', text: 'תודה!' } });
    // The coach's own message was read by her.
    const page = await api.request<MessagePage>('GET', coachPath, { token: coach.token });
    expect(page.body.items[1].readAt).not.toBeNull();
    expect((await api.request('POST', `${coachPath}/read`, { token: coach.token })).body).toEqual({ unread: 0 });

    // An ended coaching's thread is gone for the coach, and the trainee can no longer write.
    await Coaching.updateOne({ _id: maya.coachingId }, { status: 'ended', live: false, endedAt: new Date() });
    expect((await api.request<CoachThreadList>('GET', '/coach/messages', { token: coach.token })).body.items).toHaveLength(0);
    expect((await api.request('GET', coachPath, { token: coach.token })).status).toBe(404);
    expect((await api.request('POST', '/messages', { token: maya.token, body: { text: 'hi' } })).body.code).toBe('message_no_coach');
  });

  it('pages a thread newest first', async () => {
    const coachPath = `/coach/trainees/${maya.id}/messages`;
    for (let index = 0; index < 3; index += 1) {
      await api.request('POST', coachPath, { token: coach.token, body: { text: `m${index}` } });
    }
    const first = await api.request<MessagePage>('GET', `${coachPath}?limit=2`, { token: coach.token });
    expect(first.body.items.map((message) => message.text)).toEqual(['m2', 'm1']);
    const second = await api.request<MessagePage>('GET', `${coachPath}?limit=2&before=${encodeURIComponent(first.body.nextBefore!)}`, { token: coach.token });
    expect(second.body.items.map((message) => message.text)).toEqual(['m0']);
    expect(second.body.nextBefore).toBeNull();
  });

  it('rate-limits sending', async () => {
    setRateLimitForTests(true);
    try {
      let last = 0;
      for (let index = 0; index < 31; index += 1) {
        last = (await api.request('POST', '/messages', { token: maya.token, body: { text: `hi ${index}` } })).status;
      }
      expect(last).toBe(429);
    } finally {
      setRateLimitForTests(false);
    }
  });
});
