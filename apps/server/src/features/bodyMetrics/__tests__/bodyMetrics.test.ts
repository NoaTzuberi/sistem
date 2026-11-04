import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from '../../exercises/__tests__/testDb';
import { startApiTestClient, createTestUser } from '../../../testing/apiTestClient';
import type { ApiTestClient } from '../../../testing/apiTestClient';
import { addDays, localDateString } from '../../plans/planWeek';
import { BodyMetric } from '../bodyMetric.model';

// Phase 10 (PRD §5.5): weight, measurements and progress photos — one day per date,
// her own only, read by her coach and nobody else. Cloudinary is replaced by a fake
// (the real private-photo flow is the Phase 9 one, checked by hand then).

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

type TestUser = Awaited<ReturnType<typeof createTestUser>>;

const TIMEZONE = 'Asia/Jerusalem';
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);

let api: ApiTestClient;
let coach: TestUser;
let otherCoach: TestUser;
let trainee: TestUser;
let other: TestUser;
let today: string;
let yesterday: string;

function save(date: string, body: unknown, user = trainee) {
  return api.request('PUT', `/body-metrics/${date}`, { token: user.token, body });
}

function uploadPhoto(date: string, pose: string, user = trainee, data = JPEG, contentType = 'image/jpeg') {
  return api.request('PUT', `/body-metrics/${date}/photos/${pose}`, { token: user.token, raw: { data, contentType } });
}

