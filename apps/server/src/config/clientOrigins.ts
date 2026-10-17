// The web origins allowed to call the API (CORS), from CLIENT_ORIGINS — a comma-separated list.
// Auth is a Bearer header (no cookies), so no credentials are involved; the list is still exact:
// '*' is never accepted.

// `npm run dev` / `dev:all`: the mobile app and the coach dashboard. Both host names, because the
// browser sends the one in the address bar: http://127.0.0.1:5173 is a different origin from localhost.
const DEV_PORTS = [5173, 5174];
export const DEV_CLIENT_ORIGINS = DEV_PORTS.flatMap((port) => [
  `http://localhost:${port}`,
  `http://127.0.0.1:${port}`,
]);

/**
 * An origin is scheme + host + port, with no path: 'https://name.github.io/sistem/' is read as
 * 'https://name.github.io'. Entries that are not a web address are dropped.
 */
export function parseClientOrigins(value: string | undefined, nodeEnv: string): string[] {
  const origins = (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .flatMap((entry) => {
      try {
        const { protocol, origin } = new URL(entry);
        return protocol === 'http:' || protocol === 'https:' ? [origin] : [];
      } catch {
        return [];
      }
    });

  if (origins.length > 0) return [...new Set(origins)];
  // Unset: the local apps in development; nothing in production (set CLIENT_ORIGINS there).
  return nodeEnv === 'production' ? [] : DEV_CLIENT_ORIGINS;
}
