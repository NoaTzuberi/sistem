import axios from 'axios';
import type { AxiosInstance } from 'axios';

export interface ApiClientOptions {
  baseURL: string;
  getToken: () => string | null;
  /**
   * Called when a request that needed a session gets a 401 (expired/invalid token).
   * Each app decides what that means — a browser redirect, a router navigation,
   * or later a Capacitor-safe logout — so the package never touches `window`.
   */
  onUnauthorized: () => void;
  /**
   * The language on screen (Phase 15), sent as Accept-Language so the server's messages
   * come back in it.
   */
  getLanguage?: () => string;
}

// Endpoints where a 401 means "wrong credentials", not "your session expired" —
// they must never trigger onUnauthorized.
const PUBLIC_AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password'];

export function createApiClient({ baseURL, getToken, onUnauthorized, getLanguage }: ApiClientOptions): AxiosInstance {
  // Without a base URL axios sends '/auth/register' to the page's own origin (the Vite dev
  // server), which answers 404 — fail at startup with the real reason instead.
  if (typeof baseURL !== 'string' || !baseURL.trim()) {
    throw new Error('API base URL is missing: set VITE_API_URL in the app\'s .env (see .env.example).');
  }

  const client = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  client.interceptors.request.use((requestConfig) => {
    const token = getToken();
    if (token) {
      requestConfig.headers.Authorization = `Bearer ${token}`;
    }
    const language = getLanguage?.();
    if (language) {
      requestConfig.headers['Accept-Language'] = language;
    }
    return requestConfig;
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        const url = error.config?.url ?? '';
        const isPublicAuthCall = PUBLIC_AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint));
        if (!isPublicAuthCall) {
          onUnauthorized();
        }
      }
      return Promise.reject(error);
    },
  );

  return client;
}

/** The server's message (already in the language on screen), else `fallback` (e.g. no connection). */
/** The field an error is about, when the server names one (e.g. a body measurement's id). */
export function extractErrorField(error: unknown): string | null {
  const field: unknown = axios.isAxiosError(error) ? error.response?.data?.field : undefined;
  return typeof field === 'string' ? field : null;
}

export function extractErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error) && typeof error.response?.data?.message === 'string') {
    return error.response.data.message;
  }
  return fallback;
}
