import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import bcrypt from 'bcrypt';
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from '../../exercises/__tests__/testDb';
import { User } from '../../users/user.model';
import { DEV_SEED_PASSWORD } from '../../users/scripts/devSeed.constants';
import { readCreateAdminInput } from '../scripts/createAdminInput';
import { createOrPromoteAdmin } from '../scripts/adminAccount';

const EMAIL = 'owner@example.com';
const PASSWORD = 'a-long-own-password';

describe('create:admin input', () => {
  it('reads and normalizes the env', () => {
    const result = readCreateAdminInput({ ADMIN_EMAIL: '  Owner@Example.com ', ADMIN_PASSWORD: PASSWORD }, ['--allow-remote']);
    expect(result).toEqual({
      ok: true,
      input: { email: EMAIL, password: PASSWORD, name: 'Admin', allowRemote: true, resetPassword: false },
    });
  });

  it('refuses a missing or invalid email', () => {
    expect(readCreateAdminInput({}, []).ok).toBe(false);
    expect(readCreateAdminInput({ ADMIN_EMAIL: 'nope' }, []).ok).toBe(false);
  });

  it('refuses a short password and the public seed password, without echoing it', () => {
    for (const password of ['short', DEV_SEED_PASSWORD]) {
      const result = readCreateAdminInput({ ADMIN_EMAIL: EMAIL, ADMIN_PASSWORD: password }, []);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).not.toContain(password);
    }
  });

  it('allows no password (promote only), but not with --reset-password', () => {
    expect(readCreateAdminInput({ ADMIN_EMAIL: EMAIL }, []).ok).toBe(true);
    expect(readCreateAdminInput({ ADMIN_EMAIL: EMAIL }, ['--reset-password']).ok).toBe(false);
  });
});

describe('createOrPromoteAdmin', () => {
  beforeAll(connectTestDatabase);
  afterAll(disconnectTestDatabase);
  beforeEach(clearTestDatabase);

  const base = { email: EMAIL, name: 'Admin', resetPassword: false };

  it('creates an admin-only account with a hashed password', async () => {
    expect(await createOrPromoteAdmin({ ...base, password: PASSWORD })).toEqual({ kind: 'created' });
    const user = await User.findOne({ email: EMAIL }).lean();
    expect(user?.roles).toEqual(['admin']);
    expect(user?.passwordHash).not.toBe(PASSWORD);
    expect(await bcrypt.compare(PASSWORD, user!.passwordHash!)).toBe(true);
  });

  it('needs a password to create', async () => {
    expect(await createOrPromoteAdmin({ ...base, password: null })).toEqual({ kind: 'missing_password' });
    expect(await User.countDocuments()).toBe(0);
  });

  it('promotes an existing user, keeping her roles and password', async () => {
    const oldHash = await bcrypt.hash('her-old-password', 4);
    await User.create({ name: 'Owner', email: EMAIL, passwordHash: oldHash, roles: ['trainee'] });

    expect(await createOrPromoteAdmin({ ...base, password: PASSWORD })).toEqual({ kind: 'promoted', passwordReset: false });
    const user = await User.findOne({ email: EMAIL }).lean();
    expect(user?.roles).toEqual(['trainee', 'admin']);
    expect(user?.passwordHash).toBe(oldHash);
  });

  it('changes the password only with resetPassword, and is idempotent', async () => {
    await createOrPromoteAdmin({ ...base, password: PASSWORD });
    const newPassword = 'another-long-password';
    expect(await createOrPromoteAdmin({ ...base, password: newPassword, resetPassword: true })).toEqual({
      kind: 'already_admin',
      passwordReset: true,
    });
    const user = await User.findOne({ email: EMAIL }).lean();
    expect(user?.roles).toEqual(['admin']);
    expect(await bcrypt.compare(newPassword, user!.passwordHash!)).toBe(true);
  });
});
