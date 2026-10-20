import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from '../../exercises/__tests__/testDb';
import { startApiTestClient, createTestUser } from '../../../testing/apiTestClient';
import type { ApiTestClient } from '../../../testing/apiTestClient';
import { addDays, localDateString, weekStartOf } from '../../plans/planWeek';
import { CardioLog, CardioSession } from '../cardio.model';
import { cardioTotals, flattenCardioSteps } from '../cardioSteps';
import { sessionAppliesTo } from '../cardio.service';
import type { CardioStepFields } from '../cardio.types';

// Cardio sessions: the coach builds them per trainee (draft / active, days, repeating weekly);
// the trainee sees each day with a server-made status, opens one, and logs it once.

type TestUser = Awaited<ReturnType<typeof createTestUser>>;

const TIMEZONE = 'Asia/Jerusalem';

const INTERVALS: CardioStepFields[] = [
  { type: 'block', id: 'w', kind: 'warmup', durationSec: 300, intensity: 3 },
  {
    type: 'repeat',
    id: 'r',
    times: 8,
    blocks: [
      { type: 'block', id: 'r1', kind: 'work', durationSec: 60, intensity: 8 },
      { type: 'block', id: 'r2', kind: 'recovery', durationSec: 60, intensity: 4 },
    ],
  },
  { type: 'block', id: 'c', kind: 'cooldown', durationSec: 300, intensity: 3 },
];

let api: ApiTestClient;
let coach: TestUser;
let otherCoach: TestUser;
let trainee: TestUser;
let today: string;
let weekStart: string;
let todayDay: number;

function sessionBody(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Intervals 1:1',
    sport: 'intervals',
    metric: 'rpe',
    steps: INTERVALS,
    note: 'Hard to talk on the fast parts.',
    days: [todayDay],
    repeatsWeekly: false,
    weekStartDate: weekStart,
    status: 'active',
    ...overrides,
  };
}

function createSession(overrides: Record<string, unknown> = {}, user = coach) {
  return api.request('POST', `/coach/trainees/${trainee.id}/cardio`, { token: user.token, body: sessionBody(overrides) });
}

function logBody(sessionId: string, overrides: Record<string, unknown> = {}) {
  return { sessionId, date: today, completedSec: 1560, roundsDone: 8, highIntensitySec: 480, distanceKm: 4.26, rpe: 8, note: 'Felt good', ...overrides };
}

describe('cardio step math', () => {
  it('unrolls repeat sets and totals the time, high intensity (≥ 7) and rounds', () => {
    expect(flattenCardioSteps(INTERVALS)).toHaveLength(18);
    expect(cardioTotals(INTERVALS)).toEqual({ totalSec: 1560, highIntensitySec: 480, rounds: 8 });
  });

  it('a session shows in its week and, when repeating, every later week', () => {
    const base = { status: 'active' as const, archivedAt: null, weekStartDate: '2026-10-18', repeatsWeekly: false };
    expect(sessionAppliesTo(base, '2026-10-18')).toBe(true);
    expect(sessionAppliesTo(base, '2026-10-25')).toBe(false);
    expect(sessionAppliesTo({ ...base, repeatsWeekly: true }, '2026-11-01')).toBe(true);
    expect(sessionAppliesTo({ ...base, repeatsWeekly: true }, '2026-10-11')).toBe(false);
    expect(sessionAppliesTo({ ...base, status: 'draft' }, '2026-10-18')).toBe(false);
  });
});

