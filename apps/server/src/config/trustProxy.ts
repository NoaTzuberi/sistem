// TRUST_PROXY = how many proxies sit in front of the server (Express 'trust proxy' as a hop count).
// Unset / empty / invalid = 0: X-Forwarded-For is ignored, req.ip is the socket address — right
// for local dev, but behind a host's proxy every visitor then has the proxy's address. Too high a
// number lets a client fake its address (and dodge the rate limits) with its own X-Forwarded-For,
// so set exactly the host's hop count. Only a whole number is accepted: never `true`.
export function parseTrustProxy(value: string | undefined): number {
  const trimmed = (value ?? '').trim();
  if (!/^\d+$/.test(trimmed)) return 0;
  return Math.min(Number(trimmed), 10);
}
