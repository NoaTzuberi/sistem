import type { AuthUser, PrivatePhoto } from './index';

// Accounts & relationships: admin → coach → trainee, invites, communities.

// ---------------------------------------------------------------------------
// Coaching = the private trainee ↔ coach relationship. Coach-owned data (plans, logs,
// nutrition, notes, AI drafts) belongs to one coaching.
// ---------------------------------------------------------------------------

export type CoachingStatus = 'waiting' | 'active' | 'ended';

/** GET /coachings — the trainee's own coachings (non-ended), newest first. */
export interface MyCoaching {
  id: string;
  coachId: string;
  coachName: string;
  status: CoachingStatus;
  /** Optional, not shown yet (e.g. strength / pilates / yoga / running). */
  discipline: string | null;
  startedAt: string;
  /** The coach's profile photo (signed, expiring link), or null = initials. */
  coachAvatar: PrivatePhoto | null;
  /** The communities of this coach she belongs to (names only). */
  communityNames: string[];
  /** Temporary payment links; null when the coach set none. Only her own coachings carry them. */
  payment: CoachPayment | null;
}

// ---------------------------------------------------------------------------
// Coach payment links (temporary, until real payments). The app never processes or records payments.
// ---------------------------------------------------------------------------

export interface CoachPayment {
  /** https only (checked on save). */
  payboxUrl: string | null;
  /** Israeli mobile, normalized to 05XXXXXXXX. */
  bitPhone: string | null;
  /** ≤ 140 characters. */
  note: string | null;
}

/** GET / PUT /coach/profile/payment — every field optional; null or '' clears it. */
export type UpdateCoachPaymentPayload = Partial<Record<keyof CoachPayment, string | null>>;

export interface CoachPaymentResponse {
  payment: CoachPayment;
}

// ---------------------------------------------------------------------------
// The coach's saved defaults for what goes out with a plan (a message + a tip), per plan kind.
// ---------------------------------------------------------------------------

export interface CoachSendDefault {
  /** ≤ 600 characters, may say {name}; null = not set. */
  message: string | null;
  /** ≤ 300 characters, may say {name}; null = not set. */
  tip: string | null;
}

export type SendDefaultsKind = 'nutrition' | 'workouts';

export interface CoachSendDefaults {
  nutrition: CoachSendDefault;
  workouts: CoachSendDefault;
}

/** PATCH /coach/profile/defaults — only the fields sent change; null or '' clears one. */
export type UpdateCoachSendDefaultsPayload = Partial<Record<SendDefaultsKind, Partial<Record<keyof CoachSendDefault, string | null>>>>;

/** GET / PATCH /coach/profile/defaults */
export interface CoachSendDefaultsResponse {
  defaults: CoachSendDefaults;
}

export interface MyCoachingsResponse {
  coachings: MyCoaching[];
}

// ---------------------------------------------------------------------------
// Communities — membership never grants access to private data.
// ---------------------------------------------------------------------------

export type CommunityVisibility = 'invite' | 'public';
export type MembershipRole = 'member' | 'owner';

export interface MyCommunity {
  id: string;
  name: string;
  isPrimary: boolean;
  role: MembershipRole;
}

export interface MyCommunitiesResponse {
  communities: MyCommunity[];
}

// ---------------------------------------------------------------------------
// Invites — /join/<code>
// ---------------------------------------------------------------------------

export type InviteType = 'coaching' | 'community';

/** One of the coach's invite links (dashboard). */
export interface CoachInvite {
  id: string;
  code: string;
  /** The permanent coaching link only: the 6-character code trainees can type in the app. */
  shortCode: string | null;
  /** The full link to share (the mobile app's /join/<code>). */
  url: string;
  type: InviteType;
  /** Personal single-use links carry the email they were made for. */
  targetEmail: string | null;
  maxUses: number | null;
  uses: number;
  expiresAt: string | null;
  createdAt: string;
}

/** GET /coach/invites — her permanent coaching link + the open personal links. */
export interface CoachInvitesResponse {
  permanent: CoachInvite;
  personal: CoachInvite[];
}

export interface CreatePersonalInvitePayload {
  /** Optional: the link is still single use without it. */
  targetEmail?: string;
}

/** Why a code can't be used — the app shows one friendly screen for all of them. */
export type InviteProblem = 'invalid' | 'expired' | 'revoked' | 'used_up';

/**
 * What the viewer can do with the code. Signed out → 'sign_up'. Signed in:
 * 'join' (no current coach), 'already_hers' (already with this coach — community added if missing),
 * 'other_coach' (with another coach and multi-coach is off — only a community invite can be joined),
 * 'join_community' (a community invite), 'not_trainee' (a coach / admin account).
 */
export type JoinAction = 'sign_up' | 'join' | 'already_hers' | 'other_coach' | 'join_community' | 'not_trainee';

/** GET /join/:code (auth optional). */
export interface JoinPreview {
  code: string;
  type: InviteType;
  coachName: string;
  communityName: string | null;
  /** Signed-in viewers only (the coach confirm screen); null = initials. */
  coachAvatar: PrivatePhoto | null;
  /** The coach's primary community — what she joins along with the coaching. */
  coachCommunityNames: string[];
  action: JoinAction;
  /** Set with 'other_coach'. */
  otherCoachName: string | null;
}

export type JoinResult = 'coaching_started' | 'already_hers' | 'community_joined';

/** POST /join/:code — the signed-in trainee accepts. */
export interface JoinResponse {
  result: JoinResult;
  coachName: string;
  /** Her refreshed user (appState moves to waiting / onboarding). */
  user: AuthUser;
}

// ---------------------------------------------------------------------------
// Admin — the platform admin creates and manages coaches.
// ---------------------------------------------------------------------------

export type CoachProfileStatus = 'active' | 'suspended';

export interface AdminCoach {
  id: string;
  userId: string;
  name: string;
  email: string;
  slug: string;
  status: CoachProfileStatus;
  /** False until she sets her password through the one-time link. */
  passwordSet: boolean;
  /** Her non-ended coachings. */
  traineeCount: number;
  createdAt: string;
}

export interface AdminCoachesResponse {
  coaches: AdminCoach[];
}

export interface CreateCoachPayload {
  name: string;
  email: string;
}

/** POST /admin/coaches and POST /admin/coaches/:id/password-link. */
export interface CoachPasswordLinkResponse {
  coach: AdminCoach;
  /** set_password = the new-coach link (48 h); reset_password = the dashboard reset link (60 min, signs her out elsewhere). */
  kind: 'set_password' | 'reset_password';
  /** One-time link (single use) — shown once to copy. */
  setPasswordUrl: string;
  expiresAt: string;
  /** True when the email went out (Resend configured). */
  emailSent: boolean;
}

export interface SetPasswordPayload {
  token: string;
  password: string;
}
