// Test accounts (seed / dev sign-ups): addresses on these domains have no real inbox. The admin may
// change ONLY these emails (to a real +alias, to test the email flow); dev:set-password is limited to them.
export const TEST_EMAIL_DOMAINS = ['sistem.dev', 'dev.sistem', 'example.com'] as const;

export function isTestEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split('@')[1] ?? '';
  return (TEST_EMAIL_DOMAINS as readonly string[]).includes(domain);
}