describe('cardio sessions API', () => {
  beforeAll(async () => {
    await connectTestDatabase();
    api = await startApiTestClient();
    await Promise.all([CardioSession.init(), CardioLog.init()]);
  });

  afterAll(async () => {
    await api.close();
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    coach = await createTestUser('coach@example.com', { role: 'coach', name: 'Shaked' });
    otherCoach = await createTestUser('other-coach@example.com', { role: 'coach' });
    trainee = await createTestUser('maya@example.com', { coachId: coach.user._id, timezone: TIMEZONE });
    today = localDateString(new Date(), TIMEZONE);
    weekStart = weekStartOf(today);
    todayDay = new Date(`${today}T00:00:00Z`).getUTCDay();
  });

  it('the coach creates, reads, edits and removes a session; another coach cannot', async () => {
    const created = await createSession();
    expect(created.status).toBe(201);
    const id = created.body.session.id;
    expect(created.body.session).toMatchObject({ name: 'Intervals 1:1', days: [todayDay], status: 'active', weekStartDate: weekStart });

    expect((await createSession({}, otherCoach)).status).toBe(404);
    expect((await api.request('GET', `/coach/trainees/${trainee.id}/cardio/${id}`, { token: otherCoach.token })).status).toBe(404);

    const edited = await api.request('PUT', `/coach/trainees/${trainee.id}/cardio/${id}`, {
      token: coach.token,
      body: sessionBody({ name: 'Easy run', weekStartDate: addDays(weekStart, 7) }),
    });
    expect(edited.status).toBe(200);
    // The start week is fixed after creation.
    expect(edited.body.session).toMatchObject({ name: 'Easy run', weekStartDate: weekStart });

    expect((await api.request('DELETE', `/coach/trainees/${trainee.id}/cardio/${id}`, { token: coach.token })).status).toBe(204);
    const list = await api.request('GET', `/coach/trainees/${trainee.id}/cardio`, { token: coach.token });
    expect(list.body.sessions).toHaveLength(0);
  });

  it('rejects bad sessions: durations, rounds, intensity, empty steps, no day when active, a past week', async () => {
    const block = (fields: Record<string, unknown>) => [{ type: 'block', id: 'a', kind: 'steady', durationSec: 600, intensity: 6, ...fields }];
    expect((await createSession({ steps: block({ durationSec: 10 }) })).body.code).toBe('cardio_block_duration');
    expect((await createSession({ steps: block({ durationSec: 90 * 60 + 1 }) })).body.code).toBe('cardio_block_duration');
    expect((await createSession({ steps: block({ intensity: 11 }) })).body.code).toBe('cardio_block_intensity');
    expect((await createSession({ steps: [{ type: 'repeat', id: 'r', times: 31, blocks: block({}) }] })).body.code).toBe('cardio_repeat_times');
    expect((await createSession({ steps: [] })).body.code).toBe('cardio_steps_empty');
    expect((await createSession({ steps: [{ type: 'repeat', id: 'r', times: 3, blocks: [] }] })).body.code).toBe('cardio_steps_empty');
    expect((await createSession({ days: [] })).body.code).toBe('cardio_days_required');
    expect((await createSession({ days: [], status: 'draft' })).status).toBe(201);
    expect((await createSession({ weekStartDate: addDays(weekStart, -7) })).body.code).toBe('cardio_week_past');
  });

  it('the trainee sees active sessions on their days with a status; drafts and other weeks stay hidden', async () => {
    const active = (await createSession({ days: [0, todayDay].filter((d, i, all) => all.indexOf(d) === i) })).body.session;
    await createSession({ name: 'Draft', status: 'draft' });
    await createSession({ name: 'Next week', weekStartDate: addDays(weekStart, 7) });

    const week = await api.request('GET', '/cardio/week', { token: trainee.token });
    expect(week.status).toBe(200);
    expect(week.body.items.every((item: { session: { id: string } }) => item.session.id === active.id)).toBe(true);
    const todayItem = week.body.items.find((item: { date: string }) => item.date === today);
    expect(todayItem).toMatchObject({ status: 'upcoming', isToday: true, logId: null });

    const next = await api.request('GET', `/cardio/week?weekStart=${addDays(weekStart, 7)}`, { token: trainee.token });
    expect(next.body.items.map((item: { session: { name: string } }) => item.session.name)).toEqual(['Next week']);

    expect((await api.request('GET', '/cardio/week', { token: coach.token })).status).toBe(403);
  });

  it('a repeating session shows in later weeks', async () => {
    await createSession({ repeatsWeekly: true });
    const later = await api.request('GET', `/cardio/week?weekStart=${addDays(weekStart, 21)}`, { token: trainee.token });
    expect(later.body.items).toHaveLength(1);
  });

  it('she opens a day (with her coach’s name), logs it once, and the coach reads the log', async () => {
    const session = (await createSession()).body.session;
    const detail = await api.request('GET', `/cardio/sessions/${session.id}?date=${today}`, { token: trainee.token });
    expect(detail.status).toBe(200);
    expect(detail.body).toMatchObject({ coach: { name: 'Shaked' }, log: null, canStart: true, occurrence: { date: today, status: 'upcoming' } });
    expect((await api.request('GET', `/cardio/sessions/${session.id}?date=${addDays(today, todayDay === 6 ? -1 : 1)}`, { token: trainee.token })).status).toBe(404);

    const saved = await api.request('POST', '/cardio/logs', { token: trainee.token, body: logBody(session.id) });
    expect(saved.status).toBe(201);
    expect(saved.body.log).toMatchObject({ roundsDone: 8, roundsTotal: 8, distanceKm: 4.3, rpe: 8, sessionName: 'Intervals 1:1' });
    expect((await api.request('POST', '/cardio/logs', { token: trainee.token, body: logBody(session.id) })).status).toBe(409);

    const after = await api.request('GET', `/cardio/sessions/${session.id}?date=${today}`, { token: trainee.token });
    expect(after.body).toMatchObject({ canStart: false, occurrence: { status: 'done', logId: saved.body.log.id } });

    const coachList = await api.request('GET', `/coach/trainees/${trainee.id}/cardio`, { token: coach.token });
    expect(coachList.body.logs).toHaveLength(1);
    expect((await api.request('GET', `/coach/trainees/${trainee.id}/cardio`, { token: otherCoach.token })).status).toBe(404);
  });

  it('her numbers stay inside the session; an early end counts the rounds she finished', async () => {
    const session = (await createSession()).body.session;
    expect((await api.request('POST', '/cardio/logs', { token: trainee.token, body: logBody(session.id, { roundsDone: 9 }) })).status).toBe(400);
    expect((await api.request('POST', '/cardio/logs', { token: trainee.token, body: logBody(session.id, { completedSec: 5000 }) })).status).toBe(400);
    expect((await api.request('POST', '/cardio/logs', { token: trainee.token, body: logBody(session.id, { rpe: 0 }) })).body.code).toBe('cardio_rpe_invalid');
    const early = await api.request('POST', '/cardio/logs', {
      token: trainee.token,
      body: logBody(session.id, { completedSec: 600, roundsDone: 2, highIntensitySec: 120, distanceKm: null, note: null }),
    });
    expect(early.status).toBe(201);
    expect(early.body.log).toMatchObject({ roundsDone: 2, roundsTotal: 8, distanceKm: null, note: null });
  });
});
