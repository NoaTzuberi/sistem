import { createAuthApi } from '@sistem/api-client';
import { apiClient } from '../api/apiClient';

export type { AuthUser, AuthResponse } from '@sistem/types';

export const { register, login, fetchCurrentUser, requestPasswordReset, resetPassword, deleteAccount } =
  createAuthApi(apiClient);
