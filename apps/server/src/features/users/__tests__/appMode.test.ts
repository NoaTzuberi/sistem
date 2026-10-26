import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from '../../exercises/__tests__/testDb';
import { startApiTestClient, createTestUser } from '../../../testing/apiTestClient';
import type { ApiTestClient } from '../../../testing/apiTestClient';

// Coach mode switch: only someone with both the coach and the trainee role chooses her side of the app;
// the choice is stored on the server (every device follows it) and appState follows it at once.

let api: ApiTestClient;

describe('app mode (coach ↔ trainee)', () => {
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
  });

  it('a coach who also trains starts in coach mode and switches without signing in again', async () => {
    const both = await createTestUser('shaked@example.com', { roles: ['admin', 'coach', 'trainee'], onboardingStatus: 'completed' });
    const me = await api.request('GET', '/auth/me', { token: both.token });
    expect(me.body.user).toMatchObject({ appMode: 'coach', canSwitchAppMode: true, appState: 'coach' });

    const toTrainee = await api.request('PATCH', '/users/preferences', { token: both.token, body: { appMode: 'trainee' } });
    expect(toTrainee.status).toBe(200);
    expect(toTrainee.body.user).toMatchObject({ appMode: 'trainee', appState: 'home' });

    // The same token, another "device": the choice is on the server.
    const again = await api.request('GET', '/auth/me', { token: both.token });
    expect(again.body.user.appMode).toBe('trainee');

    const back = await api.request('PATCH', '/users/preferences', { token: both.token, body: { appMode: 'coach' } });
    expect(back.body.user).toMatchObject({ appMode: 'coach', appState: 'coach' });
  });

  it('refuses a side her roles do not allow', async () => {
    const trainee = await createTestUser('noa@example.com');
    const me = await api.request('GET', '/auth/me', { token: trainee.token });
    expect(me.body.user).toMatchObject({ appMode: 'trainee', canSwitchAppMode: false });
    const refused = await api.request('PATCH', '/users/preferences', { token: trainee.token, body: { appMode: 'coach' } });
    expect(refused.status).toBe(403);
    expect(refused.body.code).toBe('app_mode_not_allowed');

    const coach = await createTestUser('coach@example.com', { role: 'coach' });
    const coachRefused = await api.request('PATCH', '/users/preferences', { token: coach.token, body: { appMode: 'trainee' } });
    expect(coachRefused.status).toBe(403);

    const bad = await api.request('PATCH', '/users/preferences', { token: coach.token, body: { appMode: 'admin' } });
    expect(bad.status).toBe(400);
    expect(bad.body.code).toBe('app_mode_invalid');
  });
});
