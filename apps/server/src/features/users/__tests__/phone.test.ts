import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from '../../exercises/__tests__/testDb';
import { startApiTestClient, createTestUser } from '../../../testing/apiTestClient';
import type { ApiTestClient } from '../../../testing/apiTestClient';
import { normalizePhone } from '../phone';

type TestUser = Awaited<ReturnType<typeof createTestUser>>;

// Her optional phone (2026-11-12): onboarding + Settings, E.164 on the User, read only by her and a
// coach with a live coaching — never by an ended coaching (archive) or another coach.

describe('normalizePhone', () => {
  it.each([
    ['054-123-4567', '+972541234567'],
    ['0541234567', '+972541234567'],
    ['02-1234567', '+97221234567'],
    ['+972 54 123 4567', '+972541234567'],
    ['+972 054 123 4567', '+972541234567'],
    ['00972541234567', '+972541234567'],
    ['+1 (415) 555-0123', '+14155550123'],
    ['+44 20 7946 0958', '+442079460958'],
  ])('%s → %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(['12345', '054-123', '+0123456789', '+97212', 'phone', '4155550123', '+1234567890123456'])('%s is refused', (input) => {
    expect(normalizePhone(input)).toBeNull();
  });
});

describe('the trainee phone', () => {
  let api: ApiTestClient;
  let coach: TestUser;
  let otherCoach: TestUser;
  let trainee: TestUser;

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
    otherCoach = await createTestUser('other@example.com', { role: 'coach' });
    trainee = await createTestUser('maya@example.com', { coachId: coach.user._id, onboardingStatus: 'in_progress' });
  });

  it('onboarding saves it normalized on the basic-profile step; a bad number is refused; empty clears', async () => {
    const saved = await api.request('PATCH', '/onboarding', { token: trainee.token, body: { step: 'basic_profile', answers: { phone: '054-123-4567' } } });
    expect(saved.status).toBe(200);
    expect((await api.request('GET', '/auth/me', { token: trainee.token })).body.user.phone).toBe('+972541234567');

    const bad = await api.request('PATCH', '/onboarding', { token: trainee.token, body: { step: 'basic_profile', answers: { phone: '123' } } });
    expect(bad.status).toBe(400);
    expect(bad.body.code).toBe('phone_invalid');

    const wrongStep = await api.request('PATCH', '/onboarding', { token: trainee.token, body: { step: 'goals', answers: { phone: '0541234567' } } });
    expect(wrongStep.status).toBe(400);

    await api.request('PATCH', '/onboarding', { token: trainee.token, body: { step: 'basic_profile', answers: { phone: '' } } });
    expect((await api.request('GET', '/auth/me', { token: trainee.token })).body.user.phone).toBeNull();
  });

  it('Settings changes and clears it', async () => {
    const set = await api.request('PATCH', '/users/me/phone', { token: trainee.token, body: { phone: '+1 415 555 0123' } });
    expect(set.status).toBe(200);
    expect(set.body.user.phone).toBe('+14155550123');

    expect((await api.request('PATCH', '/users/me/phone', { token: trainee.token, body: { phone: 'nope' } })).status).toBe(400);
    expect((await api.request('PATCH', '/users/me/phone', { token: trainee.token, body: {} })).status).toBe(400);

    const cleared = await api.request('PATCH', '/users/me/phone', { token: trainee.token, body: { phone: null } });
    expect(cleared.body.user.phone).toBeNull();
  });

  it('her live coach sees it; another coach does not; after the coaching ends the archive has no phone', async () => {
    await api.request('PATCH', '/users/me/phone', { token: trainee.token, body: { phone: '0541234567' } });

    const detail = await api.request('GET', `/coach/trainees/${trainee.id}`, { token: coach.token });
    expect(detail.body.trainee.phone).toBe('+972541234567');
    expect((await api.request('GET', `/coach/trainees/${trainee.id}`, { token: otherCoach.token })).status).toBe(404);
    // The trainees list never carries it.
    const list = await api.request('GET', '/coach/trainees', { token: coach.token });
    expect(list.body.items[0].phone).toBeUndefined();

    expect((await api.request('PATCH', `/coach/trainees/${trainee.id}/end-coaching`, { token: coach.token })).status).toBe(200);
    expect((await api.request('GET', `/coach/trainees/${trainee.id}`, { token: coach.token })).status).toBe(404);
    const archived = await api.request('GET', `/coach/archive/${trainee.id}`, { token: coach.token });
    expect(archived.status).toBe(200);
    expect(JSON.stringify(archived.body)).not.toContain('541234567');
  });
});
