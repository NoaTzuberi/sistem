import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { AuthUser, CoachTraineeSummary } from '@sistem/types';
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from '../../exercises/__tests__/testDb';
import { startApiTestClient, createTestUser } from '../../../testing/apiTestClient';
import type { ApiTestClient } from '../../../testing/apiTestClient';
import { User } from '../../users/user.model';
import { CoachProfile } from '../../coachProfiles/coachProfile.model';
import { Community } from '../../communities/community.model';

type TestUser = Awaited<ReturnType<typeof createTestUser>>;

let api: ApiTestClient;
let admin: TestUser;
let coach: TestUser;
let trainee: TestUser;

const enable = (token: string) => api.request<{ user: AuthUser }>('POST', '/admin/me/coach-mode', { token });

describe('admin: coach mode on her own account', () => {
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
    admin = await createTestUser('admin@example.com', { role: 'admin' });
    coach = await createTestUser('coach@example.com', { role: 'coach' });
    trainee = await createTestUser('trainee@example.com', { coachId: coach.user._id });
  });

  it('refuses a non-admin', async () => {
    for (const user of [coach, trainee]) {
      expect((await enable(user.token)).status).toBe(403);
    }
    expect((await User.findById(trainee.id).lean())!.roles).toEqual(['trainee']);
  });

  it('adds the coach role + her profile to the SAME account, and is idempotent', async () => {
    expect((await api.request('GET', '/coach/trainees', { token: admin.token })).status).toBe(403);

    const first = await enable(admin.token);
    expect(first.status).toBe(200);
    expect(first.body.user.id).toBe(admin.id);
    expect([...first.body.user.roles].sort()).toEqual(['admin', 'coach']);
    expect(first.body.user.appState).toBe('coach');

    const second = await enable(admin.token);
    expect(second.status).toBe(200);
    expect((await User.findById(admin.id).lean())!.roles.filter((role) => role === 'coach')).toHaveLength(1);
    expect(await CoachProfile.countDocuments({ userId: admin.id })).toBe(1);
    expect(await Community.countDocuments({ coachId: admin.id, isPrimary: true })).toBe(1);
    expect(await User.countDocuments({ email: 'admin@example.com' })).toBe(1);
  });

  it('never changes an existing profile (a suspended one stays suspended)', async () => {
    await enable(admin.token);
    await CoachProfile.updateOne({ userId: admin.id }, { $set: { status: 'suspended', displayName: 'Noa' } });
    expect((await enable(admin.token)).status).toBe(200);
    expect(await CoachProfile.findOne({ userId: admin.id }).lean()).toMatchObject({ status: 'suspended', displayName: 'Noa' });
  });

  it('as a coach she sees only her own trainees — never another coach\'s', async () => {
    await enable(admin.token);
    const mine = await createTestUser('mine@example.com', { coachId: admin.user._id });

    const list = await api.request<{ items: CoachTraineeSummary[] }>('GET', '/coach/trainees', { token: admin.token });
    expect(list.status).toBe(200);
    expect(list.body.items.map((item) => item.id)).toEqual([mine.id]);

    expect((await api.request('GET', `/coach/trainees/${trainee.id}`, { token: admin.token })).status).toBe(404);
    expect((await api.request('GET', `/coach/trainees/${mine.id}`, { token: admin.token })).status).toBe(200);
  });
});