describe('body tracking (/api/body-metrics)', () => {
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
    coach = await createTestUser('coach@example.com', { role: 'coach' });
    otherCoach = await createTestUser('coach2@example.com', { role: 'coach' });
    trainee = await createTestUser('maya@example.com', { coachId: coach.user._id, timezone: TIMEZONE });
    other = await createTestUser('noa@example.com', { coachId: coach.user._id, timezone: TIMEZONE });
    today = localDateString(new Date(), TIMEZONE);
    yesterday = addDays(today, -1);
  });

  describe('weight and measurements', () => {
    it('saves a weight for a day and lists it with the measurement list', async () => {
      const res = await save(today, { weight: 61.4 });
      expect(res.status).toBe(200);
      expect(res.body.metric).toMatchObject({ date: today, weight: 61.4, measurements: {}, photos: [] });

      const list = await api.request('GET', '/body-metrics', { token: trainee.token });
      expect(list.body.measurementIds).toEqual(['chest', 'waist', 'hips', 'arms', 'thighs']);
      expect(list.body.items).toHaveLength(1);
    });

    it('one day per date: a second save of the same day changes it', async () => {
      await save(today, { weight: 61.4 });
      await save(today, { weight: 61.0, measurements: { waist: 70 } });
      const metrics = await BodyMetric.find({ traineeId: trainee.user._id }).lean();
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toMatchObject({ weight: 61, measurements: { waist: 70 } });
    });

    it('lists newest day first', async () => {
      await save(addDays(today, -10), { weight: 63 });
      await save(today, { weight: 61 });
      await save(yesterday, { weight: 62 });
      const list = await api.request('GET', '/body-metrics', { token: trainee.token });
      expect(list.body.items.map((item: { weight: number }) => item.weight)).toEqual([61, 62, 63]);
    });

    it('measurements merge; null clears one; values are kept to 2 decimals', async () => {
      await save(today, { measurements: { waist: 70, hips: 96 } });
      const res = await save(today, { measurements: { waist: null, chest: 88.12345 } });
      expect(res.body.metric.measurements).toEqual({ hips: 96, chest: 88.12 });
    });

    it('clearing the last value deletes the day', async () => {
      await save(today, { weight: 61, measurements: { waist: 70 } });
      await save(today, { weight: null });
      const res = await save(today, { measurements: { waist: null } });
      expect(res.status).toBe(200);
      expect(res.body.metric).toBeNull();
      expect(await BodyMetric.countDocuments()).toBe(0);
    });

    it('clearing on a day that does not exist creates nothing', async () => {
      const res = await save(today, { weight: null });
      expect(res.body.metric).toBeNull();
      expect(await BodyMetric.countDocuments()).toBe(0);
    });

    it('DELETE removes a whole day', async () => {
      await save(today, { weight: 61 });
      expect((await api.request('DELETE', `/body-metrics/${today}`, { token: trainee.token })).status).toBe(204);
      expect(await BodyMetric.countDocuments()).toBe(0);
    });

    it.each([
      ['a future date', () => addDays(today, 1), { weight: 60 }],
      ['a date that does not exist', () => '2026-02-30', { weight: 60 }],
      ['a date before 2000', () => '1999-12-31', { weight: 60 }],
      ['an unknown measurement', () => today, { measurements: { neck: 35 } }],
      ['a weight out of range', () => today, { weight: 500 }],
      ['a measurement out of range', () => today, { measurements: { waist: 2 } }],
      ['a string weight', () => today, { weight: '60' }],
      ['nothing to save', () => today, {}],
      ['an unknown field', () => today, { weight: 60, notes: 'hi' }],
    ])('rejects %s (400)', async (_label, date, body) => {
      const res = await save(date(), body);
      expect(res.status).toBe(400);
      expect(await BodyMetric.countDocuments()).toBe(0);
    });

    it('a measurement out of range names it (field), so the form can show the message under that row', async () => {
      const res = await save(today, { measurements: { waist: 2 } });
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ code: 'body_measurement_range', field: 'waist' });
      expect((await save(today, { weight: 500 })).body.field).toBeUndefined();
    });

    it('"today" is her own time zone', async () => {
      // Kiritimati is UTC+14: its today can be our tomorrow.
      const far = await createTestUser('far@example.com', { timezone: 'Pacific/Kiritimati' });
      const farToday = localDateString(new Date(), 'Pacific/Kiritimati');
      expect((await save(farToday, { weight: 60 }, far)).status).toBe(200);
      expect((await save(addDays(farToday, 1), { weight: 60 }, far)).status).toBe(400);
    });
  });

  describe('progress photos', () => {
    it('uploads a pose into her private folder; only a signed link is sent', async () => {
      const res = await uploadPhoto(today, 'front');
      expect(res.status).toBe(200);
      expect(storage.upload).toHaveBeenCalledWith(expect.any(Buffer), `sistem/progress-photos/${trainee.id}`, `${today}-front`);
      expect(res.body.metric.photos).toEqual([
        expect.objectContaining({ pose: 'front', url: expect.stringContaining('https://signed.test/'), urlExpiresAt: expect.any(String) }),
      ]);
      expect(JSON.stringify(res.body)).not.toContain('publicId');
    });

    it('a day can hold its photos together with the weight, in front / side / back order', async () => {
      await save(today, { weight: 61 });
      await uploadPhoto(today, 'back');
      const res = await uploadPhoto(today, 'front');
      expect(res.body.metric.weight).toBe(61);
      expect(res.body.metric.photos.map((photo: { pose: string }) => photo.pose)).toEqual(['front', 'back']);
    });

    it('a new photo of the same pose replaces the old one and deletes it from storage', async () => {
      await uploadPhoto(today, 'side');
      const firstId = await storage.upload.mock.results[0].value;
      const res = await uploadPhoto(today, 'side');
      expect(res.body.metric.photos).toHaveLength(1);
      expect(storage.remove).toHaveBeenCalledWith(firstId);
    });

    it('removing a photo deletes it; the day goes when nothing is left', async () => {
      await save(today, { weight: 61 });
      await uploadPhoto(today, 'front');
      const id = await storage.upload.mock.results[0].value;
      const res = await api.request('DELETE', `/body-metrics/${today}/photos/front`, { token: trainee.token });
      expect(res.body.metric).toMatchObject({ weight: 61, photos: [] });
      expect(storage.remove).toHaveBeenCalledWith(id);

      await uploadPhoto(yesterday, 'back');
      const gone = await api.request('DELETE', `/body-metrics/${yesterday}/photos/back`, { token: trainee.token });
      expect(gone.body.metric).toBeNull();
    });

    it('deleting a day deletes its photos', async () => {
      await uploadPhoto(today, 'front');
      await uploadPhoto(today, 'back');
      await api.request('DELETE', `/body-metrics/${today}`, { token: trainee.token });
      expect(storage.remove).toHaveBeenCalledTimes(2);
    });

    it('rejects a file that is not an image (400), a wrong type (415), an unknown pose (400), a future day (400)', async () => {
      expect((await uploadPhoto(today, 'front', trainee, Buffer.from('not an image'))).status).toBe(400);
      expect((await uploadPhoto(today, 'front', trainee, JPEG, 'text/plain')).status).toBe(415);
      expect((await uploadPhoto(today, 'top', trainee)).status).toBe(400);
      expect((await uploadPhoto(addDays(today, 1), 'front', trainee)).status).toBe(400);
      expect(storage.upload).not.toHaveBeenCalled();
    });
  });

  describe('access', () => {
    it('a trainee only ever sees and changes her own days', async () => {
      await save(today, { weight: 61 });
      await uploadPhoto(today, 'front');
      await save(today, { weight: 80 }, other);
      await api.request('DELETE', `/body-metrics/${today}/photos/front`, { token: other.token });

      const mine = await api.request('GET', '/body-metrics', { token: trainee.token });
      expect(mine.body.items[0]).toMatchObject({ weight: 61, photos: [expect.objectContaining({ pose: 'front' })] });
      const theirs = await api.request('GET', '/body-metrics', { token: other.token });
      expect(theirs.body.items).toHaveLength(1);
      expect(theirs.body.items[0]).toMatchObject({ weight: 80, photos: [] });
      expect(storage.remove).not.toHaveBeenCalled();
    });

    it('her coach reads everything, photos as signed links', async () => {
      await save(today, { weight: 61, measurements: { waist: 70 } });
      await uploadPhoto(today, 'front');
      const res = await api.request('GET', `/coach/trainees/${trainee.id}/body-metrics`, { token: coach.token });
      expect(res.status).toBe(200);
      expect(res.body.measurementIds).toContain('waist');
      expect(res.body.items[0]).toMatchObject({ weight: 61, measurements: { waist: 70 } });
      expect(res.body.items[0].photos[0].url).toContain('https://signed.test/');
    });

    it('another coach gets 404, a trainee 403 on the coach route', async () => {
      expect((await api.request('GET', `/coach/trainees/${trainee.id}/body-metrics`, { token: otherCoach.token })).status).toBe(404);
      expect((await api.request('GET', `/coach/trainees/${trainee.id}/body-metrics`, { token: other.token })).status).toBe(403);
    });

    it('the trainee routes are trainee-only and need a session', async () => {
      expect((await save(today, { weight: 61 }, coach)).status).toBe(403);
      expect((await api.request('GET', '/body-metrics', { token: coach.token })).status).toBe(403);
      expect((await api.request('GET', '/body-metrics')).status).toBe(401);
    });

    it('the old ATLAS /progress API is gone', async () => {
      expect((await api.request('GET', '/progress', { token: trainee.token })).status).toBe(404);
    });
  });

  describe('units (PATCH /users/preferences)', () => {
    it('defaults to kg / cm and changes one unit at a time', async () => {
      const me = await api.request('GET', '/auth/me', { token: trainee.token });
      expect(me.body.user.units).toEqual({ weight: 'kg', length: 'cm' });

      const lb = await api.request('PATCH', '/users/preferences', { token: trainee.token, body: { units: { weight: 'lb' } } });
      expect(lb.status).toBe(200);
      expect(lb.body.user.units).toEqual({ weight: 'lb', length: 'cm' });
      const inches = await api.request('PATCH', '/users/preferences', { token: trainee.token, body: { units: { length: 'in' } } });
      expect(inches.body.user.units).toEqual({ weight: 'lb', length: 'in' });
    });

    it.each([{ units: { weight: 'stone' } }, { units: { length: 'mm' } }, { units: {} }, { units: { distance: 'km' } }, {}])(
      'rejects %j (400)',
      async (body) => {
        expect((await api.request('PATCH', '/users/preferences', { token: trainee.token, body })).status).toBe(400);
      },
    );
  });
});
