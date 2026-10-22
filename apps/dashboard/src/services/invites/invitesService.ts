import { createInvitesApi } from '@sistem/api-client';
import { apiClient } from '../api/apiClient';

export const { getInvites, createPersonalInvite, regenerateInvite, revokeInvite } = createInvitesApi(apiClient);
