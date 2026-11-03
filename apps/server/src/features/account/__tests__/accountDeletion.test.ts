import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import bcrypt from 'bcrypt';
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from '../../exercises/__tests__/testDb';
import { startApiTestClient, createTestUser } from '../../../testing/apiTestClient';
import type { ApiTestClient } from '../../../testing/apiTestClient';
import { User } from '../../users/user.model';
import { Coaching } from '../../coachings/coaching.model';
import { CoachProfile } from '../../coachProfiles/coachProfile.model';
import { Community, Membership } from '../../communities/community.model';
import { OnboardingResponse } from '../../onboarding/onboardingResponse.model';
import { BodyMetric } from '../../bodyMetrics/bodyMetric.model';
import { WorkoutLog } from '../../workoutLogs/workoutLog.model';
import { MealLog } from '../../mealLogs/mealLog.model';
import { FoodItem } from '../../nutrition/foodItem.model';
import { Template } from '../../templates/template.model';

// DELETE /api/account: her own account only, password re-check, every stored photo removed (checked
// in the fake storage, not just the database), coachings ended, tokens dead. Cloudinary is a fake.

const storage = vi.hoisted(() => {
  const stored = new Set<string>();
  return {
    stored,
    failing: false,
    remove: vi.fn(async (publicId: string) => {
      stored.delete(publicId);
    }),
    removeByPrefix: vi.fn(async (prefix: string) => {
      if (storage.failing) throw new Error('storage down');
      for (const id of [...stored]) if (id.startsWith(prefix)) stored.delete(id);
      return [...stored].filter((id) => id.startsWith(prefix)).length;
    }),
  };
});

vi.mock('../../privatePhotos/privatePhoto.service', () => ({
  PhotoStorageUnavailableError: class PhotoStorageUnavailableError extends Error {},
  isPhotoStorageConfigured: () => true,
  uploadPrivatePhoto: vi.fn(),
  deletePrivatePhoto: storage.remove,
  deletePrivatePhotosByPrefix: storage.removeByPrefix,
  toPublicPhoto: (photo: { publicId: string; uploadedAt: Date }) => ({
    uploadedAt: photo.uploadedAt.toISOString(),
    url: `https://signed.test/${photo.publicId}`,
    urlExpiresAt: new Date(photo.uploadedAt.getTime() + 3600_000).toISOString(),
  }),
}));

const PASSWORD = 'correct-horse-1';
type TestUser = Awaited<ReturnType<typeof createTestUser>>;
let api: ApiTestClient;
let passwordHash: string;
let coach: TestUser;
let trainee: TestUser;

function deleteAccount(user: TestUser, body: object = { password: PASSWORD }) {
  return api.request('DELETE', '/account', { token: user.token, body });
}

/** Her photos in the database AND in the fake storage, plus one the database lost track of. */
async function seedPhotos(userId: string) {
  const ids = {
    avatar: `sistem/avatars/${userId}/avatar-1`,
    progress: `sistem/progress-photos/${userId}/2026-10-01-front-1`,
    starting: `sistem/progress-photos/${userId}/2026-10-01-starting-1`,
    pump: `sistem/pump-photos/${userId}/log-1`,
    meal: `sistem/meal-photos/${userId}/2026-10-01-1`,
    orphan: `sistem/meal-photos/${userId}/lost-1`,
  };
  const now = new Date();
  await User.updateOne({ _id: userId }, { $set: { avatar: { publicId: ids.avatar, uploadedAt: now } } });
  await BodyMetric.create({
    traineeId: userId,
    date: '2026-10-01',
    weight: 60,
    photos: [{ pose: 'front', publicId: ids.progress, uploadedAt: now }],
    startingPhoto: { publicId: ids.starting, uploadedAt: now },
  });
  await WorkoutLog.create({ traineeId: userId, source: 'free', workoutTitle: 'Free', pumpPhoto: { publicId: ids.pump, uploadedAt: now } });
  await MealLog.create({
    traineeId: userId,
    source: 'own',
    date: '2026-10-01',
    planned: {},
    eaten: {},
    photos: [{ mealId: 'm1', mealName: 'Breakfast', publicId: ids.meal, uploadedAt: now }],
  });
  for (const id of Object.values(ids)) storage.stored.add(id);
  return ids;
}

