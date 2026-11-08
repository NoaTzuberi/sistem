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

/** A private (RFC 1918) IPv4 address: 10.*, 172.16–31.*, 192.168.* — a computer on the same Wi-Fi. */
function isPrivateLanHost(hostname: string): boolean {
  const parts = hostname.split('.');
  if (parts.length !== 4 || !parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255)) return false;
  const [a, b] = parts.map(Number);
  return a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31);
}

/**
 * Development only: one of the apps opened by its LAN address (Vite's "Network" URL, a phone on the same
 * Wi-Fi), on a dev port — http, or https for `npm run dev:phone`. Never used in production.
 */
export function isPrivateLanDevOrigin(origin: string): boolean {
  try {
    const { protocol, hostname, port } = new URL(origin);
    return (protocol === 'http:' || protocol === 'https:') && DEV_PORTS.includes(Number(port)) && isPrivateLanHost(hostname);
  } catch {
    return false;
  }
}

/**
 * THE CORS check: the exact allow-list; in development also the private LAN dev origins. Production
 * never widens it. Not allowed = no CORS headers (the browser blocks the answer), as with a plain list.
 */
export function isAllowedOrigin(origin: string | undefined, allowed: string[], nodeEnv: string): boolean {
  if (!origin) return false;
  if (allowed.includes(origin)) return true;
  return nodeEnv !== 'production' && isPrivateLanDevOrigin(origin);
}
