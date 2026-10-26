import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type {
  AdminCoach,
  AdminCoachesResponse,
  CoachInvite,
  CoachPayment,
  CoachPaymentResponse,
  CoachInvitesResponse,
  CoachPasswordLinkResponse,
  CoachProfileStatus,
  CreateCoachPayload,
  InviteProblem,
  InviteType,
  JoinPreview,
  JoinResponse,
  UpdateCoachPaymentPayload,
} from '@sistem/types';
import { extractErrorMessage } from './createApiClient';

// Accounts & relationships: the admin's coach management, the coach's invite links, and /join.

/**
 * A /join call that failed. `problem` is set for a code that can't be used (invalid / expired /
 * revoked / used up); `status` 409 + `otherCoachName` = she is with another coach (multi-coach off).
 */
export class JoinRequestError extends Error {
  readonly status: number | null;
  readonly code: string | null;
  readonly problem: InviteProblem | null;
  readonly otherCoachName: string | null;

  constructor(message: string, status: number | null, code: string | null, problem: InviteProblem | null, otherCoachName: string | null) {
    super(message);
    this.status = status;
    this.code = code;
    this.problem = problem;
    this.otherCoachName = otherCoachName;
  }
}

function toJoinError(error: unknown): JoinRequestError {
  const response = axios.isAxiosError(error) ? error.response : undefined;
  const body = (response?.data ?? {}) as { code?: string; problem?: InviteProblem; otherCoachName?: string };
  return new JoinRequestError(extractErrorMessage(error, ''), response?.status ?? null, body.code ?? null, body.problem ?? null, body.otherCoachName ?? null);
}

/** Public + trainee: look a code up (signed in or not) and accept it. */
export function createJoinApi(client: AxiosInstance) {
  async function previewJoin(code: string): Promise<JoinPreview> {
    try {
      const { data } = await client.get<JoinPreview>(`/join/${encodeURIComponent(code)}`);
      return data;
    } catch (error) {
      throw toJoinError(error);
    }
  }

  async function acceptJoin(code: string): Promise<JoinResponse> {
    try {
      const { data } = await client.post<JoinResponse>(`/join/${encodeURIComponent(code)}`);
      return data;
    } catch (error) {
      throw toJoinError(error);
    }
  }

  return { previewJoin, acceptJoin };
}

/** The coach's own links (dashboard). */
export function createInvitesApi(client: AxiosInstance) {
  async function getInvites(): Promise<CoachInvitesResponse> {
    const { data } = await client.get<CoachInvitesResponse>('/coach/invites');
    return data;
  }

  async function createPersonalInvite(targetEmail?: string): Promise<CoachInvite> {
    try {
      const { data } = await client.post<{ invite: CoachInvite }>('/coach/invites', targetEmail ? { targetEmail } : {});
      return data.invite;
    } catch (error) {
      throw new Error(extractErrorMessage(error, ''));
    }
  }

  async function regenerateInvite(type: InviteType = 'coaching'): Promise<CoachInvite> {
    const { data } = await client.post<{ invite: CoachInvite }>('/coach/invites/regenerate', { type });
    return data.invite;
  }

  async function revokeInvite(inviteId: string): Promise<void> {
    await client.delete(`/coach/invites/${inviteId}`);
  }

  async function getCommunityInvite(): Promise<CoachInvite> {
    const { data } = await client.get<{ invite: CoachInvite }>('/coach/invites/community');
    return data.invite;
  }

  return { getInvites, createPersonalInvite, regenerateInvite, revokeInvite, getCommunityInvite };
}

/** The coach's temporary payment links (shown to her trainees on the coach card). */
export function createCoachPaymentApi(client: AxiosInstance) {
  async function getPayment(): Promise<CoachPayment> {
    const { data } = await client.get<CoachPaymentResponse>('/coach/profile/payment');
    return data.payment;
  }

  async function savePayment(payload: UpdateCoachPaymentPayload): Promise<CoachPayment> {
    try {
      const { data } = await client.put<CoachPaymentResponse>('/coach/profile/payment', payload);
      return data.payment;
    } catch (error) {
      throw new Error(extractErrorMessage(error, ''));
    }
  }

  return { getPayment, savePayment };
}

/** The platform admin (dashboard): coach accounts only. */
export function createAdminApi(client: AxiosInstance) {
  async function listCoaches(): Promise<AdminCoach[]> {
    const { data } = await client.get<AdminCoachesResponse>('/admin/coaches');
    return data.coaches;
  }

  async function createCoach(payload: CreateCoachPayload): Promise<CoachPasswordLinkResponse> {
    try {
      const { data } = await client.post<CoachPasswordLinkResponse>('/admin/coaches', payload);
      return data;
    } catch (error) {
      throw new Error(extractErrorMessage(error, ''));
    }
  }

  async function resendPasswordLink(coachId: string): Promise<CoachPasswordLinkResponse> {
    const { data } = await client.post<CoachPasswordLinkResponse>(`/admin/coaches/${coachId}/password-link`);
    return data;
  }

  /** The fallback when email can't reach her: a 60-minute dashboard reset link to copy. */
  async function createResetLink(coachId: string): Promise<CoachPasswordLinkResponse> {
    const { data } = await client.post<CoachPasswordLinkResponse>(`/admin/coaches/${coachId}/reset-link`);
    return data;
  }

  async function setCoachStatus(coachId: string, status: CoachProfileStatus): Promise<AdminCoach> {
    const { data } = await client.patch<{ coach: AdminCoach }>(`/admin/coaches/${coachId}`, { status });
    return data.coach;
  }

  return { listCoaches, createCoach, resendPasswordLink, createResetLink, setCoachStatus };
}

export type JoinApi = ReturnType<typeof createJoinApi>;
export type InvitesApi = ReturnType<typeof createInvitesApi>;
export type AdminApi = ReturnType<typeof createAdminApi>;