describe('account deletion (DELETE /api/account)', () => {
  beforeAll(async () => {
    await connectTestDatabase();
    api = await startApiTestClient();
    passwordHash = await bcrypt.hash(PASSWORD, 4);
  });

  afterAll(async () => {
    await api.close();
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    storage.stored.clear();
    storage.failing = false;
    storage.remove.mockClear();
    storage.removeByPrefix.mockClear();
    coach = await createTestUser('coach@test.dev', { role: 'coach', passwordHash });
    trainee = await createTestUser('trainee@test.dev', { coachId: coach.user._id, coachingStatus: 'active', passwordHash });
  });

  it('deletes her account, removes every stored photo, ends her coaching and kills her token', async () => {
    const ids = await seedPhotos(trainee.id);
    const other = await createTestUser('other@test.dev', { coachId: coach.user._id, passwordHash });
    const otherPhoto = `sistem/avatars/${other.id}/avatar-1`;
    storage.stored.add(otherPhoto);
    await OnboardingResponse.create({ userId: trainee.user._id, answers: {} });

    const res = await deleteAccount(trainee);
    expect(res.status).toBe(204);

    // Storage really emptied for her (incl. the photo the database lost), nobody else's touched.
    for (const id of Object.values(ids)) expect(storage.stored.has(id)).toBe(false);
    expect(storage.stored.has(otherPhoto)).toBe(true);

    expect(await User.exists({ _id: trainee.id })).toBeNull();
    expect(await OnboardingResponse.countDocuments({ userId: trainee.id })).toBe(0);
    expect(await BodyMetric.countDocuments({ traineeId: trainee.id })).toBe(0);
    expect(await WorkoutLog.countDocuments({ traineeId: trainee.id })).toBe(0);
    expect(await MealLog.countDocuments({ traineeId: trainee.id })).toBe(0);
    expect(await Membership.countDocuments({ userId: trainee.id })).toBe(0);

    const coaching = await Coaching.findOne({ traineeId: trainee.id }).lean();
    expect(coaching).toMatchObject({ status: 'ended', live: false });
    expect(coaching?.endedAt).toBeInstanceOf(Date);

    expect((await api.request('GET', '/auth/me', { token: trainee.token })).status).toBe(401);
    // The coach's archive no longer opens her.
    expect((await api.request('GET', `/coach/archive/${trainee.id}`, { token: coach.token })).status).toBe(404);
    // The other trainee is untouched.
    expect((await api.request('GET', '/auth/me', { token: other.token })).status).toBe(200);
  });

  it('deletes only the caller: the id comes from her token, never from the request', async () => {
    const res = await deleteAccount(trainee, { password: PASSWORD, userId: coach.id });
    expect(res.status).toBe(400);
    expect(await User.exists({ _id: trainee.id })).not.toBeNull();
    expect(await User.exists({ _id: coach.id })).not.toBeNull();
    expect((await api.request('DELETE', '/account', { body: { password: PASSWORD } })).status).toBe(401);
  });

  it('needs her password: missing or wrong changes nothing', async () => {
    await seedPhotos(trainee.id);
    expect((await deleteAccount(trainee, {})).status).toBe(400);
    expect((await deleteAccount(trainee, { password: 'wrong-password' })).status).toBe(403);
    expect(await User.exists({ _id: trainee.id })).not.toBeNull();
    expect(storage.stored.size).toBeGreaterThan(0);
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it('keeps everything when the photos could not be removed', async () => {
    await seedPhotos(trainee.id);
    storage.failing = true;
    const res = await deleteAccount(trainee);
    expect(res.status).toBe(503);
    expect(await User.exists({ _id: trainee.id })).not.toBeNull();
    expect(await Coaching.exists({ traineeId: trainee.id, live: true })).not.toBeNull();
    expect((await api.request('GET', '/auth/me', { token: trainee.token })).status).toBe(200);
  });

  it('refuses a coach with live trainees, then deletes her own content once they are ended', async () => {
    const refused = await deleteAccount(coach);
    expect(refused.status).toBe(409);
    expect(refused.body.code).toBe('account_coach_has_trainees');

    await Coaching.updateMany({ coachId: coach.id }, { $set: { status: 'ended', live: false, endedAt: new Date() } });
    const systemFood = await FoodItem.create({ scope: 'system', itemKey: 'sys-1', group: 'protein', name: 'Eggs', portion: '2' });
    await FoodItem.create({ scope: 'coach', coachId: coach.id, group: 'protein', name: 'Tuna', portion: '1 can' });
    await Template.collection.insertOne({ coachId: coach.user._id, type: 'plan', name: 'Mine', workouts: [] });

    expect((await deleteAccount(coach)).status).toBe(204);
    expect(await User.exists({ _id: coach.id })).toBeNull();
    expect(await CoachProfile.countDocuments({ userId: coach.id })).toBe(0);
    expect(await Community.countDocuments({ coachId: coach.id })).toBe(0);
    expect(await FoodItem.countDocuments({ coachId: coach.id })).toBe(0);
    expect(await Template.countDocuments({ coachId: coach.id })).toBe(0);
    expect(await FoodItem.exists({ _id: systemFood._id })).not.toBeNull();
    expect((await api.request('GET', '/auth/me', { token: coach.token })).status).toBe(401);
  });

  it('never deletes an admin account', async () => {
    const admin = await createTestUser('admin@test.dev', { role: 'admin', passwordHash });
    const res = await deleteAccount(admin);
    expect(res.status).toBe(403);
    expect(await User.exists({ _id: admin.id })).not.toBeNull();
  });
});
