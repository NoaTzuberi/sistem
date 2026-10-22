import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from '../../exercises/__tests__/testDb';
import { startApiTestClient, createTestUser } from '../../../testing/apiTestClient';
import type { ApiTestClient } from '../../../testing/apiTestClient';

// The profile photo: private (signed links only), stored under her id, visible to her and her
// coach. Cloudinary is replaced by a fake, as in the Daily Pump tests.

const storage = vi.hoisted(() => {
  let count = 0;
  return {
    upload: vi.fn(async (_data: Buffer, folder: string, name: string) => `${folder}/${name}-${++count}`),
    remove: vi.fn(async (_publicId: string) => undefined),
    reset() {
      count = 0;
      this.upload.mockClear();
      this.remove.mockClear();
    },
  };
});

vi.mock('../../privatePhotos/privatePhoto.service', () => ({
  PhotoStorageUnavailableError: class PhotoStorageUnavailableError extends Error {},
  uploadPrivatePhoto: storage.upload,
  deletePrivatePhoto: storage.remove,
  toPublicPhoto: (photo: { publicId: string; uploadedAt: Date }) => ({
    uploadedAt: photo.uploadedAt.toISOString(),
    url: `https://signed.test/${photo.publicId}`,
    urlExpiresAt: new Date(photo.uploadedAt.getTime() + 3600_000).toISOString(),
  }),
}));

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);

type TestUser = Awaited<ReturnType<typeof createTestUser>>;
let api: ApiTestClient;
let coach: TestUser;
let otherCoach: TestUser;
let trainee: TestUser;

function upload(user: TestUser, raw = { data: JPEG, contentType: 'image/jpeg' }) {
  return api.request('PUT', '/users/me/avatar', { token: user.token, raw });
}

describe('profile photo (/api/users/me/avatar)', () => {
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
    storage.reset();
    coach = await createTestUser('coach@test.dev', { role: 'coach' });
    otherCoach = await createTestUser('other-coach@test.dev', { role: 'coach' });
    trainee = await createTestUser('trainee@test.dev', { coachId: coach.user._id });
  });

  it('starts empty, uploads into her own folder and answers with a signed link only', async () => {
    const me = await api.request('GET', '/auth/me', { token: trainee.token });
    expect(me.body.user.avatar).toBeNull();

    const res = await upload(trainee);
    expect(res.status).toBe(200);
    expect(storage.upload).toHaveBeenCalledWith(expect.any(Buffer), `sistem/avatars/${trainee.id}`, 'avatar');
    expect(res.body.user.avatar).toEqual({
      uploadedAt: expect.any(String),
      url: `https://signed.test/sistem/avatars/${trainee.id}/avatar-1`,
      urlExpiresAt: expect.any(String),
    });
    expect(JSON.stringify(res.body)).not.toContain('publicId');

    const link = await api.request('GET', '/users/me/avatar', { token: trainee.token });
    expect(link.body.avatar.url).toContain('avatar-1');
  });

  it('replacing deletes the old photo; removing deletes the current one', async () => {
    await upload(trainee);
    const replaced = await upload(trainee);
    expect(replaced.body.user.avatar.url).toContain('avatar-2');
    expect(storage.remove).toHaveBeenCalledWith(`sistem/avatars/${trainee.id}/avatar-1`);

    const removed = await api.request('DELETE', '/users/me/avatar', { token: trainee.token });
    expect(removed.status).toBe(200);
    expect(removed.body.user.avatar).toBeNull();
    expect(storage.remove).toHaveBeenLastCalledWith(`sistem/avatars/${trainee.id}/avatar-2`);
  });

  it('refuses what is not an image, the wrong type, a too-large file and no login', async () => {
    expect((await upload(trainee, { data: Buffer.from('not an image'), contentType: 'image/jpeg' })).status).toBe(400);
    expect((await upload(trainee, { data: JPEG, contentType: 'text/plain' })).status).toBe(415);
    const huge = Buffer.concat([JPEG, Buffer.alloc(3 * 1024 * 1024)]);
    expect((await upload(trainee, { data: huge, contentType: 'image/jpeg' })).status).toBe(413);
    expect((await api.request('PUT', '/users/me/avatar', { raw: { data: JPEG, contentType: 'image/jpeg' } })).status).toBe(401);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('her coach sees it in the list and the detail; another coach cannot open her', async () => {
    await upload(trainee);
    const list = await api.request('GET', '/coach/trainees', { token: coach.token });
    expect(list.body.items[0].avatar.url).toContain(`sistem/avatars/${trainee.id}/`);
    const detail = await api.request('GET', `/coach/trainees/${trainee.id}`, { token: coach.token });
    expect(detail.body.trainee.avatar.url).toContain(`sistem/avatars/${trainee.id}/`);

    const other = await api.request('GET', `/coach/trainees/${trainee.id}`, { token: otherCoach.token });
    expect(other.status).toBe(404);
    const otherList = await api.request('GET', '/coach/trainees', { token: otherCoach.token });
    expect(otherList.body.items).toHaveLength(0);
  });
});
