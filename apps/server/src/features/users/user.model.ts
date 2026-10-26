import { Schema, model } from 'mongoose';
import type { OnboardingStatus, UserRole } from '@sistem/types';
import {
  USER_ROLES,
  DEFAULT_USER_ROLE,
  ROLE_PRIORITY,
  ONBOARDING_STATUS_IDS,
  DEFAULT_ONBOARDING_STATUS,
  DEFAULT_TIMEZONE,
  PUSH_PLATFORM_IDS,
} from './users.constants';
import { isValidTimezone } from './timezone';
import { LANGUAGE_IDS } from './units';

interface UserPreferences {
  units?: {
    weight?: 'kg' | 'lb';
    distance?: 'km' | 'miles';
    // Body measurements (Phase 10). Unset = cm.
    length?: 'cm' | 'in';
  };
  /** UI language (Phase 15). Unset = Hebrew. */
  language?: 'he' | 'en';
}

export interface PushToken {
  token: string;
  platform: (typeof PUSH_PLATFORM_IDS)[number];
  updatedAt: Date;
}

// Onboarding answers live in the OnboardingResponse collection (PRD §10), not here.
export interface UserDocument {
  name: string;
  email: string;
  /** Empty until an admin-created coach sets it through her one-time link. */
  passwordHash?: string | null;
  roles: UserRole[];
  passwordResetTokenHash?: string;
  passwordResetExpires?: Date;
  /** In every JWT (`sv`); raised when a coach / admin resets her password, which signs out every older session. */
  sessionVersion?: number;
  preferences?: UserPreferences;
  onboardingStatus: OnboardingStatus;
  onboardingCompletedAt?: Date | null;
  /** First run: when she chose "on my own" (or finished onboarding without a coach). Never cleared. */
  selfGuidedAt?: Date | null;
  pushTokens: PushToken[];
  timezone: string;
  /** When she last opened each tab that shows an "unseen update" dot (Phase 13a). */
  tabSeenAt?: { workouts?: Date | null; nutrition?: Date | null };
  /** The newest nutrition version whose intro she has read (Phase 13a+; 0 = none). */
  nutritionIntroSeenVersion?: number;
  /** Her profile photo: a private asset (privatePhotos flow) — only the storage id is kept. */
  avatar?: { publicId: string; uploadedAt: Date } | null;
  createdAt: Date;
  updatedAt: Date;
}

const preferencesSchema = new Schema<UserPreferences>(
  {
    units: {
      weight: { type: String, enum: ['kg', 'lb'] },
      distance: { type: String, enum: ['km', 'miles'] },
      length: { type: String, enum: ['cm', 'in'] },
    },
    language: { type: String, enum: LANGUAGE_IDS },
  },
  { _id: false },
);

const pushTokenSchema = new Schema<PushToken>(
  {
    token: { type: String, required: true },
    platform: { type: String, enum: PUSH_PLATFORM_IDS, required: true },
    updatedAt: { type: Date, required: true, default: () => new Date() },
  },
  { _id: false },
);

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, default: null },
    roles: {
      type: [{ type: String, enum: USER_ROLES }],
      default: () => [DEFAULT_USER_ROLE],
      validate: { validator: (roles: string[]) => roles.length > 0, message: 'A user needs at least one role.' },
    },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    sessionVersion: { type: Number, default: 0 },
    preferences: { type: preferencesSchema },
    onboardingStatus: {
      type: String,
      enum: ONBOARDING_STATUS_IDS,
      default: DEFAULT_ONBOARDING_STATUS,
      required: true,
    },
    onboardingCompletedAt: { type: Date, default: null },
    selfGuidedAt: { type: Date, default: null },
    // Device tokens are never sent to clients.
    pushTokens: { type: [pushTokenSchema], default: [], select: false },
    timezone: {
      type: String,
      required: true,
      default: DEFAULT_TIMEZONE,
      validate: { validator: isValidTimezone, message: 'Invalid time zone.' },
    },
    tabSeenAt: {
      workouts: { type: Date, default: null },
      nutrition: { type: Date, default: null },
    },
    nutritionIntroSeenVersion: { type: Number, default: 0 },
    avatar: {
      type: new Schema({ publicId: { type: String, required: true }, uploadedAt: { type: Date, required: true } }, { _id: false }),
      default: null,
    },
  },
  { timestamps: true },
);

userSchema.index({ roles: 1 });
// Phase 5b removes invalid/expired tokens by value.
userSchema.index({ 'pushTokens.token': 1 }, { sparse: true });

export const User = model<UserDocument>('User', userSchema);

export function hasRole(user: Pick<UserDocument, 'roles'>, role: UserRole): boolean {
  return (user.roles ?? []).includes(role);
}

/** admin > coach > trainee — for the one `role` older client code still reads. */
export function primaryRole(user: Pick<UserDocument, 'roles'>): UserRole {
  return ROLE_PRIORITY.find((role) => hasRole(user, role)) ?? DEFAULT_USER_ROLE;
}

export function isOnboardingCompleted(user: Pick<UserDocument, 'onboardingStatus'>): boolean {
  return user.onboardingStatus === 'completed';
}
