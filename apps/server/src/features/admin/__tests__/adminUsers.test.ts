import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from '../../exercises/__tests__/testDb';
import { startApiTestClient, createTestUser } from '../../../testing/apiTestClient';
import type { ApiTestClient } from '../../../testing/apiTestClient';
import { User } from '../../users/user.model';
import { config } from '../../../config/env';

type TestUser = Awaited<ReturnType<typeof createTestUser>>;

const NEW_PASSWORD = 'a-brand-new-password';
let api: ApiTestClient;
let admin: TestUser;
let coach: TestUser;
let trainee: TestUser;

const tokenOf = (url: string) => new URL(url).searchParams.get('token')!;
const resetLink = (userId: string, token = admin.token) => api.request('POST', `/admin/users/${userId}/reset-link`, { token });

describe('admin: any account — search, reset link, test-account email', () => {
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
    trainee = await createTestUser('trainee@sistem.dev');
  });

  it('refuses every route to a non-admin', async () => {
    for (const user of [coach, trainee]) {
      expect((await api.request('GET', '/admin/users?q=train', { token: user.token })).status).toBe(403);
      expect((await resetLink(trainee.id, user.token)).status).toBe(403);
      expect((await api.request('PATCH', `/admin/users/${trainee.id}/email`, { token: user.token, body: { email: 'me+t@gmail.com' } })).status).toBe(403);
    }
    expect((await api.request('GET', '/admin/users?q=train')).status).toBe(401);
  });

  it('finds accounts by email or name (identity only), and needs 2+ characters', async () => {
    const res = await api.request('GET', '/admin/users?q=TRAINEE', { token: admin.token });
    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(1);
    expect(Object.keys(res.body.users[0]).sort()).toEqual(['email', 'id', 'isTestAccount', 'name', 'roles']);
    expect(res.body.users[0]).toMatchObject({ id: trainee.id, isTestAccount: true });
    expect((await api.request('GET', '/admin/users?q=.*', { token: admin.token })).body.users).toHaveLength(0); // no regex injection
    expect((await api.request('GET', '/admin/users?q=t', { token: admin.token })).status).toBe(400);
  });

  it('a trainee link opens the app, works once and signs her out everywhere', async () => {
    const res = await resetLink(trainee.id);
    expect(res.status).toBe(200);
    expect(res.body.app).toBe('app');
    expect(res.body.url.startsWith(config.clientUrl)).toBe(true);
    const token = tokenOf(res.body.url);
    const stored = await User.findById(trainee.id).select('+passwordResetTokenHash').lean();
    expect(stored?.passwordResetTokenHash).not.toBe(token); // only the hash is stored

    expect((await api.request('POST', '/auth/reset-password', { body: { token, password: NEW_PASSWORD } })).status).toBe(200);
    expect((await api.request('GET', '/auth/me', { token: trainee.token })).status).toBe(401);
    expect((await api.request('POST', '/auth/reset-password', { body: { token, password: NEW_PASSWORD } })).status).toBe(400);
  });

  it('a coach gets the dashboard link; a new link cancels the older one; an expired one fails', async () => {
    const first = await resetLink(coach.id);
    expect(first.body.app).toBe('dashboard');
    expect(first.body.url.startsWith(config.dashboardUrl)).toBe(true);
    const second = await resetLink(coach.id);
    expect((await api.request('POST', '/auth/reset-password', { body: { token: tokenOf(first.body.url), password: NEW_PASSWORD } })).status).toBe(400);

    const minutes = (new Date(second.body.expiresAt).getTime() - Date.now()) / 60000;
    expect(minutes).toBeGreaterThan(58);
    expect(minutes).toBeLessThanOrEqual(60);
    await User.updateOne({ _id: coach.id }, { $set: { passwordResetExpires: new Date(Date.now() - 1000) } });
    expect((await api.request('POST', '/auth/reset-password', { body: { token: tokenOf(second.body.url), password: NEW_PASSWORD } })).status).toBe(400);
  });

  it('refuses admin accounts and unknown ids', async () => {
    expect((await resetLink(admin.id)).status).toBe(409);
    expect((await resetLink('64b7f0c2a1b2c3d4e5f60718')).status).toBe(404);
    expect((await resetLink('not-an-id')).status).toBe(404);
  });

  it('changes only a test account email, never to a taken one, and cancels her open link', async () => {
    const link = await resetLink(trainee.id);
    const change = (userId: string, email: string) => api.request('PATCH', `/admin/users/${userId}/email`, { token: admin.token, body: { email } });

    await User.updateOne({ _id: coach.id }, { $set: { email: 'real.coach@gmail.com' } });
    expect((await change(coach.id, 'me+coach@gmail.com')).status).toBe(409); // a real address is never changed
    expect((await change(trainee.id, 'admin@example.com')).status).toBe(409); // taken
    expect((await change(trainee.id, 'not-an-email')).status).toBe(400);

    const res = await change(trainee.id, ' Me+Trainee@Gmail.com ');
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email: 'me+trainee@gmail.com', isTestAccount: false });
    expect((await api.request('POST', '/auth/reset-password', { body: { token: tokenOf(link.body.url), password: NEW_PASSWORD } })).status).toBe(400);
    expect((await api.request('GET', '/auth/me', { token: trainee.token })).status).toBe(200); // her session stays
  });
});
