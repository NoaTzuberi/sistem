import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from '../../exercises/__tests__/testDb';
import { startApiTestClient, createTestUser } from '../../../testing/apiTestClient';
import type { ApiTestClient } from '../../../testing/apiTestClient';
import { Plan } from '../plan.model';
import { addDays, currentWeekStart } from '../planWeek';
import { PLAN_WEEKS_OFFERED, listPlanWeekOptions } from '../planWeekOptions.service';

// The coach's week picker (dashboard "New plan" / "Duplicate last week").
//
// Bug it reproduces (2026-10-05): the dashboard defaulted to "the first week without a
// plan" among this week + 3. For Dev Trainee One (plans: Sep 27 published, Oct 4 draft,
// Oct 11 draft, Oct 18 published) that silently became Oct 25. The server now picks
// the defaults and never skips past a week that already has a plan.

type TestUser = Awaited<ReturnType<typeof createTestUser>>;

// Monday 5 Oct 2026, 15:25 in Jerusalem — the week started on Sunday 4 Oct.
const NOW = new Date('2026-10-05T12:25:00Z');

let api: ApiTestClient;
let coach: TestUser;
let otherCoach: TestUser;
let trainee: TestUser;

async function plan(weekStartDate: string, status: 'draft' | 'published') {
  return Plan.create({
    traineeId: trainee.user._id,
    coachId: coach.user._id,
    weekStartDate,
    status,
    publishedAt: status === 'published' ? new Date() : null,
    workouts: [],
  });
}

describe('plan week options', () => {
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
    coach = await createTestUser('coach@example.com', { role: 'coach' });
    otherCoach = await createTestUser('other-coach@example.com', { role: 'coach' });
    trainee = await createTestUser('t@example.com', { coachId: coach.user._id, timezone: 'Asia/Jerusalem' });
  });

  it('the dev-database case: defaults stay on this / next week, never jump to Oct 25', async () => {
    await plan('2026-09-27', 'published');
    const oct4 = await plan('2026-10-04', 'draft');
    const oct11 = await plan('2026-10-11', 'draft');
    await plan('2026-10-18', 'published');

    const options = await listPlanWeekOptions(trainee.id, trainee.coachingId!, NOW);

    expect(options.currentWeekStart).toBe('2026-10-04');
    expect(options.defaultNewWeek).toBe('2026-10-04');
    expect(options.defaultDuplicateWeek).toBe('2026-10-11');
    expect(options.weeks.slice(0, 4)).toEqual([
      { weekStartDate: '2026-10-04', relation: 'this', plan: { id: String(oct4._id), status: 'draft' }, copiesFromWeek: '2026-09-27' },
      { weekStartDate: '2026-10-11', relation: 'next', plan: { id: String(oct11._id), status: 'draft' }, copiesFromWeek: '2026-10-04' },
      { weekStartDate: '2026-10-18', relation: 'later', plan: expect.objectContaining({ status: 'published' }), copiesFromWeek: '2026-10-11' },
      { weekStartDate: '2026-10-25', relation: 'later', plan: null, copiesFromWeek: '2026-10-18' },
    ]);
  });

  it('only the Sep 27 plan: this week is free and the default for both actions', async () => {
    await plan('2026-09-27', 'published');
    const options = await listPlanWeekOptions(trainee.id, trainee.coachingId!, NOW);
    expect(options.defaultNewWeek).toBe('2026-10-04');
    expect(options.defaultDuplicateWeek).toBe('2026-10-04');
    expect(options.weeks[0]).toEqual({ weekStartDate: '2026-10-04', relation: 'this', plan: null, copiesFromWeek: '2026-09-27' });
  });

  it('offers consecutive Sundays from this week on — never a past week', async () => {
    const options = await listPlanWeekOptions(trainee.id, trainee.coachingId!, NOW);
    expect(options.weeks).toHaveLength(PLAN_WEEKS_OFFERED);
    options.weeks.forEach((week, index) => {
      expect(week.weekStartDate).toBe(addDays('2026-10-04', index * 7));
      expect(week.weekStartDate >= options.currentWeekStart).toBe(true);
    });
    expect(options.weeks.map((week) => week.relation).slice(0, 3)).toEqual(['this', 'next', 'later']);
    expect(options.weeks[0].copiesFromWeek).toBeNull();
  });

  it('weeks follow the trainee’s time zone, not the server’s', async () => {
    // Saturday 22:30 UTC: already Sunday 11 Oct in Jerusalem, still Saturday in New York.
    const saturdayNight = new Date('2026-10-10T22:30:00Z');
    const newYorker = await createTestUser('ny@example.com', { coachId: coach.user._id, timezone: 'America/New_York' });
    expect((await listPlanWeekOptions(trainee.id, trainee.coachingId!, saturdayNight)).currentWeekStart).toBe('2026-10-11');
    expect((await listPlanWeekOptions(newYorker.id, newYorker.coachingId!, saturdayNight)).currentWeekStart).toBe('2026-10-04');
  });

  describe('GET /coach/trainees/:traineeId/plan-weeks', () => {
    it('answers the trainee’s coach', async () => {
      const res = await api.request('GET', `/coach/trainees/${trainee.id}/plan-weeks`, { token: coach.token });
      expect(res.status).toBe(200);
      expect(res.body.currentWeekStart).toBe(currentWeekStart('Asia/Jerusalem'));
      expect(res.body.weeks).toHaveLength(PLAN_WEEKS_OFFERED);
    });

    it('another coach gets 404, a trainee gets 403', async () => {
      const other = await api.request('GET', `/coach/trainees/${trainee.id}/plan-weeks`, { token: otherCoach.token });
      expect(other.status).toBe(404);
      const self = await api.request('GET', `/coach/trainees/${trainee.id}/plan-weeks`, { token: trainee.token });
      expect(self.status).toBe(403);
    });
  });
});
