// Build-time settings (Vite `VITE_*` variables — see apps/dashboard/.env.example).

function readHttpUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const { protocol } = new URL(trimmed);
    return protocol === 'https:' || protocol === 'http:' ? trimmed : null;
  } catch {
    return null;
  }
}

/** The trainees' app (apps/mobile). null when not set or not a web address — its link is hidden. */
export const TRAINEE_APP_URL = readHttpUrl(import.meta.env.VITE_TRAINEE_APP_URL);

/**
 * True on a static host that cannot answer inner addresses (GitHub Pages): routes then live
 * after a "#", so a refresh never asks the host for a page it does not have.
 */
export const USES_HASH_ROUTER = import.meta.env.VITE_HASH_ROUTER === 'true';

/**
 * The API base URL. Dev server: always the same-origin `/api`, which the Vite proxy forwards to the local
 * server, so the app works from any address (localhost, the LAN IP, a phone on the same Wi-Fi) without
 * CORS. Builds (production, GitHub Pages, Capacitor): VITE_API_URL, unchanged.
 */
export const API_BASE_URL: string = import.meta.env.DEV ? '/api' : import.meta.env.VITE_API_URL;
