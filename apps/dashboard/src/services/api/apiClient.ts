import { createApiClient } from '@sistem/api-client';
import { getActiveLanguage } from '@sistem/shared';
import { getToken, clearToken } from '../auth/tokenStorage';
import { ROUTES } from '../../app/config/routes';
import { API_BASE_URL, USES_HASH_ROUTER } from '../../app/config/env';

export const apiClient = createApiClient({
  baseURL: API_BASE_URL,
  getToken,
  // Server messages come back in the language on screen (Phase 15).
  getLanguage: getActiveLanguage,
  onUnauthorized: () => {
    clearToken();
    if (USES_HASH_ROUTER) {
      // The route lives after the "#": changing it alone would not reload the page.
      if (!window.location.hash.startsWith(`#${ROUTES.LOGIN}`)) {
        window.location.hash = ROUTES.LOGIN;
        window.location.reload();
      }
      return;
    }
    if (!window.location.pathname.startsWith(ROUTES.LOGIN)) {
      window.location.href = ROUTES.LOGIN;
    }
  },
});
