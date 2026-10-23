import { describe, expect, it } from 'vitest';
import { DEV_PUBLIC_URLS, parsePublicUrl, publicLink } from '../publicUrls';

const PAGES_APP = 'https://name.github.io/sistem/mobile/#';

describe('parsePublicUrl', () => {
  it('unset: the local app in development and tests, a startup error in production', () => {
    expect(parsePublicUrl('CLIENT_URL', undefined, 'development')).toBe(DEV_PUBLIC_URLS.CLIENT_URL);
    expect(parsePublicUrl('DASHBOARD_URL', '  ', 'test')).toBe(DEV_PUBLIC_URLS.DASHBOARD_URL);
    expect(() => parsePublicUrl('DASHBOARD_URL', undefined, 'production')).toThrow(/DASHBOARD_URL must be set/);
  });

  it('production: only a public https address', () => {
    expect(() => parsePublicUrl('CLIENT_URL', 'http://localhost:5173', 'production')).toThrow(/public https/);
    expect(() => parsePublicUrl('CLIENT_URL', 'https://127.0.0.1', 'production')).toThrow(/public https/);
    expect(() => parsePublicUrl('CLIENT_URL', 'http://app.example.com', 'production')).toThrow(/public https/);
    expect(parsePublicUrl('CLIENT_URL', 'https://app.example.com/', 'production')).toBe('https://app.example.com');
  });

  it('keeps an empty hash route (GitHub Pages) and drops trailing slashes', () => {
    expect(parsePublicUrl('CLIENT_URL', PAGES_APP, 'production')).toBe(PAGES_APP);
    expect(parsePublicUrl('CLIENT_URL', `${PAGES_APP}/`, 'production')).toBe(PAGES_APP);
  });

  it('refuses something that is not a base address', () => {
    expect(() => parsePublicUrl('CLIENT_URL', 'app.example.com', 'development')).toThrow(/not a web address/);
    expect(() => parsePublicUrl('CLIENT_URL', 'ftp://app.example.com', 'development')).toThrow(/http/);
    expect(() => parsePublicUrl('CLIENT_URL', 'https://app.example.com/?x=1', 'development')).toThrow(/query or a route/);
    expect(() => parsePublicUrl('CLIENT_URL', 'https://app.example.com/#/join', 'development')).toThrow(/query or a route/);
  });
});

describe('publicLink', () => {
  it('puts the route after the base, also after a hash', () => {
    expect(publicLink(PAGES_APP, '/join/ABC123')).toBe('https://name.github.io/sistem/mobile/#/join/ABC123');
    expect(publicLink('https://dash.example.com', 'set-password?token=t')).toBe('https://dash.example.com/set-password?token=t');
  });
});
