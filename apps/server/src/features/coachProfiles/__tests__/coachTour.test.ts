import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from '../../exercises/__tests__/testDb';
import { startApiTestClient, createTestUser } from '../../../testing/apiTestClient';
import type { ApiTestClient } from '../../../testing/apiTestClient';

// The dashboard tour: shown until she finishes or skips it once (CoachProfile.tourCompletedAt).

let api: ApiTestClient;

describe('coach dashboard tour', () => {
  beforeAll(async () => {
    await connectTestDatabase();
    api = await startApiTestClient();
  });

  afterAll(async () => {
    await api.close();
    await disconnectTestDatabase();
  });

  beforeEach(clearTestDatabase);

  it('starts not done, is completed once (the first time is kept), coach only', async () => {
    const coach = await createTestUser('coach@example.com', { role: 'coach' });
    const tour = () => api.request('GET', '/coach/profile/tour', { token: coach.token });
    expect((await tour()).body).toEqual({ completedAt: null });

    const done = await api.request('POST', '/coach/profile/tour/complete', { token: coach.token });
    expect(done.status).toBe(200);
    expect(done.body.completedAt).toBeTruthy();
    expect((await tour()).body.completedAt).toBe(done.body.completedAt);

    // A replay from Settings ends the same way; the first date stays.
    const again = await api.request('POST', '/coach/profile/tour/complete', { token: coach.token });
    expect(again.body.completedAt).toBe(done.body.completedAt);

    const trainee = await createTestUser('t@example.com', { coachId: coach.user._id });
    expect((await api.request('GET', '/coach/profile/tour', { token: trainee.token })).status).toBe(403);
  });
});
