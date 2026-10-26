import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from '../../exercises/__tests__/testDb';
import { startApiTestClient, createTestUser } from '../../../testing/apiTestClient';
import type { ApiTestClient } from '../../../testing/apiTestClient';
import { User } from '../../users/user.model';
import { setRateLimitForTests } from '../../../middleware/rateLimit.middleware';

// The emails are captured instead of sent: the link (and its token) is read from the call.
const sent = vi.hoisted(() => ({ dashboard: [] as string[], trainee: [] as string[] }));
vi.mock('../email.service', () => ({
  sendDashboardResetEmail: vi.fn(async (_to: string, url: string) => {
    sent.dashboard.push(url);
    return true;
  }),
  sendPasswordResetEmail: vi.fn(async (_to: string, url: string) => {
    sent.trainee.push(url);
  }),
  sendSetPasswordEmail: vi.fn(async () => false),
}));

type TestUser = Awaited<ReturnType<typeof createTestUser>>;

const NEW_PASSWORD = 'a-brand-new-password';
let api: ApiTestClient;
let coach: TestUser;
let admin: TestUser;

const tokenOf = (url: string) => new URL(url).searchParams.get('token')!;
// Each request is async on the server (the email is not awaited): wait for it to land.
async function nextDashboardLink(): Promise<string> {
  for (let attempt = 0; attempt < 50 && sent.dashboard.length === 0; attempt += 1) await new Promise((r) => setTimeout(r, 10));
  return sent.dashboard.shift()!;
}

describe('dashboard password reset', () => {
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
    sent.dashboard.length = 0;
    sent.trainee.length = 0;
    coach = await createTestUser('coach@example.com', { role: 'coach' });
    admin = await createTestUser('admin@example.com', { role: 'admin' });
  });

  afterEach(() => setRateLimitForTests(false));

  it('answers the same for an unknown email and sends nothing', async () => {
    const known = await api.request('POST', '/auth/forgot-password', { body: { email: 'coach@example.com', app: 'dashboard' } });
    const unknown = await api.request('POST', '/auth/forgot-password', { body: { email: 'nobody@example.com', app: 'dashboard' } });
    expect(known.status).toBe(200);
    expect(unknown.status).toBe(known.status);
    expect(unknown.body).toEqual(known.body);
    expect(await nextDashboardLink()).toContain('/reset-password?token=');
    expect(sent.dashboard).toHaveLength(0);
  });

  it('resets once, signs out older sessions, and the link stops working', async () => {
    await api.request('POST', '/auth/forgot-password', { body: { email: 'coach@example.com', app: 'dashboard' } });
    const token = tokenOf(await nextDashboardLink());
    const stored = await User.findById(coach.id).select('+passwordResetTokenHash').lean();
    expect(stored?.passwordResetTokenHash).not.toBe(token); // only the hash is stored

    expect((await api.request('POST', '/auth/reset-password/check', { body: { token } })).body).toEqual({ valid: true });
    expect((await api.request('POST', '/auth/reset-password', { body: { token, password: NEW_PASSWORD } })).status).toBe(200);

    // The session from before the reset is gone; a new login works.
    expect((await api.request('GET', '/auth/me', { token: coach.token })).status).toBe(401);
    const login = await api.request('POST', '/auth/login', { body: { email: 'coach@example.com', password: NEW_PASSWORD } });
    expect(login.status).toBe(200);
    expect((await api.request('GET', '/auth/me', { token: login.body.token })).status).toBe(200);

    // Single use.
    expect((await api.request('POST', '/auth/reset-password', { body: { token, password: NEW_PASSWORD } })).status).toBe(400);
    expect((await api.request('POST', '/auth/reset-password/check', { body: { token } })).body).toEqual({ valid: false });
  });

  it('a new request cancels the older link; an expired link fails', async () => {
    await api.request('POST', '/auth/forgot-password', { body: { email: 'coach@example.com', app: 'dashboard' } });
    const first = tokenOf(await nextDashboardLink());
    await api.request('POST', '/auth/forgot-password', { body: { email: 'coach@example.com', app: 'dashboard' } });
    const second = tokenOf(await nextDashboardLink());
    expect((await api.request('POST', '/auth/reset-password', { body: { token: first, password: NEW_PASSWORD } })).status).toBe(400);

    await User.updateOne({ _id: coach.id }, { $set: { passwordResetExpires: new Date(Date.now() - 1000) } });
    expect((await api.request('POST', '/auth/reset-password', { body: { token: second, password: NEW_PASSWORD } })).status).toBe(400);
    expect((await api.request('POST', '/auth/reset-password', { body: { token: 'not-a-token', password: NEW_PASSWORD } })).status).toBe(400);
  });

  it('keeps the trainee flow as it was (app link, sessions kept)', async () => {
    const trainee = await createTestUser('trainee@example.com');
    await api.request('POST', '/auth/forgot-password', { body: { email: 'trainee@example.com', app: 'dashboard' } });
    expect(sent.dashboard).toHaveLength(0);
    expect(sent.trainee).toHaveLength(1);
    const token = tokenOf(sent.trainee[0]);
    expect((await api.request('POST', '/auth/reset-password', { body: { token, password: NEW_PASSWORD } })).status).toBe(200);
    expect((await api.request('GET', '/auth/me', { token: trainee.token })).status).toBe(200);
  });

  it('the admin fallback makes a copyable reset link with the same rules', async () => {
    const profiles = await api.request('GET', '/admin/coaches', { token: admin.token });
    const coachId = profiles.body.coaches[0].id;
    expect((await api.request('POST', `/admin/coaches/${coachId}/reset-link`, { token: coach.token })).status).toBe(403);

    const res = await api.request('POST', `/admin/coaches/${coachId}/reset-link`, { token: admin.token });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ kind: 'reset_password', emailSent: false });
    expect(res.body.setPasswordUrl).toContain('/reset-password?token=');
    const minutes = (new Date(res.body.expiresAt).getTime() - Date.now()) / 60000;
    expect(minutes).toBeGreaterThan(58);
    expect(minutes).toBeLessThanOrEqual(60);

    const token = tokenOf(res.body.setPasswordUrl);
    expect((await api.request('POST', '/auth/reset-password', { body: { token, password: NEW_PASSWORD } })).status).toBe(200);
    expect((await api.request('GET', '/auth/me', { token: coach.token })).status).toBe(401);
  });

  it('rate-limits requests per email', async () => {
    setRateLimitForTests(true);
    const ask = (email: string) => api.request('POST', '/auth/forgot-password', { body: { email, app: 'dashboard' } });
    for (let i = 0; i < 5; i += 1) expect((await ask('Coach@Example.com')).status).toBe(200);
    expect((await ask('coach@example.com')).status).toBe(429);
    expect((await ask('someone-else@example.com')).status).toBe(200);
  });
});
