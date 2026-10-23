// The public addresses of the two front ends, used to build every link the server hands out
// (invite /join links, the admin's set-password link, password-reset emails):
//   CLIENT_URL    — the trainee app
//   DASHBOARD_URL — the coach dashboard
// The value is everything that comes before the route. With hash routing (GitHub Pages) it ends
// with '/#', so links become '<app>/#/join/CODE' — without it Pages answers 404.
// Production refuses to start without them: a localhost fallback would send real people dead links.

export const DEV_PUBLIC_URLS = {
  CLIENT_URL: 'http://localhost:5173',
  DASHBOARD_URL: 'http://localhost:5174',
} as const;

export type PublicUrlName = keyof typeof DEV_PUBLIC_URLS;

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Returns the base without a trailing slash; throws in production when it is missing or unusable. */
export function parsePublicUrl(name: PublicUrlName, value: string | undefined, nodeEnv: string): string {
  const raw = (value ?? '').trim();
  const isProduction = nodeEnv === 'production';

  if (!raw) {
    if (isProduction) throw new Error(`${name} must be set in production (the public address of the app its links open).`);
    return DEV_PUBLIC_URLS[name];
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${name} is not a web address.`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error(`${name} must start with http:// or https://.`);
  // Only an empty hash route ('/#' or '/#/') is allowed: links append the route after it.
  if (url.search || (url.hash && url.hash !== '#/')) throw new Error(`${name} must not contain a query or a route.`);
  if (isProduction && (url.protocol !== 'https:' || LOCAL_HOSTS.has(url.hostname))) {
    throw new Error(`${name} must be a public https address in production.`);
  }

  return raw.replace(/\/+$/, '');
}

/** '<base>' + '/path' — e.g. 'https://x.github.io/sistem/mobile/#' + '/join/ABC'. */
export function publicLink(base: string, path: string): string {
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
